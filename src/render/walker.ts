// Smooth camera motion (source: shared/three/walker.js): turn in place, then glide along the route with rounded
// corners. A planner computes, sample by sample, the highest speed allowed by a lateral acceleration limit in
// curves, then smooths it with two passes (acceleration forwards, braking backwards): the camera slows down before
// a corner, takes it slowly and speeds up again on straight lines. Pure three math, no rendering: unit-tested.
import * as THREE from 'three';

import type { Cell, Dir } from '../game/maze';
import { CELL, EYE_H, worldOf, yawForDir } from './dimensions';

export const MOTION = {
  cruise: 7, // straight-line speed (units/s), ~1.75 cell/s
  accel: 14, // acceleration (units/s2)
  brake: 16, // braking (units/s2)
  lateral: 8, // lateral acceleration allowed in curves (units/s2)
  turn: Math.PI * 1.6, // turn-in-place speed (rad/s), ~0.3 s for 90 degrees
} as const;

const CORNER_RADIUS = CELL * 0.48; // radius of the rounded corners (max CELL/2)
const SAMPLE_STEP = 0.05; // path sampling step (world units)

function yawForVector(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

// Brings `target` into the same turn as `current`.
function unwrap(target: number, current: number): number {
  let t = target;
  while (t - current > Math.PI) t -= Math.PI * 2;
  while (current - t > Math.PI) t += Math.PI * 2;
  return t;
}

// Polyline through the cell centres, corners rounded with quadratic Bezier curves.
function buildCurve(cells: Cell[]): THREE.CurvePath<THREE.Vector3> | null {
  const pts = cells.map((c) => worldOf(c, 0));
  if (pts.length < 2) return null;
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cursor = pts[0];
  const dirIn = new THREE.Vector3();
  const dirOut = new THREE.Vector3();
  for (let i = 1; i < pts.length - 1; i++) {
    dirIn.subVectors(pts[i], pts[i - 1]).normalize();
    dirOut.subVectors(pts[i + 1], pts[i]).normalize();
    if (dirIn.dot(dirOut) > 0.999) continue; // straight on: nothing to round
    const a = pts[i].clone().addScaledVector(dirIn, -CORNER_RADIUS);
    const b = pts[i].clone().addScaledVector(dirOut, CORNER_RADIUS);
    if (cursor.distanceTo(a) > 1e-4) path.add(new THREE.LineCurve3(cursor.clone(), a.clone()));
    path.add(new THREE.QuadraticBezierCurve3(a.clone(), pts[i].clone(), b.clone()));
    cursor = b;
  }
  const last = pts[pts.length - 1];
  if (cursor.distanceTo(last) > 1e-4) path.add(new THREE.LineCurve3(cursor.clone(), last.clone()));
  return path.curves.length ? path : null;
}

// Corridors without junctions can be very long: long routes go a bit faster so the player does not wait a minute,
// while short moves stay calm. Time is rescaled uniformly (speeds x b, accelerations x b^2).
function lengthBoost(length: number): number {
  const t = Math.min(1, Math.max(0, (length - 24) / 100));
  return 1 + t * 0.9;
}

type Plan = {
  pos: THREE.Vector3[];
  dist: Float64Array;
  vel: Float64Array;
  time: Float64Array;
  steps: number;
  length: number;
  cruise: number;
  duration: number;
};

function planMotion(curve: THREE.CurvePath<THREE.Vector3>): Plan {
  const length = curve.getLength();
  const boost = lengthBoost(length);
  const cruise = MOTION.cruise * boost;
  const accel = MOTION.accel * boost * boost;
  const brake = MOTION.brake * boost * boost;
  const lateral = MOTION.lateral * boost * boost;
  const steps = Math.max(2, Math.ceil(length / SAMPLE_STEP));

  const pos: THREE.Vector3[] = new Array(steps + 1);
  for (let i = 0; i <= steps; i++) pos[i] = curve.getPoint(i / steps);

  // Real arc length (chords), more reliable than the parametrisation.
  const dist = new Float64Array(steps + 1);
  for (let i = 1; i <= steps; i++) dist[i] = dist[i - 1] + pos[i].distanceTo(pos[i - 1]);

  // Allowed speed, bounded by the local curvature.
  const vel = new Float64Array(steps + 1);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    let limit = cruise;
    if (i > 0 && i < steps) {
      a.subVectors(pos[i], pos[i - 1]);
      b.subVectors(pos[i + 1], pos[i]);
      const ds = (a.length() + b.length()) / 2;
      if (ds > 1e-6) {
        const curvature = a.angleTo(b) / ds;
        if (curvature > 1e-4) limit = Math.min(limit, Math.sqrt(lateral / curvature));
      }
    }
    vel[i] = limit;
  }
  // Stop at both ends: the player leaves from a decision point.
  vel[0] = 0;
  vel[steps] = 0;
  for (let i = 1; i <= steps; i++) {
    const ds = dist[i] - dist[i - 1];
    vel[i] = Math.min(vel[i], Math.sqrt(vel[i - 1] * vel[i - 1] + 2 * accel * ds));
  }
  for (let i = steps - 1; i >= 0; i--) {
    const ds = dist[i + 1] - dist[i];
    vel[i] = Math.min(vel[i], Math.sqrt(vel[i + 1] * vel[i + 1] + 2 * brake * ds));
  }
  const time = new Float64Array(steps + 1);
  for (let i = 1; i <= steps; i++) {
    const ds = dist[i] - dist[i - 1];
    const vAvg = Math.max((vel[i - 1] + vel[i]) / 2, 1e-3);
    time[i] = time[i - 1] + ds / vAvg;
  }
  return { pos, dist, vel, time, steps, length, cruise, duration: time[steps] };
}

type ActiveRoute = Plan & { t: number; cursor: number; targetYaw: number };

export class Walker {
  readonly camera: THREE.Camera;
  yaw = 0;
  state: 'idle' | 'turning' | 'moving' = 'idle';
  route: ActiveRoute | null = null;
  bobPhase = 0;
  bobAmount = 0;
  yawRate = 0;
  roll = 0;
  speed = 0;
  // Distance walked since the last footstep, read by the sound layer.
  stride = 0;
  private readonly pos = new THREE.Vector3();
  private readonly tan = new THREE.Vector3();

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  get isBusy(): boolean {
    return this.state !== 'idle';
  }

  get position(): THREE.Vector3 {
    return this.pos;
  }

  // Plan cell actually occupied (useful during a move).
  cellAt(): Cell {
    return { x: Math.floor(this.pos.x / CELL), y: Math.floor(this.pos.z / CELL) };
  }

  // Nearest heading of the current orientation (0 = N, 1 = E, 2 = S, 3 = W).
  facingDir(): Dir {
    return (((Math.round(-this.yaw / (Math.PI / 2)) % 4) + 4) % 4) as Dir;
  }

  // Places the camera on a cell instantly, facing `dir`.
  setPose(cell: Cell, dir: Dir): void {
    this.yaw = yawForDir(dir);
    this.pos.copy(worldOf(cell, EYE_H));
    this.state = 'idle';
    this.route = null;
    this.speed = 0;
    this.applyToCamera();
  }

  // Starts a route; `startDir` is the first direction to take (turn in place if it differs from the current one).
  startRoute(cells: Cell[], startDir: Dir): boolean {
    const curve = buildCurve(cells);
    if (!curve) {
      this.state = 'idle';
      return false;
    }
    const plan = planMotion(curve);
    this.route = { ...plan, t: 0, cursor: 0, targetYaw: unwrap(yawForDir(startDir), this.yaw) };
    this.state = Math.abs(this.route.targetYaw - this.yaw) > 1e-3 ? 'turning' : 'moving';
    return true;
  }

  // Advances the simulation. Returns true when the route has just finished.
  update(dt: number): boolean {
    let finished = false;
    if (this.state === 'turning') finished = this.updateTurn(dt);
    else if (this.state === 'moving') finished = this.updateMove(dt);
    this.settle(dt);
    this.applyToCamera();
    return finished;
  }

  private updateTurn(dt: number): boolean {
    const target = this.route!.targetYaw;
    const delta = target - this.yaw;
    const stepMax = MOTION.turn * dt;
    const ease = Math.max(0.22, Math.min(1, Math.abs(delta) / 0.45));
    const step = Math.sign(delta) * Math.min(Math.abs(delta), stepMax * ease);
    this.yaw += step;
    this.yawRate = step / Math.max(dt, 1e-4);
    if (Math.abs(target - this.yaw) < 2e-3) {
      this.yaw = target;
      this.state = 'moving';
    }
    return false;
  }

  private updateMove(dt: number): boolean {
    const r = this.route!;
    r.t += dt;
    while (r.cursor < r.steps && r.time[r.cursor + 1] <= r.t) r.cursor++;

    let px: number;
    let pz: number;
    if (r.cursor >= r.steps) {
      px = r.pos[r.steps].x;
      pz = r.pos[r.steps].z;
      this.tan.subVectors(r.pos[r.steps], r.pos[r.steps - 1]);
      this.speed = 0;
    } else {
      const t0 = r.time[r.cursor];
      const t1 = r.time[r.cursor + 1];
      const alpha = t1 > t0 ? (r.t - t0) / (t1 - t0) : 0;
      const p0 = r.pos[r.cursor];
      const p1 = r.pos[r.cursor + 1];
      px = p0.x + (p1.x - p0.x) * alpha;
      pz = p0.z + (p1.z - p0.z) * alpha;
      this.tan.subVectors(p1, p0);
      this.speed = r.vel[r.cursor] + (r.vel[r.cursor + 1] - r.vel[r.cursor]) * alpha;
    }
    this.stride += Math.hypot(px - this.pos.x, pz - this.pos.z);
    this.pos.set(px, EYE_H, pz);

    if (this.tan.lengthSq() > 1e-10) {
      const target = unwrap(yawForVector(this.tan.x, this.tan.z), this.yaw);
      const prev = this.yaw;
      this.yaw += (target - this.yaw) * Math.min(1, dt * 14);
      this.yawRate = (this.yaw - prev) / Math.max(dt, 1e-4);
    }

    // Head bob follows the real speed: it calms down in curves.
    const cadence = r.cruise > 0 ? this.speed / r.cruise : 0;
    this.bobPhase += dt * 7 * cadence;
    this.bobAmount += (0.05 * cadence - this.bobAmount) * Math.min(1, dt * 5);

    if (r.t >= r.duration) {
      this.pos.set(r.pos[r.steps].x, EYE_H, r.pos[r.steps].z);
      // Exact final heading: the game goes on from this pose.
      this.tan.subVectors(r.pos[r.steps], r.pos[r.steps - 1]);
      this.yaw = unwrap(yawForVector(this.tan.x, this.tan.z), this.yaw);
      this.state = 'idle';
      this.route = null;
      this.speed = 0;
      return true;
    }
    return false;
  }

  // Roll and head bob go back to rest progressively.
  private settle(dt: number): void {
    const targetRoll = THREE.MathUtils.clamp(-this.yawRate * 0.03, -0.045, 0.045);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 5);
    if (this.state !== 'moving') {
      this.bobAmount += (0.012 - this.bobAmount) * Math.min(1, dt * 3);
      this.bobPhase += dt * 1.2; // slow breathing when standing
    }
    if (this.state === 'idle') this.yawRate *= Math.max(0, 1 - dt * 8);
  }

  private applyToCamera(): void {
    const bob = Math.sin(this.bobPhase) * this.bobAmount;
    this.camera.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(0, this.yaw, this.roll);
  }
}
