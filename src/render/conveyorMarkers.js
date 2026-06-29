import * as THREE from 'three';
import {BUILDING_CELL_SCALE, BUILDING_DATA} from '../data/buildings.js';
import {MOON_RADIUS} from '../moon/moon.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {constructionState} from '../simulation/constructionState.js';
import {DIRECTION} from '../simulation/directions.js';

const INITIAL_ARM_CAPACITY = 64;
const ARM_RADIUS = MOON_RADIUS + 0.018;
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

    conveyorMarkers.capacities[i] = INITIAL_ARM_CAPACITY;
    conveyorMarkers.meshes[i] = mesh;
    conveyorMarkers.group.add(mesh);
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
        side: THREE.DoubleSide
    });
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);

    mesh.count = 0;
    mesh.frustumCulled = false;
    return mesh;
}

function growArmMesh(direction) {
    const oldMesh = conveyorMarkers.meshes[direction];
    const capacity = conveyorMarkers.capacities[direction] * 2;
    const mesh = createArmMesh(capacity);

    copyMatrices(oldMesh, mesh);
    mesh.count = oldMesh.count;
    conveyorMarkers.group.remove(oldMesh);
    conveyorMarkers.group.add(mesh);
    oldMesh.geometry.dispose();
    oldMesh.material.dispose();
    conveyorMarkers.meshes[direction] = mesh;
    conveyorMarkers.capacities[direction] = capacity;
}

function copyMatrices(source, target) {
    for (let i = 0; i < source.count; i++) {
        source.getMatrixAt(i, conveyorMarkers.matrix);
        target.setMatrixAt(i, conveyorMarkers.matrix);
    }
}

function setArmMatrix(building, direction) {
    getSphericalCellFrame(building.latitude, building.longitude, conveyorMarkers.normal, conveyorMarkers.east, conveyorMarkers.north);
    getSphericalCellSize(ARM_RADIUS, conveyorMarkers.size);
    setArmPosition(direction);
    setArmScale(direction);
    conveyorMarkers.matrix.makeBasis(conveyorMarkers.east, conveyorMarkers.north, conveyorMarkers.normal);
    conveyorMarkers.matrix.setPosition(conveyorMarkers.position);
    conveyorMarkers.matrix.scale(conveyorMarkers.scale);
}

function setArmPosition(direction) {
    conveyorMarkers.position.copy(conveyorMarkers.normal).multiplyScalar(ARM_RADIUS);

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