import * as THREE from 'three';

export const MOON_RADIUS = 2.5;

const geometry = new THREE.SphereGeometry(MOON_RADIUS, 96, 48);
const material = new THREE.MeshStandardMaterial({
    color: '#34383D'
});

export const moon = new THREE.Mesh(geometry, material);