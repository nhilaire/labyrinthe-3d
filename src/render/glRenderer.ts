// Three.js renderer on an expo-gl context. expo-gl gives a WebGL2 context but no canvas, so three gets a minimal
// canvas-like object (the expo-three set-up, without the expo-three package).
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

function fakeCanvas(gl: ExpoWebGLRenderingContext) {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  return {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => gl,
    getBoundingClientRect: () => ({ width, height, left: 0, top: 0, right: width, bottom: height, x: 0, y: 0 }),
  };
}

// three (>= r163) rejects any context that is `instanceof WebGLRenderingContext`, to refuse WebGL 1. expo-gl 57 makes
// WebGL2RenderingContext extend WebGLRenderingContext (as the WebGL spec does), so a real WebGL 2 context fails that
// test. When expo-gl reports WebGL 2, the global is hidden only while three builds the renderer (three reads it
// nowhere else).
function withoutWebGL1Check<T>(build: () => T): T {
  const g = globalThis as { WebGLRenderingContext?: unknown };
  const saved = g.WebGLRenderingContext;
  g.WebGLRenderingContext = undefined;
  try {
    return build();
  } finally {
    g.WebGLRenderingContext = saved;
  }
}

export function createRenderer(gl: ExpoWebGLRenderingContext): THREE.WebGLRenderer {
  if (!(gl as { supportsWebGL2?: boolean }).supportsWebGL2) throw new Error('WebGL 2 (OpenGL ES 3) is required');
  const renderer = withoutWebGL1Check(
    () =>
      new THREE.WebGLRenderer({
        canvas: fakeCanvas(gl) as unknown as HTMLCanvasElement,
        context: gl as unknown as WebGL2RenderingContext,
        antialias: false,
        powerPreference: 'high-performance',
      }),
  );
  // The drawing buffer is already at the screen resolution.
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}
