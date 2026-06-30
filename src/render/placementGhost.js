import * as THREE from 'three';
import {BUILDING_CELL_SCALE, BUILDING_DATA} from '../data/buildings.js';
import {MOON_RADIUS} from '../moon/moon.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {createMarkerTexture} from './markerTexture.js';

const GHOST_RADIUS = MOON_RADIUS + 0.016;
const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1);

export const placementGhost = {
    mesh: createMesh(),
    tool: null,
    textures: {},
    direction: new THREE.Quaternion(),
    normal: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    basis: new THREE.Matrix4(),
    size: {},
    hide,
    update
};

function hide() {
    placementGhost.mesh.visible = false;
}

function update(cell, type, rotation, valid) {
    getSphericalCellFrame(cell.latitude, cell.longitude, placementGhost.normal, placementGhost.east, placementGhost.north);
    getSphericalCellSize(GHOST_RADIUS, placementGhost.size);
    updateTexture(type);

    placementGhost.mesh.position.copy(placementGhost.normal).multiplyScalar(GHOST_RADIUS);
    placementGhost.basis.makeBasis(placementGhost.east, placementGhost.north, placementGhost.normal);
    placementGhost.mesh.quaternion.setFromRotationMatrix(placementGhost.basis);
    placementGhost.direction.setFromAxisAngle(LOCAL_FORWARD, -rotation * Math.PI * 0.5);
    placementGhost.mesh.quaternion.multiply(placementGhost.direction);
    placementGhost.mesh.scale.set(placementGhost.size.width * BUILDING_CELL_SCALE, placementGhost.size.height * BUILDING_CELL_SCALE, 1);
    placementGhost.mesh.material.color.set(valid ? '#67D68A' : '#D85C5C');
    placementGhost.mesh.visible = true;
}

function updateTexture(type) {
    if (placementGhost.tool === type) return;

    if (!placementGhost.textures[type]) {
        placementGhost.textures[type] = createTexture(type);
    }

    placementGhost.mesh.material.map = placementGhost.textures[type];
    placementGhost.mesh.material.needsUpdate = true;
    placementGhost.tool = type;
}

function createMesh() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: '#67D68A',
        map: createTexture(null),
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    return mesh;
}

function createTexture(type) {
    const definition = BUILDING_DATA[type];
    const letter = definition?.letter ?? 'X';

    return createMarkerTexture(letter, '#FFFFFF', null, true);
}