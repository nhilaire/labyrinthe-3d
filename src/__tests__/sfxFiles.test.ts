// AC-28 (file part): every bundled sound is a well-formed PCM WAV that Android's player can read. A missing "data"
// chunk id made ExoPlayer fail with EOFException on the phone (no sound at all in the first phone test).
import fs from 'fs';
import path from 'path';

const DIR = path.join(__dirname, '..', '..', 'assets', 'sfx');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.wav'));

describe('sound files', () => {
  it('has the 17 sounds of the engine', () => {
    expect(files).toHaveLength(17);
  });

  it.each(files)('%s has RIFF/WAVE, fmt and data chunks with a consistent size', (file) => {
    const b = fs.readFileSync(path.join(DIR, file));
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.readUInt32LE(4)).toBe(b.length - 8);
    expect(b.toString('ascii', 8, 12)).toBe('WAVE');
    expect(b.toString('ascii', 12, 16)).toBe('fmt ');
    expect(b.readUInt16LE(20)).toBe(1); // PCM
    expect(b.readUInt16LE(22)).toBe(1); // mono
    expect(b.readUInt16LE(34)).toBe(16); // 16-bit
    expect(b.toString('ascii', 36, 40)).toBe('data');
    expect(b.readUInt32LE(40)).toBe(b.length - 44);
    // Not silent.
    let peak = 0;
    for (let i = 44; i < b.length; i += 2) peak = Math.max(peak, Math.abs(b.readInt16LE(i)));
    expect(peak).toBeGreaterThan(8000);
  });
});
