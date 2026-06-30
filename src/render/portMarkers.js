import * as THREE from 'three';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {constructionState} from '../simulation/constructionState.js';
import {DIRECTION, rotateDirection} from '../simulation/directions.js';
import {addInstancedMesh, createInstancedMesh, growInstancedMesh} from './instancedMesh.js';
import {CONSTRUCTION_MARKER_RADIUS, MARKER_RENDER_ORDER} from './markerPlacement.js';

const INITIAL_PORT_CAPACITY = 64;
const PORT_OFFSET_SCALE = 0.3;
const PORT_SCALE = 0.1;
const PORT_TYPES = ['input', 'output'];
const PORT_COLORS = {
    input: '#d58f48',
    output: '#48a4d5'
};
const portCounts = {
    input: 0,
    output: 0
};

export const portMarkers = {
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
    rebuild,
    setVisible
};

for (const type of PORT_TYPES) {
    const mesh = createPortMesh(type, INITIAL_PORT_CAPACITY);
    addInstancedMesh(portMarkers.group, portMarkers.meshes, portMarkers.capacities, type, mesh, INITIAL_PORT_CAPACITY);
}

function rebuild() {
    for (const type of PORT_TYPES) {
        portCounts[type] = 0;
    }

    for (const buildings of Object.values(constructionState.buildingsByType)) {
        for (const building of buildings) {
            addBuildingPorts(building);
        }
    }

    for (const type of PORT_TYPES) {
        const mesh = portMarkers.meshes[type];

        mesh.count = portCounts[type];
        mesh.instanceMatrix.needsUpdate = true;
    }
}

function setVisible(visible) {
    portMarkers.group.visible = visible;
}

function addBuildingPorts(building) {
    for (const direction of building.simulation.inputDirections) {
        addPort(building, 'input', rotateDirection(building.rotation, direction));
    }

    for (const direction of building.simulation.outputDirections) {
        addPort(building, 'output', rotateDirection(building.rotation, direction));
    }
}

function addPort(building, type, direction) {
    const i = portCounts[type];

    if (i >= portMarkers.capacities[type]) growPortMesh(type);

    setPortMatrix(building, direction);
    portMarkers.meshes[type].setMatrixAt(i, portMarkers.matrix);
    portCounts[type] = i + 1;
}

function createPortMesh(type, capacity) {
    const geometry = new THREE.CircleGeometry(1, 12);
    const material = new THREE.MeshBasicMaterial({
        color: PORT_COLORS[type],
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide
    });
    const mesh = createInstancedMesh(geometry, material, capacity);

    mesh.renderOrder = MARKER_RENDER_ORDER.port;
    return mesh;
}

function growPortMesh(type) {
    growInstancedMesh(
        portMarkers.group,
        portMarkers.meshes,
        portMarkers.capacities,
        type,
        (capacity) => createPortMesh(type, capacity),
        portMarkers.matrix
    );
}

function setPortMatrix(building, direction) {
    getSphericalCellFrame(building.latitude, building.longitude, portMarkers.normal, portMarkers.east, portMarkers.north);
    getSphericalCellSize(CONSTRUCTION_MARKER_RADIUS, portMarkers.size);
    portMarkers.position.copy(portMarkers.normal).multiplyScalar(CONSTRUCTION_MARKER_RADIUS);

    if (direction === DIRECTION.north) portMarkers.position.addScaledVector(portMarkers.north, portMarkers.size.height * PORT_OFFSET_SCALE);
    else if (direction === DIRECTION.east) portMarkers.position.addScaledVector(portMarkers.east, portMarkers.size.width * PORT_OFFSET_SCALE);
    else if (direction === DIRECTION.south) portMarkers.position.addScaledVector(portMarkers.north, -portMarkers.size.height * PORT_OFFSET_SCALE);
    else portMarkers.position.addScaledVector(portMarkers.east, -portMarkers.size.width * PORT_OFFSET_SCALE);

    portMarkers.scale.set(portMarkers.size.width * PORT_SCALE, portMarkers.size.height * PORT_SCALE, 1);
    portMarkers.matrix.makeBasis(portMarkers.east, portMarkers.north, portMarkers.normal);
    portMarkers.matrix.setPosition(portMarkers.position);
    portMarkers.matrix.scale(portMarkers.scale);
}