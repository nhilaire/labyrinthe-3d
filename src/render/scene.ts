// The 3D maze on an expo-gl context: scene, camera, lights, maze meshes, emblem plaques, footprints, walker and the
// render loop step. No React here: the game screen drives it frame by frame and never re-renders per frame.
// Lambert materials (not PBR): the maze is matte stone and wood, and per-pixel PBR lighting with several point lights
// at full screen resolution was the main GPU cost on phones.
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

import type { Landmark } from '../game/landmarks';
import { Cell, DIRS, Dir, Maze } from '../game/maze';
import { outsideOf } from '../game/navigation';
import { CELL, EYE_H, WALL_H, WALL_T, worldOf } from './dimensions';
import { FrameStats } from './frameStats';
import { Footprints, createFootprints } from './footprints';
import { createRenderer } from './glRenderer';
import { buildPillarGeometry, buildWallGeometry } from './mazeGeometry';
import { ceilingTexture, footprintTexture, pillarTexture, planksTexture, plateTexture, stoneTexture } from './textures';
import { Walker } from './walker';

const TARGET_HFOV = 100; // horizontal field of view, degrees
const STEP_LENGTH = 1.6; // world units between two footstep sounds
const PLATE_W = 1.5;
const PLATE_H = 1.8;
const PLATE_Y = 2.55; // a bit above eye height

// Manor mood by default; « Mode frisson » darkens and cools it (PRD: fog x1.8, torch x0.65, stronger flicker).
export type Mood = { fog: number; torch: number; flicker: number; wallTint: number; ambient: number };
export const MOODS: Record<'manor' | 'scary', Mood> = {
  manor: { fog: 0.042, torch: 4.2, flicker: 1, wallTint: 0xffffff, ambient: 1.1 },
  scary: { fog: 0.042 * 1.8, torch: 4.2 * 0.65, flicker: 2.6, wallTint: 0xa9bccb, ambient: 0.55 },
};

export type SceneEvents = {
  onStep?: (cadence: number) => void;
  onEmblem?: (emblem: number) => void;
  onTurn?: (quarters: number) => void;
};

type Mounted = {
  group: THREE.Group;
  footprints: Footprints;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  textures: THREE.Texture[];
  lights: THREE.Light[];
  landmarkAt: Map<string, number>;
  lastCell: string;
};

export class MazeScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly walker: Walker;
  readonly stats = new FrameStats();
  events: SceneEvents = {};
  private readonly gl: ExpoWebGLRenderingContext;
  private readonly torch: THREE.PointLight;
  private readonly ambient: THREE.AmbientLight;
  private readonly fog: THREE.FogExp2;
  private readonly plates = new Map<number, THREE.Texture>();
  private footTexture = footprintTexture();
  private mood: Mood = MOODS.manor;
  private mounted: Mounted | null = null;
  private wallMaterials: THREE.MeshLambertMaterial[] = [];

  constructor(gl: ExpoWebGLRenderingContext) {
    this.gl = gl;
    this.renderer = createRenderer(gl);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    this.scene.background = new THREE.Color(0x05040a);
    this.fog = new THREE.FogExp2(0x05040a, this.mood.fog);
    this.scene.fog = this.fog;
    // three's FOV is vertical: derive it from a horizontal target, or a wide screen gives tunnel vision.
    const aspect = width / height;
    const half = Math.tan(THREE.MathUtils.degToRad(TARGET_HFOV) / 2);
    const fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(half / aspect)), 52, 90);
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 400);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, EYE_H, 0);
    this.ambient = new THREE.AmbientLight(0x6a5a58, this.mood.ambient);
    this.scene.add(this.ambient);
    this.scene.add(new THREE.HemisphereLight(0x9a8a90, 0x3a2a20, 0.7));
    this.torch = new THREE.PointLight(0xffd9a8, this.mood.torch, CELL * 7, 1.7);
    this.torch.position.set(0, 0.35, 0.2);
    this.camera.add(this.torch);
    this.scene.add(this.camera);
    this.walker = new Walker(this.camera);
  }

  setMood(scary: boolean): void {
    this.mood = scary ? MOODS.scary : MOODS.manor;
    this.fog.density = this.mood.fog;
    this.ambient.intensity = this.mood.ambient;
    for (const m of this.wallMaterials) m.color.setHex(this.mood.wallTint);
  }

  private plateFor(emblem: number): THREE.Texture {
    let tex = this.plates.get(emblem);
    if (!tex) {
      tex = plateTexture(emblem);
      this.plates.set(emblem, tex);
    }
    return tex;
  }

  // Builds the meshes of a maze and places the camera. Textures are seeded by the maze seed.
  mount(maze: Maze, landmarks: Landmark[], seed: number, pose: { cell: Cell; dir: Dir }): void {
    this.unmount();
    const group = new THREE.Group();
    const spanX = maze.width * CELL;
    const spanZ = maze.height * CELL;
    const pad = CELL;
    const wallTex = stoneTexture({ seed: seed + 1 });
    const floorTex = planksTexture({ seed: seed + 2 });
    const ceilTex = ceilingTexture({ seed: seed + 3 });
    const pillarTex = pillarTexture({ seed: seed + 4 });
    floorTex.repeat.set((spanX + pad * 2) / 4, (spanZ + pad * 2) / 4);
    ceilTex.repeat.set(spanX / 4, spanZ / 4);
    const wall = new THREE.MeshLambertMaterial({ map: wallTex, color: this.mood.wallTint });
    const pillar = new THREE.MeshLambertMaterial({ map: pillarTex, color: this.mood.wallTint });
    const floor = new THREE.MeshLambertMaterial({ map: floorTex });
    const ceiling = new THREE.MeshLambertMaterial({ map: ceilTex });
    this.wallMaterials = [wall, pillar];

    const floorGeo = new THREE.PlaneGeometry(spanX + pad * 2, spanZ + pad * 2);
    const floorMesh = new THREE.Mesh(floorGeo, floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(spanX / 2, 0, spanZ / 2);
    const ceilMesh = new THREE.Mesh(floorGeo, ceiling);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(spanX / 2, WALL_H, spanZ / 2);
    const wallGeo = buildWallGeometry(maze);
    const pillarGeo = buildPillarGeometry(maze);
    group.add(floorMesh, ceilMesh, new THREE.Mesh(wallGeo, wall), new THREE.Mesh(pillarGeo, pillar));

    // Emblem plaques: centre of the cell, moved to the wall, slightly in front of it, facing the cell.
    const plateGeo = new THREE.PlaneGeometry(PLATE_W, PLATE_H);
    const plateMaterials = new Map<number, THREE.MeshLambertMaterial>();
    for (const mark of landmarks) {
      let mat = plateMaterials.get(mark.emblem);
      if (!mat) {
        const map = this.plateFor(mark.emblem);
        mat = new THREE.MeshLambertMaterial({
          map,
          emissiveMap: map,
          emissive: 0xffffff,
          emissiveIntensity: 0.55,
          transparent: true,
          alphaTest: 0.35,
        });
        plateMaterials.set(mark.emblem, mat);
      }
      const mesh = new THREE.Mesh(plateGeo, mat);
      const d = DIRS[mark.dir];
      mesh.position.set(
        mark.x * CELL + CELL / 2 + d.dx * (CELL / 2 - WALL_T / 2 - 0.03),
        PLATE_Y,
        mark.y * CELL + CELL / 2 + d.dy * (CELL / 2 - WALL_T / 2 - 0.03),
      );
      mesh.rotation.y = -mark.dir * (Math.PI / 2);
      group.add(mesh);
    }

    // Warm glow at the exit, cold at the entrance.
    const lights: THREE.Light[] = [];
    for (const spot of [
      { cell: outsideOf(maze.exit), color: 0xffe6b0, intensity: 6.5 },
      { cell: outsideOf(maze.entrance), color: 0x9fc4ff, intensity: 3.5 },
    ]) {
      const light = new THREE.PointLight(spot.color, spot.intensity, CELL * 6, 1.6);
      light.position.copy(worldOf(spot.cell, WALL_H * 0.55));
      group.add(light);
      lights.push(light);
    }

    const footprints = createFootprints({ texture: this.footTexture });
    group.add(footprints.mesh);
    this.scene.add(group);
    this.mounted = {
      group,
      footprints,
      materials: [wall, pillar, floor, ceiling, ...plateMaterials.values()],
      geometries: [floorGeo, wallGeo, pillarGeo, plateGeo],
      textures: [wallTex, floorTex, ceilTex, pillarTex],
      lights,
      landmarkAt: new Map(landmarks.map((m) => [`${m.x},${m.y}`, m.emblem])),
      lastCell: '',
    };
    this.walker.setPose(pose.cell, pose.dir);
    this.stats.reset();
  }

  unmount(): void {
    const m = this.mounted;
    if (!m) return;
    this.scene.remove(m.group);
    m.footprints.dispose();
    m.materials.forEach((x) => x.dispose());
    m.geometries.forEach((x) => x.dispose());
    m.textures.forEach((x) => x.dispose());
    this.mounted = null;
    this.wallMaterials = [];
  }

  startRoute(cells: Cell[], dir: Dir): void {
    const before = this.walker.yaw;
    if (!this.walker.startRoute(cells, dir)) return;
    const quarters = Math.round(Math.abs((this.walker.route?.targetYaw ?? before) - before) / (Math.PI / 2));
    if (quarters > 0) this.events.onTurn?.(quarters);
  }

  setTracesVisible(visible: boolean): void {
    this.mounted?.footprints.setVisible(visible);
  }

  // Player cell and heading as seen on the plan (follows the camera during a move).
  pose(): { cell: Cell; dir: Dir } {
    return { cell: this.walker.cellAt(), dir: this.walker.facingDir() };
  }

  // One frame. When `frozen`, the camera does not move but the scene keeps rendering. Returns true when the
  // current route has just finished.
  frame(dtMs: number, nowMs: number, frozen: boolean): boolean {
    let arrived = false;
    const m = this.mounted;
    if (m && !frozen) {
      const walking = this.walker.isBusy;
      arrived = this.walker.update(Math.min(0.05, dtMs / 1000));
      if (walking) this.stats.record(dtMs);
      if (this.walker.speed > 0.2) {
        const p = this.walker.position;
        const heading = Math.atan2(-Math.cos(this.walker.yaw), -Math.sin(this.walker.yaw));
        m.footprints.follow(p.x, p.z, heading);
      }
      if (this.walker.stride >= STEP_LENGTH) {
        this.walker.stride = 0;
        this.events.onStep?.(Math.min(1, this.walker.speed / 7));
      }
      const c = this.walker.cellAt();
      const key = `${c.x},${c.y}`;
      if (key !== m.lastCell) {
        m.lastCell = key;
        const emblem = m.landmarkAt.get(key);
        if (emblem !== undefined && walking) this.events.onEmblem?.(emblem);
      }
    }
    const t = nowMs / 1000;
    const f = this.mood.flicker;
    this.torch.intensity = this.mood.torch * (1 + (Math.sin(t * 7.3) * 0.044 + Math.sin(t * 17.1) * 0.022) * f);
    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
    return arrived;
  }

  dispose(): void {
    this.unmount();
    this.plates.forEach((t) => t.dispose());
    this.plates.clear();
    this.footTexture.dispose();
    this.renderer.dispose();
  }
}
