import * as THREE from 'three';

export const MOON_RADIUS = 2.5;

export function createMoon() {
  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 96, 48);
  const material = new THREE.MeshStandardMaterial({
    color: '#34383D',
  });

  return new THREE.Mesh(geometry, material);
}