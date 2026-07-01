import * as THREE from 'three';
import {getStatusCornerOffset} from '../construction/footprintLayout.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {getBuildingCenter, getBuildingFootprint} from '../simulation/buildingFootprints.js';
import {constructionState} from '../simulation/constructionState.js';
import {BUILDING_STATUS, BUILDING_STATUS_DATA} from '../simulation/buildingSimulation.js';
import {copyInstanceMatrices, createInstancedMesh, disposeInstancedMesh} from './instancedMesh.js';
import {CONSTRUCTION_MARKER_RADIUS, MARKER_RENDER_ORDER} from './markerPlacement.js';

const INITIAL_STATUS_CAPACITY = 64;
const STATUS_SCALE = 0.1;
const STATUS_OUTLINE_SCALE = 0.15;
const STATUS_OUTLINE_COLOR = '#11151A';
const STATUS_FILL_RENDER_ORDER = MARKER_RENDER_ORDER.status + 1;
const STATUS_ORDER = [
    BUILDING_STATUS.idle,
    BUILDING_STATUS.working,
    BUILDING_STATUS.lacking,
    BUILDING_STATUS.full
];
const statusMarkerSets = Object.fromEntries(STATUS_ORDER.map((status) => [status, createStatusMarkerSet(status)]));

export const statusMarkers = {
    group: new THREE.Group(),
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    size: {},
    add,
    rebuild,
    remove,
    update
};

for (const status of STATUS_ORDER) {
    addStatusMarkerSet(statusMarkerSets[status]);
}

function add(building) {
    const status = building.simulation.status;
    const markerSet = statusMarkerSets[status];
    const i = markerSet.count;

    if (i >= markerSet.capacity) growStatusMarkerSet(markerSet);

    setStatusMarkerMatrices(markerSet, i, building);
    setStatusMarkerCount(markerSet, i + 1);
    markerSet.buildings[i] = building;
    building.statusMarkerStatus = status;
    building.statusMarkerIndex = i;
}

function remove({building}) {
    if (building.statusMarkerIndex === null || building.statusMarkerIndex === undefined) return;

    removeBuildingMarker(building);
}

function rebuild() {
    for (const status of STATUS_ORDER) {
        clearStatusMarkerSet(statusMarkerSets[status]);
    }

    for (const building of constructionState.getBuildings()) {
        building.statusMarkerStatus = null;
        building.statusMarkerIndex = null;
        add(building);
    }
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

    mesh.renderOrder = STATUS_FILL_RENDER_ORDER;
    return mesh;
}

function createStatusOutlineMesh(capacity) {
    const geometry = new THREE.CircleGeometry(1, 16);
    const material = new THREE.MeshBasicMaterial({
        color: STATUS_OUTLINE_COLOR,
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

function createStatusMarkerSet(status) {
    return {
        status,
        count: 0,
        capacity: INITIAL_STATUS_CAPACITY,
        buildings: [],
        outlineMesh: createStatusOutlineMesh(INITIAL_STATUS_CAPACITY),
        fillMesh: createStatusMesh(status, INITIAL_STATUS_CAPACITY)
    };
}

function addStatusMarkerSet(markerSet) {
    statusMarkers.group.add(markerSet.outlineMesh, markerSet.fillMesh);
}

function clearStatusMarkerSet(markerSet) {
    markerSet.count = 0;
    markerSet.buildings = [];
    markerSet.outlineMesh.count = 0;
    markerSet.fillMesh.count = 0;
    markerSet.outlineMesh.instanceMatrix.needsUpdate = true;
    markerSet.fillMesh.instanceMatrix.needsUpdate = true;
}

function growStatusMarkerSet(markerSet) {
    const capacity = markerSet.capacity * 2;
    const outlineMesh = createStatusOutlineMesh(capacity);
    const fillMesh = createStatusMesh(markerSet.status, capacity);

    copyInstanceMatrices(markerSet.outlineMesh, outlineMesh, statusMarkers.matrix);
    copyInstanceMatrices(markerSet.fillMesh, fillMesh, statusMarkers.matrix);
    outlineMesh.count = markerSet.count;
    fillMesh.count = markerSet.count;
    replaceStatusMesh(markerSet.outlineMesh, outlineMesh);
    replaceStatusMesh(markerSet.fillMesh, fillMesh);
    markerSet.outlineMesh = outlineMesh;
    markerSet.fillMesh = fillMesh;
    markerSet.capacity = capacity;
}

function replaceStatusMesh(oldMesh, newMesh) {
    statusMarkers.group.remove(oldMesh);
    statusMarkers.group.add(newMesh);
    disposeInstancedMesh(oldMesh);
}

function removeBuildingMarker(building) {
    const status = building.statusMarkerStatus;
    const markerSet = statusMarkerSets[status];
    const removedIndex = building.statusMarkerIndex;
    const lastIndex = markerSet.count - 1;
    const movedBuilding = markerSet.buildings[lastIndex];

    if (movedBuilding !== building) {
        markerSet.buildings[removedIndex] = movedBuilding;
        movedBuilding.statusMarkerIndex = removedIndex;
        setStatusMarkerMatrices(markerSet, removedIndex, movedBuilding);
    }

    markerSet.buildings.pop();
    setStatusMarkerCount(markerSet, lastIndex);
    building.statusMarkerStatus = null;
    building.statusMarkerIndex = null;
}

function setStatusMarkerMatrices(markerSet, index, building) {
    setStatusMatrix(building, STATUS_OUTLINE_SCALE);
    markerSet.outlineMesh.setMatrixAt(index, statusMarkers.matrix);
    markerSet.outlineMesh.instanceMatrix.needsUpdate = true;

    setStatusMatrix(building, STATUS_SCALE);
    markerSet.fillMesh.setMatrixAt(index, statusMarkers.matrix);
    markerSet.fillMesh.instanceMatrix.needsUpdate = true;
}

function setStatusMarkerCount(markerSet, count) {
    markerSet.count = count;
    markerSet.outlineMesh.count = count;
    markerSet.fillMesh.count = count;
    markerSet.outlineMesh.instanceMatrix.needsUpdate = true;
    markerSet.fillMesh.instanceMatrix.needsUpdate = true;
}

function setStatusMatrix(building, scale) {
    const center = getBuildingCenter(building);
    const footprint = getBuildingFootprint(building);
    const offset = getStatusCornerOffset(footprint, STATUS_OUTLINE_SCALE);

    getSphericalCellFrame(center.latitude, center.longitude, statusMarkers.normal, statusMarkers.east, statusMarkers.north);
    getSphericalCellSize(CONSTRUCTION_MARKER_RADIUS, statusMarkers.size);

    statusMarkers.position.copy(statusMarkers.normal).multiplyScalar(CONSTRUCTION_MARKER_RADIUS).addScaledVector(statusMarkers.east, statusMarkers.size.width * offset.east).addScaledVector(statusMarkers.north, statusMarkers.size.height * offset.north);
    statusMarkers.scale.set(statusMarkers.size.width * scale, statusMarkers.size.height * scale, 1);
    statusMarkers.matrix.makeBasis(statusMarkers.east, statusMarkers.north, statusMarkers.normal);
    statusMarkers.matrix.setPosition(statusMarkers.position);
    statusMarkers.matrix.scale(statusMarkers.scale);
}