import * as THREE from 'three';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.2, 8.2);
  camera.lookAt(0, 0, 0);

  return camera;
}