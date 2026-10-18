// Frame statistics while walking, for the smoothness KPI (perf_sample) and the device proof (AC-30).
// Pure: fed with frame durations in milliseconds.

export const SLOW_FRAME_MS = 20;
export const MIN_FRAMES_FOR_SAMPLE = 300;

export class FrameStats {
  frames = 0;
  slow = 0;
  totalMs = 0;

  record(frameMs: number): void {
    if (!(frameMs > 0) || frameMs > 1000) return; // first frame, or the app was in the background
    this.frames++;
    this.totalMs += frameMs;
    if (frameMs > SLOW_FRAME_MS) this.slow++;
  }

  get fpsAvg(): number {
    return this.totalMs > 0 ? Math.round(((this.frames * 1000) / this.totalMs) * 10) / 10 : 0;
  }

  get slowPct(): number {
    return this.frames > 0 ? Math.round((this.slow / this.frames) * 1000) / 10 : 0;
  }

  get enough(): boolean {
    return this.frames >= MIN_FRAMES_FOR_SAMPLE;
  }

  reset(): void {
    this.frames = 0;
    this.slow = 0;
    this.totalMs = 0;
  }
}
