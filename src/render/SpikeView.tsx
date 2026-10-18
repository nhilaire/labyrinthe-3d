// T-01 spike: proves that three renders on expo-gl with Expo SDK 57. Replaced by the maze view in T-07/T-08.
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';

import { createRenderer } from './glRenderer';

export function SpikeView() {
  const frame = useRef<number | null>(null);
  useEffect(() => () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const renderer = createRenderer(gl);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05040a);
    scene.fog = new THREE.FogExp2(0x05040a, 0.08);
    const camera = new THREE.PerspectiveCamera(70, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.05, 100);
    camera.position.set(0, 1.2, 4);
    const torch = new THREE.PointLight(0xffd9a8, 30, 20, 1.7);
    torch.position.set(1, 2, 3);
    scene.add(torch, new THREE.AmbientLight(0x4a4568, 0.6));
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a5a3c }));
    cube.position.y = 1;
    scene.add(cube);
    let last = Date.now();
    let frames = 0;
    const loop = () => {
      frame.current = requestAnimationFrame(loop);
      cube.rotation.y += 0.01;
      cube.rotation.x += 0.004;
      renderer.render(scene, camera);
      gl.endFrameEXP();
      frames++;
      const now = Date.now();
      if (now - last >= 5000) {
        console.log(`SPIKE_FPS ${((frames * 1000) / (now - last)).toFixed(1)}`);
        frames = 0;
        last = now;
      }
    };
    loop();
  };

  return <GLView testID="spike-gl" style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />;
}
