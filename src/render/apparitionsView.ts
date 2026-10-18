// Scary-mode apparitions in the 3D scene (PRD AC-37 to AC-41): a ghost gliding across a corridor in sight, a spider
// coming down on its thread, the torch dimming like a blown candle, and static cobwebs. Decor only: it reads the
// player's pose from the walker and never touches the game session.
import * as THREE from 'three';

import { ApparitionKind, ApparitionScheduler, GhostPath, Point, pickCobwebs, placeGhost, placeSpider } from '../game/apparitions';
import { Cell, DIRS, Dir, Maze, makeRng } from '../game/maze';
import { cobwebTexture, ghostTexture, spiderTexture } from './apparitionTextures';
import { CELL, WALL_H, WALL_T } from './dimensions';

const GHOST_MS = 2500;
const SPIDER_MS = 3000;
const CANDLE_MS = 1200;
const MAX_WAIT_MS = 8000;
const COBWEB_SIZE = 1.25;

const toWorld = (p: Point) => new THREE.Vector3(p.x * CELL, 0, p.y * CELL);
const ease = (t: number) => t * t * (3 - 2 * t);

type Active =
  | { kind: 'ghost'; t: number; path: GhostPath }
  | { kind: 'spider'; t: number; at: Point }
  | { kind: 'candle'; t: number };

export class ApparitionsView {
  readonly group = new THREE.Group();
  private readonly cobwebs = new THREE.Group();
  private readonly ghost: THREE.Mesh;
  private readonly spider: THREE.Mesh;
  private readonly thread: THREE.Line;
  private readonly textures: THREE.Texture[];
  private readonly disposables: { dispose(): void }[] = [];
  private readonly scheduler: ApparitionScheduler;
  private readonly rng: () => number;
  private active: Active | null = null;
  private pending: { kind: ApparitionKind; waited: number } | null = null;
  private scary = false;

  constructor(private readonly maze: Maze, seed: number) {
    this.scheduler = new ApparitionScheduler(makeRng((seed ^ 0x2545f491) >>> 0));
    this.rng = makeRng((seed ^ 0x68e31da4) >>> 0);
    const ghostTex = ghostTexture();
    const spiderTex = spiderTexture();
    const webTex = cobwebTexture({ seed });
    this.textures = [ghostTex, spiderTex, webTex];

    const ghostGeo = new THREE.PlaneGeometry(1.5, 2.75);
    // Not fogged and additive: in the black scary fog a pale shape would otherwise fade to the background colour.
    const ghostMat = new THREE.MeshBasicMaterial({
      map: ghostTex,
      color: 0xcfe0ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    this.ghost = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghost.visible = false;
    this.ghost.renderOrder = 2;

    const spiderGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const spiderMat = new THREE.MeshBasicMaterial({ map: spiderTex, transparent: true, alphaTest: 0.3, depthWrite: false, fog: false });
    this.spider = new THREE.Mesh(spiderGeo, spiderMat);
    this.spider.visible = false;
    const threadGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)]);
    const threadMat = new THREE.LineBasicMaterial({ color: 0xd8dce4, transparent: true, opacity: 0.8, fog: false });
    this.thread = new THREE.Line(threadGeo, threadMat);
    this.thread.visible = false;

    // Cobwebs: a vertical quad across the upper corner, facing the centre of the cell.
    const webGeo = new THREE.PlaneGeometry(COBWEB_SIZE * Math.SQRT2, COBWEB_SIZE);
    const webMat = new THREE.MeshBasicMaterial({ map: webTex, color: 0xf0f2f8, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const inner = CELL / 2 - WALL_T / 2 - 0.02;
    for (const web of pickCobwebs(maze, seed)) {
      const [a, b] = web.walls;
      const corner = new THREE.Vector3(
        web.x * CELL + CELL / 2 + (DIRS[a].dx + DIRS[b].dx) * inner,
        WALL_H - COBWEB_SIZE / 2,
        web.y * CELL + CELL / 2 + (DIRS[a].dy + DIRS[b].dy) * inner,
      );
      const towardCentre = new THREE.Vector3(-(DIRS[a].dx + DIRS[b].dx), 0, -(DIRS[a].dy + DIRS[b].dy)).normalize();
      const mesh = new THREE.Mesh(webGeo, webMat);
      mesh.position.copy(corner).addScaledVector(towardCentre, (COBWEB_SIZE / 2) * Math.SQRT1_2);
      mesh.lookAt(mesh.position.clone().add(towardCentre));
      this.cobwebs.add(mesh);
    }
    this.disposables.push(ghostGeo, ghostMat, spiderGeo, spiderMat, threadGeo, threadMat, webGeo, webMat);
    this.group.add(this.cobwebs, this.ghost, this.spider, this.thread);
    this.setScary(false);
  }

  setScary(scary: boolean): void {
    this.scary = scary;
    this.cobwebs.visible = scary;
    if (!scary) this.stop();
  }

  private stop() {
    this.active = null;
    this.pending = null;
    this.ghost.visible = false;
    this.spider.visible = false;
    this.thread.visible = false;
  }

  // Ghosts and spiders need a corridor in view: they wait for one (the player turning or walking on) for up to
  // MAX_WAIT_MS, then the candle dims instead.
  private tryStart(pose: { cell: Cell; dir: Dir }): void {
    const p = this.pending;
    if (!p) return;
    if (p.kind === 'ghost') {
      const path = placeGhost(this.maze, pose.cell, pose.dir, this.rng);
      if (path) this.active = { kind: 'ghost', t: 0, path };
    } else if (p.kind === 'spider') {
      const at = placeSpider(this.maze, pose.cell, pose.dir, this.rng);
      if (at) this.active = { kind: 'spider', t: 0, at };
    }
    if (!this.active && (p.kind === 'candle' || p.waited >= MAX_WAIT_MS)) this.active = { kind: 'candle', t: 0 };
    if (this.active) {
      this.pending = null;
      // Device proof of AC-41: which apparitions the player got (read in logcat).
      console.log(`APPARITION ${this.active.kind} cell=${pose.cell.x},${pose.cell.y} dir=${pose.dir}`);
    }
  }

  // Advances the apparitions; returns the torch factor (1 = normal, lower while a candle dims).
  update(dtMs: number, frozen: boolean, pose: { cell: Cell; dir: Dir }, camera: THREE.Camera): number {
    if (!this.scary) return 1;
    if (!this.active && !this.pending) {
      const kind = this.scheduler.update(dtMs, { scary: this.scary, frozen });
      if (kind) this.pending = { kind, waited: 0 };
    }
    if (this.pending && !frozen) {
      this.pending.waited += dtMs;
      this.tryStart(pose);
    }
    const a = this.active;
    if (!a) return 1;
    if (!frozen) a.t += dtMs;
    let torch = 1;
    if (a.kind === 'ghost') {
      const k = Math.min(1, a.t / GHOST_MS);
      const p = toWorld(a.path.from).lerp(toWorld(a.path.to), ease(k));
      this.ghost.position.set(p.x, 1.55, p.z);
      this.ghost.rotation.set(0, Math.atan2(camera.position.x - p.x, camera.position.z - p.z), 0);
      (this.ghost.material as THREE.MeshBasicMaterial).opacity = 0.75 * Math.pow(Math.sin(Math.PI * k), 0.7);
      this.ghost.visible = true;
      if (k >= 1) this.stop();
    } else if (a.kind === 'spider') {
      const k = Math.min(1, a.t / SPIDER_MS);
      // Down in the first third, hanging (slight swing) in the second, back up in the last.
      const down = k < 1 / 3 ? ease(k * 3) : k < 2 / 3 ? 1 : 1 - ease((k - 2 / 3) * 3);
      const top = WALL_H - 0.05;
      const y = top - down * (top - 2.25);
      const w = toWorld(a.at);
      const swing = Math.sin(a.t / 260) * 0.06 * down;
      this.spider.position.set(w.x + swing, y, w.z);
      this.spider.rotation.set(0, Math.atan2(camera.position.x - w.x, camera.position.z - w.z), 0);
      this.thread.position.set(w.x + swing, top, w.z);
      this.thread.scale.set(1, Math.max(0.001, top - y - 0.15), 1);
      this.spider.visible = this.thread.visible = true;
      if (k >= 1) this.stop();
    } else {
      const k = Math.min(1, a.t / CANDLE_MS);
      const dip = Math.sin(Math.PI * k);
      torch = 1 - 0.65 * dip * (0.85 + 0.15 * Math.sin(a.t / 23));
      if (k >= 1) this.stop();
    }
    return torch;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
