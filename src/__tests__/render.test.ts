// Rendering parts that run without WebGL: frame statistics, merged geometry, procedural textures, emblems.
import * as THREE from 'three';

import { cellsInSight } from '../game/apparitions';
import { newMaze } from '../game/config';
import { EMBLEM_COUNT } from '../game/landmarks';
import { ApparitionsView } from '../render/apparitionsView';
import { emblemColor, emblemInk, emblemShapes } from '../render/emblems';
import { FrameStats, MIN_FRAMES_FOR_SAMPLE } from '../render/frameStats';
import { buildPillarGeometry, buildWallGeometry, horizontalWall, verticalWall } from '../render/mazeGeometry';
import { MOODS } from '../render/scene';
import { footprintTexture, plateTexture, stoneTexture } from '../render/textures';

describe('frame statistics', () => {
  it('computes the average fps and the share of slow frames', () => {
    const s = new FrameStats();
    for (let i = 0; i < 95; i++) s.record(1000 / 60);
    for (let i = 0; i < 5; i++) s.record(40);
    expect(s.frames).toBe(100);
    expect(s.slowPct).toBe(5);
    expect(s.fpsAvg).toBeGreaterThan(50);
    expect(s.enough).toBe(false);
    for (let i = 0; i < MIN_FRAMES_FOR_SAMPLE; i++) s.record(16);
    expect(s.enough).toBe(true);
  });

  it('ignores the first frame and frames after a background pause', () => {
    const s = new FrameStats();
    s.record(0);
    s.record(5000);
    expect(s.frames).toBe(0);
  });
});

describe('maze geometry', () => {
  it('merges one box per wall segment into a single geometry', () => {
    const { maze } = newMaze('small', 1);
    let walls = 0;
    for (let y = 0; y <= maze.height; y++) for (let x = 0; x < maze.width; x++) if (horizontalWall(maze, x, y)) walls++;
    for (let x = 0; x <= maze.width; x++) for (let y = 0; y < maze.height; y++) if (verticalWall(maze, x, y)) walls++;
    const geo = buildWallGeometry(maze);
    expect(geo.attributes.position.count).toBe(walls * 24);
    expect(buildPillarGeometry(maze).attributes.position.count % 24).toBe(0);
  });
});

describe('procedural textures', () => {
  it('paints opaque stone and transparent plaques and footprints', () => {
    const stone = stoneTexture({ size: 64 });
    expect(stone.image.width).toBe(64);
    const plate = plateTexture(3, { width: 32 });
    expect(plate.image.width).toBe(32);
    const data = plate.image.data as Uint8Array;
    expect(data[3]).toBe(0); // transparent corner
    expect(footprintTexture({ size: 16 }).image.width).toBe(16);
  });
});

describe('emblems and moods', () => {
  it('has a shape, a colour and an ink for each of the 10 emblems', () => {
    for (let i = 0; i < EMBLEM_COUNT; i++) {
      expect(emblemShapes(i).length).toBeGreaterThan(0);
      expect(emblemColor(i)).toMatch(/^#[0-9a-f]{6}$/);
      expect(emblemInk(i)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('makes the scary mood darker: fog x1.8, torch x0.65', () => {
    expect(MOODS.scary.fog).toBeCloseTo(MOODS.manor.fog * 1.8);
    expect(MOODS.scary.torch).toBeCloseTo(MOODS.manor.torch * 0.65);
    expect(MOODS.scary.flicker).toBeGreaterThan(MOODS.manor.flicker);
  });
});

describe('scary-mode apparitions view (AC-41 wiring)', () => {
  it('hides cobwebs and does nothing in the manor mood, dims the torch and shows decor in scary mode', () => {
    const { maze, seed } = newMaze('large', 12);
    const view = new ApparitionsView(maze, seed);
    const camera = new THREE.PerspectiveCamera();
    const pose = { cell: { x: maze.entrance.x, y: maze.entrance.y }, dir: 0 as const };
    const cobwebs = view.group.children[0];
    expect(cobwebs.visible).toBe(false);
    expect(cobwebs.children.length).toBeGreaterThan(0);
    for (let i = 0; i < 3000; i++) expect(view.update(16, false, pose, camera)).toBe(1);
    view.setScary(true);
    expect(cobwebs.visible).toBe(true);
    // Facing down a long corridor: over 3 minutes all three apparitions show up.
    let corridor = pose;
    for (let y = 0; y < maze.height; y++)
      for (let x = 0; x < maze.width; x++)
        for (let d = 0; d < 4; d++) if (cellsInSight(maze, { x, y }, d as 0).length >= 3) corridor = { cell: { x, y }, dir: d as 0 };
    let minTorch = 1;
    const [, ghost, spider] = view.group.children;
    let ghostFrames = 0;
    let spiderFrames = 0;
    for (let i = 0; i < 60 * 180; i++) {
      minTorch = Math.min(minTorch, view.update(16, false, corridor, camera));
      if (ghost.visible) ghostFrames++;
      if (spider.visible) spiderFrames++;
    }
    expect(ghostFrames).toBeGreaterThan(0);
    expect(spiderFrames).toBeGreaterThan(0);
    expect(minTorch).toBeLessThan(0.6);
    view.setScary(false);
    expect(view.group.children.slice(1).every((c) => !c.visible)).toBe(true);
    view.dispose();
  });
});

describe('texture orientation', () => {
  it('uploads painted buffers bottom row first (three DataTexture convention)', () => {
    // The plaque frame is painted at the top of the buffer: after upload it must be in the last rows.
    const plate = plateTexture(2, { width: 32 });
    const img = plate.image as { width: number; height: number; data: Uint8Array };
    const alphaRow = (y: number) => {
      let a = 0;
      for (let x = 0; x < img.width; x++) a += img.data[(y * img.width + x) * 4 + 3];
      return a;
    };
    // The plaque's pointed bottom (narrow) is now in the first rows, its wide body and top frame in the last ones.
    expect(alphaRow(2)).toBeLessThan(alphaRow(img.height - 4));
  });
});
