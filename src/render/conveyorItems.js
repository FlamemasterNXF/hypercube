import * as THREE from 'three';
import {RESOURCE_DATA} from '../data/resources.js';
import {MOON_RADIUS} from '../moon/moon.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {constructionState} from '../simulation/constructionState.js';

const ITEM_RADIUS = MOON_RADIUS + 0.02;
const ITEM_SCALE = 0.2;
const INITIAL_ITEM_CAPACITY = 64;
const RESOURCE_KEYS = Object.keys(RESOURCE_DATA);
const itemCounts = Object.fromEntries(RESOURCE_KEYS.map((resource) => [resource, 0]));

export const conveyorItems = {
    group: new THREE.Group(),
    meshes: {},
    capacities: {},
    lastTick: -1,
    wasVisible: false,
    matrix: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    size: {},
    update
};

for (const [resource, definition] of Object.entries(RESOURCE_DATA)) {
    const mesh = createItemMesh(definition, INITIAL_ITEM_CAPACITY);

    conveyorItems.capacities[resource] = INITIAL_ITEM_CAPACITY;
    conveyorItems.meshes[resource] = mesh;
    conveyorItems.group.add(mesh);
}

function update(visible, tick) {
    conveyorItems.group.visible = visible;

    if (!visible) {
        conveyorItems.wasVisible = false;
        return;
    }

    if (conveyorItems.wasVisible && conveyorItems.lastTick === tick) return;

    for (let i = 0; i < RESOURCE_KEYS.length; i += 1) {
        itemCounts[RESOURCE_KEYS[i]] = 0;
    }

    for (const building of constructionState.conveyorBuildings) {
        const slots = building.simulation.conveyor.slots;

        for (let i = 0; i < slots.length; i += 1) {
            const resource = slots[i];

            if (!resource) continue;

            const mesh = conveyorItems.meshes[resource];
            const itemIndex = itemCounts[resource];

            if (itemIndex >= conveyorItems.capacities[resource]) growItemMesh(resource);

            setItemMatrix(building, i, slots.length);
            conveyorItems.meshes[resource].setMatrixAt(itemIndex, conveyorItems.matrix);
            itemCounts[resource] = itemIndex + 1;
        }
    }

    for (let i = 0; i < RESOURCE_KEYS.length; i += 1) {
        const resource = RESOURCE_KEYS[i];
        const mesh = conveyorItems.meshes[resource];

        mesh.count = itemCounts[resource];
        mesh.instanceMatrix.needsUpdate = true;
    }

    conveyorItems.lastTick = tick;
    conveyorItems.wasVisible = true;
}

function createItemMesh(definition, capacity) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: definition.color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);

    mesh.count = 0;
    mesh.frustumCulled = false;
    return mesh;
}

function growItemMesh(resource) {
    const oldMesh = conveyorItems.meshes[resource];
    const capacity = conveyorItems.capacities[resource] * 2;
    const definition = RESOURCE_DATA[resource];
    const mesh = createItemMesh(definition, capacity);

    copyMatrices(oldMesh, mesh);
    mesh.count = oldMesh.count;
    conveyorItems.group.remove(oldMesh);
    conveyorItems.group.add(mesh);
    oldMesh.geometry.dispose();
    oldMesh.material.dispose();
    conveyorItems.meshes[resource] = mesh;
    conveyorItems.capacities[resource] = capacity;
}

function copyMatrices(source, target) {
    for (let i = 0; i < source.count; i += 1) {
        source.getMatrixAt(i, conveyorItems.matrix);
        target.setMatrixAt(i, conveyorItems.matrix);
    }
}

function setItemMatrix(building, slotIndex, slotCount) {
    getSphericalCellFrame(building.latitude, building.longitude, conveyorItems.normal, conveyorItems.east, conveyorItems.north);
    getSphericalCellSize(ITEM_RADIUS, conveyorItems.size);
    setForwardVector(building.rotation);

    const offset = ((slotIndex + 0.5) / slotCount - 0.5) * conveyorItems.size.height * 0.65;

    conveyorItems.position.copy(conveyorItems.normal).multiplyScalar(ITEM_RADIUS).addScaledVector(conveyorItems.forward, offset);
    conveyorItems.scale.set(conveyorItems.size.width * ITEM_SCALE, conveyorItems.size.height * ITEM_SCALE, 1);
    conveyorItems.matrix.makeBasis(conveyorItems.east, conveyorItems.north, conveyorItems.normal);
    conveyorItems.matrix.setPosition(conveyorItems.position);
    conveyorItems.matrix.scale(conveyorItems.scale);
}

function setForwardVector(rotation) {
    if (rotation === 0) {
        conveyorItems.forward.copy(conveyorItems.north);
    } else if (rotation === 1) {
        conveyorItems.forward.copy(conveyorItems.east);
    } else if (rotation === 2) {
        conveyorItems.forward.copy(conveyorItems.north).multiplyScalar(-1);
    } else {
        conveyorItems.forward.copy(conveyorItems.east).multiplyScalar(-1);
    }
}