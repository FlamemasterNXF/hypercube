import * as THREE from 'three';

export function createMoon() {
  const geometry = new THREE.SphereGeometry(2.5, 96, 48);
  const material = new THREE.MeshStandardMaterial({
    color: '#34383D',
  });

  return new THREE.Mesh(geometry, material);
}