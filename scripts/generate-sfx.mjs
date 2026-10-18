#!/usr/bin/env node
// Renders the game sounds offline into small WAV files (assets/sfx/), no dependency. It reproduces the WebAudio
// design of the original web version (drone, footsteps, turn whoosh, click, emblem chimes, exit chord) with the
// same oscillators, filters and envelopes, plus the scary-mode drone and creak. Deterministic: same files every run.
//
//   node scripts/generate-sfx.mjs
import fs from 'node:fs';
import path from 'node:path';

const RATE = 22050;
const OUT = path.join(import.meta.dirname, '..', 'assets', 'sfx');

// Deterministic noise (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buffer = (seconds) => new Float64Array(Math.round(seconds * RATE));

// RBJ biquad filter, frequency may vary per sample.
function biquad(type, input, freqAt, q) {
  const out = new Float64Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const f = typeof freqAt === 'function' ? freqAt(i / RATE) : freqAt;
    const w = (2 * Math.PI * f) / RATE;
    const alpha = Math.sin(w) / (2 * q);
    const cos = Math.cos(w);
    let b0, b1, b2;
    if (type === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
    const x = input[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

const osc = (type, phase) => {
  const p = phase - Math.floor(phase);
  if (type === 'sine') return Math.sin(2 * Math.PI * p);
  if (type === 'triangle') return 1 - 4 * Math.abs(p - 0.5);
  return 2 * p - 1; // saw
};

// Percussive envelope: linear attack to `peak`, exponential decay to silence (WebAudio-like).
function envelope(t, peak, attack, decay) {
  if (t < 0) return 0;
  if (t < attack) return (peak * t) / attack;
  const d = t - attack;
  if (d > decay) return 0;
  return peak * Math.pow(0.0001 / peak, d / decay);
}

function tone(out, { type = 'sine', freq, at = 0, peak, attack, decay, sweepTo, sweepTime }) {
  let phase = 0;
  const start = Math.round(at * RATE);
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / RATE;
    const f = sweepTo ? freq * Math.pow(sweepTo / freq, Math.min(1, t / sweepTime)) : freq;
    phase += f / RATE;
    const e = envelope(t, peak, attack, decay);
    if (t > attack + decay) break;
    out[i] += osc(type, phase) * e;
  }
}

function noise(seconds, seed) {
  const r = rng(seed);
  const out = buffer(seconds);
  for (let i = 0; i < out.length; i++) out[i] = r() * 2 - 1;
  return out;
}

function mixInto(out, src, gainAt) {
  for (let i = 0; i < out.length && i < src.length; i++) out[i] += src[i] * (typeof gainAt === 'function' ? gainAt(i / RATE) : gainAt);
}

function normalize(out, peak = 0.9) {
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] *= peak / max;
  return out;
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([header, data]));
}

// Drone: two detuned triangles + a sine, low-passed, plus a band-passed corridor air, breathing slowly.
// Frequencies are chosen so that every component loops exactly over LOOP seconds (seamless loop).
const LOOP = 16;
function drone(base, seed) {
  const out = buffer(LOOP);
  const raw = buffer(LOOP);
  const parts = [
    { type: 'triangle', f: base, g: 0.015 },
    { type: 'triangle', f: base + 6 / LOOP, g: 0.015 },
    { type: 'sine', f: base * 1.5, g: 0.008 },
  ];
  for (let i = 0; i < raw.length; i++) {
    const t = i / RATE;
    for (const p of parts) raw[i] += osc(p.type, p.f * t) * p.g;
  }
  // Filter two loops and keep the second one, so the filter state is periodic too.
  const twice = new Float64Array(raw.length * 2);
  twice.set(raw);
  twice.set(raw, raw.length);
  const lp = biquad('lowpass', twice, 220, 0.7).subarray(raw.length);
  const airRaw = noise(LOOP, seed);
  const air = biquad('bandpass', airRaw, 340, 0.9);
  // Cross-fade the noise ends so the loop has no click.
  const fade = Math.round(0.5 * RATE);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    air[i] = air[i] * k + air[air.length - fade + i] * (1 - k);
  }
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const breath = 0.85 + 0.35 * Math.sin((2 * Math.PI * t) / LOOP);
    out[i] = (lp[i] + air[i] * 0.004) * breath;
  }
  return normalize(out, 0.7);
}

function step(seed) {
  const r = rng(seed);
  const out = buffer(0.18);
  tone(out, { freq: 88 + r() * 14, sweepTo: 52, sweepTime: 0.09, peak: 0.16, attack: 0.004, decay: 0.1 });
  const scuff = biquad('bandpass', noise(0.18, seed + 1), 900 + r() * 500, 1.1);
  mixInto(out, scuff, (t) => envelope(t, 0.08, 0.003, 0.07));
  return normalize(out, 0.8);
}

function turn(amount, seed) {
  const dur = 0.18 + amount * 0.5;
  const out = buffer(dur + 0.12);
  const band = biquad('bandpass', noise(dur + 0.12, seed), (t) => (t < dur * 0.6 ? 320 + (440 * t) / (dur * 0.6) : 760 - (460 * (t - dur * 0.6)) / (dur * 0.4)), 0.8);
  mixInto(out, band, (t) => envelope(t, 0.34 + amount * 0.26, 0.05, dur));
  return normalize(out, 0.6);
}

function click() {
  const out = buffer(0.1);
  tone(out, { type: 'triangle', freq: 760, sweepTo: 420, sweepTime: 0.06, peak: 0.22, attack: 0.002, decay: 0.07 });
  return normalize(out, 0.6);
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
function chime(index) {
  const out = buffer(1.3);
  [1, 2.01, 3.02].forEach((mult, i) => {
    tone(out, { freq: PENTATONIC[index] * mult, peak: 0.075 / (i + 1.4), attack: 0.005, decay: 1.1 - i * 0.25 });
  });
  return normalize(out, 0.6);
}

function victory() {
  const out = buffer(2.3);
  [392, 493.88, 587.33, 783.99].forEach((freq, i) => {
    [1, 2.01].forEach((mult, h) => tone(out, { freq: freq * mult, at: i * 0.14, peak: 0.11 / (h + 1.3), attack: 0.01, decay: 1.5 }));
  });
  return normalize(out, 0.75);
}

// Scary mode: a distant wooden creak (slow pitch wobble on a filtered saw).
function creak(seed) {
  const r = rng(seed);
  const dur = 1.4;
  const out = buffer(dur);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const f = 70 + 25 * Math.sin(t * 5.3 + r()) + 12 * Math.sin(t * 23);
    phase += f / RATE;
    const e = Math.sin((Math.PI * t) / dur) ** 2;
    out[i] = osc('saw', phase) * e * (0.6 + 0.4 * Math.sin(t * 61));
  }
  const band = biquad('bandpass', out, 520, 2.5);
  return normalize(biquad('lowpass', band, 1200, 0.7), 0.5);
}

fs.mkdirSync(OUT, { recursive: true });
writeWav('ambience', drone(55, 11));
writeWav('ambience-scary', drone(27.5, 12));
for (let i = 0; i < 4; i++) writeWav(`step-${i}`, step(100 + i));
writeWav('turn-1', turn(0.25, 201));
writeWav('turn-2', turn(0.5, 202));
writeWav('click', click());
PENTATONIC.forEach((_, i) => writeWav(`chime-${i}`, chime(i)));
writeWav('victory', victory());
writeWav('creak', creak(301));
const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.wav'));
const total = files.reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${files.length} sounds, ${(total / 1024).toFixed(0)} KB in ${path.relative(process.cwd(), OUT)}`);
