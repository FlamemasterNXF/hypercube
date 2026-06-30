import * as THREE from 'three';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {constructionState} from '../simulation/constructionState.js';
import {BUILDING_STATUS, BUILDING_STATUS_DATA} from '../simulation/buildingSimulation.js';
import {addInstancedMesh, createInstancedMesh, growInstancedMesh} from './instancedMesh.js';
import {CONSTRUCTION_MARKER_RADIUS, MARKER_RENDER_ORDER} from './markerPlacement.js';

const INITIAL_STATUS_CAPACITY = 64;
const STATUS_SCALE = 0.1;
const STATUS_ORDER = [
    BUILDING_STATUS.idle,
    BUILDING_STATUS.working,
    BUILDING_STATUS.lacking,
    BUILDING_STATUS.full
];
const statusCounts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]));
const statusBuildings = Object.fromEntries(STATUS_ORDER.map((status) => [status, []]));

export const statusMarkers = {
    group: new THREE.Group(),
    meshes: {},
    capacities: {},
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    size: {},
    add,
    remove,
    update
};

for (const status of STATUS_ORDER) {
    const mesh = createStatusMesh(status, INITIAL_STATUS_CAPACITY);
    addInstancedMesh(statusMarkers.group, statusMarkers.meshes, statusMarkers.capacities, status, mesh, INITIAL_STATUS_CAPACITY);
}

function add(building) {
    const status = building.simulation.status;
    const i = statusCounts[status];

    if (i >= statusMarkers.capacities[status]) growStatusMesh(status);

    setStatusMatrix(building);
    statusMarkers.meshes[status].setMatrixAt(i, statusMarkers.matrix);
    statusMarkers.meshes[status].count = i + 1;
    statusMarkers.meshes[status].instanceMatrix.needsUpdate = true;
    statusBuildings[status][i] = building;
    statusCounts[status] = i + 1;
    building.statusMarkerStatus = status;
    building.statusMarkerIndex = i;
}

function remove({building}) {
    if (building.statusMarkerIndex === null || building.statusMarkerIndex === undefined) return;

    removeBuildingMarker(building);
}

function update() {
    const changedBuildings = constructionState.getAndResetStatusChangedBuildings();

    for (const building of changedBuildings) {
        if (!building) continue;
        if (building.statusMarkerIndex === null || building.statusMarkerIndex === undefined) continue;
        if (building.statusMarkerStatus === building.simulation.status) continue;

        removeBuildingMarker(building);
        add(building);
    }
}

function createStatusMesh(status, capacity) {
    const geometry = new THREE.CircleGeometry(1, 16);
    const material = new THREE.MeshBasicMaterial({
        color: BUILDING_STATUS_DATA[status].color,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        side: THREE.DoubleSide
    });
    const mesh = createInstancedMesh(geometry, material, capacity);

    mesh.renderOrder = MARKER_RENDER_ORDER.status;
    return mesh;
}

function growStatusMesh(status) {
    growInstancedMesh(
        statusMarkers.group,
        statusMarkers.meshes,
        statusMarkers.capacities,
        status,
        (capacity) => createStatusMesh(status, capacity),
        statusMarkers.matrix
    );
}

function removeBuildingMarker(building) {
    const status = building.statusMarkerStatus;
    const removedIndex = building.statusMarkerIndex;
    const lastIndex = statusCounts[status] - 1;
    const movedBuilding = statusBuildings[status][lastIndex];
    const mesh = statusMarkers.meshes[status];

    if (movedBuilding !== building) {
        statusBuildings[status][removedIndex] = movedBuilding;
        movedBuilding.statusMarkerIndex = removedIndex;
        setStatusMatrix(movedBuilding);
        mesh.setMatrixAt(removedIndex, statusMarkers.matrix);
    }

    statusBuildings[status].pop();
    statusCounts[status] = lastIndex;
    mesh.count = lastIndex;
    mesh.instanceMatrix.needsUpdate = true;
    building.statusMarkerStatus = null;
    building.statusMarkerIndex = null;
}

function setStatusMatrix(building) {
    getSphericalCellFrame(building.latitude, building.longitude, statusMarkers.normal, statusMarkers.east, statusMarkers.north);
    getSphericalCellSize(CONSTRUCTION_MARKER_RADIUS, statusMarkers.size);

    statusMarkers.position.copy(statusMarkers.normal).multiplyScalar(CONSTRUCTION_MARKER_RADIUS).addScaledVector(statusMarkers.east, statusMarkers.size.width * 0.25).addScaledVector(statusMarkers.north, statusMarkers.size.height * 0.25);
    statusMarkers.scale.set(statusMarkers.size.width * STATUS_SCALE, statusMarkers.size.height * STATUS_SCALE, 1);
    statusMarkers.matrix.makeBasis(statusMarkers.east, statusMarkers.north, statusMarkers.normal);
    statusMarkers.matrix.setPosition(statusMarkers.position);
    statusMarkers.matrix.scale(statusMarkers.scale);
}