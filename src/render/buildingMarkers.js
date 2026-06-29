import * as THREE from 'three';
import {BUILDING_CELL_SCALE, BUILDING_DATA} from '../data/buildings.js';
import {MOON_RADIUS} from '../moon/moon.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {constructionState} from '../simulation/constructionState.js';
import {createMarkerTexture} from './markerTexture.js';

const INITIAL_BUILDING_CAPACITY = 64;
const MARKER_RADIUS = MOON_RADIUS + 0.012;
const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1);

export const buildingMarkers = {
    group: new THREE.Group(),
    meshes: {},
    capacities: {},
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
    remove,
    update
};

for (const [type, definition] of Object.entries(BUILDING_DATA)) {
    const mesh = createMarkerMesh(type, definition, INITIAL_BUILDING_CAPACITY);

    buildingMarkers.capacities[type] = INITIAL_BUILDING_CAPACITY;
    buildingMarkers.meshes[type] = mesh;
    buildingMarkers.group.add(mesh);
}

function add(building) {
    const i = building.typeIndex;
z
    if (i >= buildingMarkers.capacities[building.type]) growMarkerMesh(building.type);

    setMarkerMatrix(building);
    buildingMarkers.meshes[building.type].setMatrixAt(i, buildingMarkers.matrix);
    buildingMarkers.meshes[building.type].count = i + 1;
    buildingMarkers.meshes[building.type].instanceMatrix.needsUpdate = true;
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

function update(building) {
    const mesh = buildingMarkers.meshes[building.type];

    setMarkerMatrix(building);
    mesh.setMatrixAt(building.typeIndex, buildingMarkers.matrix);
    mesh.instanceMatrix.needsUpdate = true;
}

function createMarkerMesh(type, definition, capacity) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: createMarkerTexture(definition.letter, definition.color, '#11151A', type !== 'conveyor'),
        transparent: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);

    mesh.count = 0;
    mesh.frustumCulled = false;
    return mesh;
}

function growMarkerMesh(type) {
    const definition = BUILDING_DATA[type];
    const oldMesh = buildingMarkers.meshes[type];
    const capacity = buildingMarkers.capacities[type] * 2;
    const mesh = createMarkerMesh(type, definition, capacity);
    const buildings = constructionState.buildingsByType[type];

    for (let i = 0; i < buildings.length; i++) {
        setMarkerMatrix(buildings[i]);
        mesh.setMatrixAt(i, buildingMarkers.matrix);
    }

    mesh.count = oldMesh.count;
    mesh.instanceMatrix.needsUpdate = true;
    buildingMarkers.group.remove(oldMesh);
    buildingMarkers.group.add(mesh);
    oldMesh.geometry.dispose();
    oldMesh.material.map.dispose();
    oldMesh.material.dispose();
    buildingMarkers.meshes[type] = mesh;
    buildingMarkers.capacities[type] = capacity;
}

function setMarkerMatrix(building) {
    getSphericalCellFrame(building.latitude, building.longitude, buildingMarkers.normal, buildingMarkers.east, buildingMarkers.north);
    getSphericalCellSize(MARKER_RADIUS, buildingMarkers.size);

    buildingMarkers.position.copy(buildingMarkers.normal).multiplyScalar(MARKER_RADIUS);
    buildingMarkers.basis.makeBasis(buildingMarkers.east, buildingMarkers.north, buildingMarkers.normal);
    buildingMarkers.rotation.setFromRotationMatrix(buildingMarkers.basis);
    buildingMarkers.direction.setFromAxisAngle(LOCAL_FORWARD, -building.rotation * Math.PI * 0.5);
    buildingMarkers.rotation.multiply(buildingMarkers.direction);
    buildingMarkers.scale.set(buildingMarkers.size.width * BUILDING_CELL_SCALE, buildingMarkers.size.height * BUILDING_CELL_SCALE, 1);
    buildingMarkers.matrix.compose(buildingMarkers.position, buildingMarkers.rotation, buildingMarkers.scale);
}