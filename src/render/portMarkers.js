import * as THREE from 'three';
import {createPortFrame, setPortFrame} from '../construction/portLayout.js';
import {constructionState} from '../simulation/constructionState.js';
import {PORT_TYPE} from '../simulation/ports.js';
import {addInstancedMesh, createInstancedMesh, growInstancedMesh} from './instancedMesh.js';
import {MARKER_RENDER_ORDER} from './markerPlacement.js';

const INITIAL_PORT_CAPACITY = 64;
const PORT_SCALE = 0.1;
const PORT_TYPES = [PORT_TYPE.input, PORT_TYPE.output];
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
    frame: createPortFrame(),
    scale: new THREE.Vector3(),
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
    for (let i = 0; i < building.simulation.inputPorts.length; i++) addPort(building, PORT_TYPE.input, i);
    for (let i = 0; i < building.simulation.outputPorts.length; i++) addPort(building, PORT_TYPE.output, i);
}

function addPort(building, type, portIndex) {
    const i = portCounts[type];

    if (i >= portMarkers.capacities[type]) growPortMesh(type);

    setPortMatrix(building, type, portIndex);
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

function setPortMatrix(building, type, portIndex) {
    setPortFrame(building, type, portIndex, portMarkers.frame);

    portMarkers.scale.set(portMarkers.frame.size.width * PORT_SCALE, portMarkers.frame.size.height * PORT_SCALE, 1);
    portMarkers.matrix.makeBasis(portMarkers.frame.east, portMarkers.frame.north, portMarkers.frame.normal);
    portMarkers.matrix.setPosition(portMarkers.frame.position);
    portMarkers.matrix.scale(portMarkers.scale);
}