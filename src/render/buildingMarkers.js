import * as THREE from 'three';
import {BUILDING_DATA} from '../data/buildings.js';
import {getFootprintVisualSize} from '../construction/footprintLayout.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {getBaseFootprint, getBuildingCenter} from '../simulation/buildingFootprints.js';
import {addInstancedMesh, createInstancedMesh, growInstancedMesh} from './instancedMesh.js';
import {CONSTRUCTION_MARKER_RADIUS, MARKER_RENDER_ORDER} from './markerPlacement.js';
import {createMarkerTexture} from './markerTexture.js';

const INITIAL_BUILDING_CAPACITY = 64;
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
    addInstancedMesh(buildingMarkers.group, buildingMarkers.meshes, buildingMarkers.capacities, type, mesh, INITIAL_BUILDING_CAPACITY);
}

function add(building) {
    const i = building.typeIndex;

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
        map: createMarkerTexture(definition.letter, definition.color, '#11151A', false),
        transparent: true,
        side: THREE.DoubleSide
    });

    const mesh = createInstancedMesh(geometry, material, capacity);
    mesh.renderOrder = MARKER_RENDER_ORDER.building;
    return mesh;
}

function growMarkerMesh(type) {
    growInstancedMesh(
        buildingMarkers.group,
        buildingMarkers.meshes,
        buildingMarkers.capacities,
        type,
        (capacity) => createMarkerMesh(type, BUILDING_DATA[type], capacity),
        buildingMarkers.matrix
    );
}

function setMarkerMatrix(building) {
    const center = getBuildingCenter(building);
    const footprint = getBaseFootprint(building.type);
    const visualSize = getFootprintVisualSize(footprint);

    getSphericalCellFrame(center.latitude, center.longitude, buildingMarkers.normal, buildingMarkers.east, buildingMarkers.north);
    getSphericalCellSize(CONSTRUCTION_MARKER_RADIUS, buildingMarkers.size);

    buildingMarkers.position.copy(buildingMarkers.normal).multiplyScalar(CONSTRUCTION_MARKER_RADIUS);
    buildingMarkers.basis.makeBasis(buildingMarkers.east, buildingMarkers.north, buildingMarkers.normal);
    buildingMarkers.rotation.setFromRotationMatrix(buildingMarkers.basis);
    buildingMarkers.direction.setFromAxisAngle(LOCAL_FORWARD, -building.rotation * Math.PI * 0.5);
    buildingMarkers.rotation.multiply(buildingMarkers.direction);
    buildingMarkers.scale.set(buildingMarkers.size.width * visualSize.width, buildingMarkers.size.height * visualSize.height, 1);
    buildingMarkers.matrix.compose(buildingMarkers.position, buildingMarkers.rotation, buildingMarkers.scale);
}