import * as THREE from 'three';
import {BUILDING_CELL_SCALE, BUILDING_TYPES} from '../data/buildings.js';
import {MOON_RADIUS} from '../moon/moon.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';

const MAX_BUILDINGS_PER_TYPE = 1e6;
const MARKER_RADIUS = MOON_RADIUS + 0.012;
const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1);

export const buildingMarkers = {
    group: new THREE.Group(),
    meshes: {},
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    direction: new THREE.Quaternion(),
    normal: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    basis: new THREE.Matrix4(),
    scale: new THREE.Vector3(),
    size: {},
    add,
    hasCapacity,
    remove
};

for (const [type, definition] of Object.entries(BUILDING_TYPES)) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: createMarkerTexture(definition),
        transparent: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.InstancedMesh(
        geometry,
        material,
        MAX_BUILDINGS_PER_TYPE
    );

    mesh.count = 0;
    mesh.frustumCulled = false;
    buildingMarkers.meshes[type] = mesh;
    buildingMarkers.group.add(mesh);
}

function add(building) {
    const mesh = buildingMarkers.meshes[building.type];
    const i = building.typeIndex;

    if (i >= MAX_BUILDINGS_PER_TYPE) return false;

    setMarkerMatrix(building);
    mesh.setMatrixAt(i, buildingMarkers.matrix);
    mesh.count = i + 1;
    mesh.instanceMatrix.needsUpdate = true;
    return true;
}

function remove({movedBuilding, removedIndex, type}) {
    const mesh = buildingMarkers.meshes[type];

    if (movedBuilding) {
        setMarkerMatrix(movedBuilding);
        mesh.setMatrixAt(removedIndex, buildingMarkers.matrix);
    }

    mesh.count -= 1;
    mesh.instanceMatrix.needsUpdate = true;
}

function hasCapacity(type) {
    return buildingMarkers.meshes[type].count < MAX_BUILDINGS_PER_TYPE;
}

function setMarkerMatrix(building) {
    getSphericalCellFrame(building.latitude, building.longitude, buildingMarkers.normal, buildingMarkers.east, buildingMarkers.north);
    getSphericalCellSize(MARKER_RADIUS, buildingMarkers.size);

    buildingMarkers.position.copy(buildingMarkers.normal).multiplyScalar(MARKER_RADIUS);
    buildingMarkers.basis.makeBasis(buildingMarkers.east, buildingMarkers.north, buildingMarkers.normal);
    buildingMarkers.rotation.setFromRotationMatrix(buildingMarkers.basis);
    buildingMarkers.direction.setFromAxisAngle(LOCAL_FORWARD, building.rotation * Math.PI * 0.5);
    buildingMarkers.rotation.multiply(buildingMarkers.direction);
    buildingMarkers.scale.set(buildingMarkers.size.width * BUILDING_CELL_SCALE, buildingMarkers.size.height * BUILDING_CELL_SCALE, 1);
    buildingMarkers.matrix.compose(buildingMarkers.position, buildingMarkers.rotation, buildingMarkers.scale);
}

function createMarkerTexture(definition) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;

    context.fillStyle = '#11151A';
    context.fillRect(8, 8, 112, 112);
    context.strokeStyle = definition.color;
    context.lineWidth = 8;
    context.strokeRect(8, 8, 112, 112);
    context.fillStyle = definition.color;
    context.font = 'bold 64px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(definition.letter, 64, 70);
    context.beginPath();
    context.moveTo(64, 12);
    context.lineTo(52, 28);
    context.lineTo(76, 28);
    context.closePath();
    context.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}