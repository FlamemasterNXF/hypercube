import * as THREE from 'three';
import {BUILDING_CELL_SCALE, BUILDING_DATA} from '../data/buildings.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {constructionState} from '../simulation/constructionState.js';
import {DIRECTION} from '../simulation/directions.js';
import {addInstancedMesh, createInstancedMesh, growInstancedMesh} from './instancedMesh.js';
import {CONSTRUCTION_MARKER_RADIUS, MARKER_RENDER_ORDER} from './markerPlacement.js';

const INITIAL_ARM_CAPACITY = 64;
const ARM_LENGTH_SCALE = BUILDING_CELL_SCALE * 0.48;
const ARM_OFFSET_SCALE = BUILDING_CELL_SCALE * 0.24;
const ARM_WIDTH_SCALE = BUILDING_CELL_SCALE * 0.16;
const ARM_DIRECTIONS = [DIRECTION.north, DIRECTION.east, DIRECTION.south, DIRECTION.west];
const armCounts = [0, 0, 0, 0];

export const conveyorMarkers = {
    group: new THREE.Group(),
    meshes: [],
    capacities: [],
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    size: {},
    rebuild
};

for (let i = 0; i < ARM_DIRECTIONS.length; i++) {
    const mesh = createArmMesh(INITIAL_ARM_CAPACITY);
    addInstancedMesh(conveyorMarkers.group, conveyorMarkers.meshes, conveyorMarkers.capacities, i, mesh, INITIAL_ARM_CAPACITY);
}

function rebuild() {
    for (let i = 0; i < ARM_DIRECTIONS.length; i++) {
        armCounts[i] = 0;
    }

    for (const building of constructionState.conveyorBuildings) {
        const connections = building.simulation.conveyor.connections;

        for (let i = 0; i < ARM_DIRECTIONS.length; i++) {
            const direction = ARM_DIRECTIONS[i];

            if (!connections[direction]) continue;

            if (armCounts[direction] >= conveyorMarkers.capacities[direction]) growArmMesh(direction);

            setArmMatrix(building, direction);
            conveyorMarkers.meshes[direction].setMatrixAt(armCounts[direction], conveyorMarkers.matrix);
            armCounts[direction] += 1;
        }
    }

    for (let i = 0; i < ARM_DIRECTIONS.length; i++) {
        const mesh = conveyorMarkers.meshes[i];

        mesh.count = armCounts[i];
        mesh.instanceMatrix.needsUpdate = true;
    }
}

function createArmMesh(capacity) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: BUILDING_DATA.conveyor.color,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide
    });
    const mesh = createInstancedMesh(geometry, material, capacity);

    mesh.renderOrder = MARKER_RENDER_ORDER.conveyor;
    return mesh;
}

function growArmMesh(direction) {
    growInstancedMesh(
        conveyorMarkers.group,
        conveyorMarkers.meshes,
        conveyorMarkers.capacities,
        direction,
        createArmMesh,
        conveyorMarkers.matrix
    );
}

function setArmMatrix(building, direction) {
    getSphericalCellFrame(building.latitude, building.longitude, conveyorMarkers.normal, conveyorMarkers.east, conveyorMarkers.north);
    getSphericalCellSize(CONSTRUCTION_MARKER_RADIUS, conveyorMarkers.size);
    setArmPosition(direction);
    setArmScale(direction);
    conveyorMarkers.matrix.makeBasis(conveyorMarkers.east, conveyorMarkers.north, conveyorMarkers.normal);
    conveyorMarkers.matrix.setPosition(conveyorMarkers.position);
    conveyorMarkers.matrix.scale(conveyorMarkers.scale);
}

function setArmPosition(direction) {
    conveyorMarkers.position.copy(conveyorMarkers.normal).multiplyScalar(CONSTRUCTION_MARKER_RADIUS);

    // Yeah I could use a switch statement but that just feels more verbose here
    if (direction === DIRECTION.north) conveyorMarkers.position.addScaledVector(conveyorMarkers.north, conveyorMarkers.size.height * ARM_OFFSET_SCALE);
    else if (direction === DIRECTION.east) conveyorMarkers.position.addScaledVector(conveyorMarkers.east, conveyorMarkers.size.width * ARM_OFFSET_SCALE);
    else if (direction === DIRECTION.south) conveyorMarkers.position.addScaledVector(conveyorMarkers.north, -conveyorMarkers.size.height * ARM_OFFSET_SCALE);
    else conveyorMarkers.position.addScaledVector(conveyorMarkers.east, -conveyorMarkers.size.width * ARM_OFFSET_SCALE);
}

function setArmScale(direction) {
    if (direction === DIRECTION.north || direction === DIRECTION.south) {
        conveyorMarkers.scale.set(conveyorMarkers.size.width * ARM_WIDTH_SCALE, conveyorMarkers.size.height * ARM_LENGTH_SCALE, 1);
        return;
    }

    conveyorMarkers.scale.set(conveyorMarkers.size.width * ARM_LENGTH_SCALE, conveyorMarkers.size.height * ARM_WIDTH_SCALE, 1);
}