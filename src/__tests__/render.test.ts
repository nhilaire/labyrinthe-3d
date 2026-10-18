// Rendering parts that run without WebGL: frame statistics, merged geometry, procedural textures, emblems.
import { newMaze } from '../game/config';
import { EMBLEM_COUNT } from '../game/landmarks';
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
