import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#03050A');

  const sunlight = new THREE.DirectionalLight('#FFF3DC', 2);
  sunlight.position.set(-4, 3, 6);
  scene.add(sunlight);

  const reflectedLight = new THREE.HemisphereLight(
    '#607AA3',
    '#08090C',
    0.42,
  );
  scene.add(reflectedLight);

  return scene;
}