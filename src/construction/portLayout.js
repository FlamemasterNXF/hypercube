import * as THREE from 'three';
import {CONSTRUCTION_MARKER_RADIUS} from '../render/markerPlacement.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {DIRECTION, rotateDirection} from '../simulation/directions.js';
import {getPorts} from '../simulation/ports.js';

export const PORT_SIDE_OFFSET_SCALE = 0.3;
export const PORT_SPACING_SCALE = 0.16;

const screenPosition = new THREE.Vector3();
const searchFrame = createPortFrame();
const screenFrame = createPortFrame();

export function createPortFrame() {
    return {
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(),
        east: new THREE.Vector3(),
        north: new THREE.Vector3(),
        side: new THREE.Vector3(),
        tangent: new THREE.Vector3(),
        size: {}
    };
}

export function setPortFrame(building, type, portIndex, frame) {
    const ports = getPorts(building, type);
    const port = ports[portIndex];

    if (!port) return false;

    const side = rotateDirection(building.rotation, port.side);
    const sideIndex = getSideIndex(building, type, portIndex, side);
    const sideCount = getSideCount(building, type, side);
    const tangentOffset = (sideIndex - (sideCount - 1) * 0.5) * PORT_SPACING_SCALE;

    getSphericalCellFrame(building.latitude, building.longitude, frame.normal, frame.east, frame.north);
    getSphericalCellSize(CONSTRUCTION_MARKER_RADIUS, frame.size);
    setSideVectors(side, frame);
    frame.position.copy(frame.normal).multiplyScalar(CONSTRUCTION_MARKER_RADIUS).addScaledVector(frame.side, frame.size.width * PORT_SIDE_OFFSET_SCALE).addScaledVector(frame.tangent, frame.size.width * tangentOffset);
    return true;
}

export function findPortAtScreenPosition(building, type, x, y, camera, bounds, maxDistance, sideFilter = null) {
    const ports = getPorts(building, type);
    let closestIndex = null;
    let closestDistance = maxDistance;

    for (let i = 0; i < ports.length; i++) {
        if (sideFilter !== null && rotateDirection(building.rotation, ports[i].side) !== sideFilter) continue;
        if (!setPortFrame(building, type, i, searchFrame)) continue;

        screenPosition.copy(searchFrame.position).project(camera);

        const screenX = bounds.left + (screenPosition.x + 1) * 0.5 * bounds.width;
        const screenY = bounds.top + (1 - (screenPosition.y + 1) * 0.5) * bounds.height;
        const distance = Math.hypot(screenX - x, screenY - y);

        if (distance <= closestDistance) {
            closestDistance = distance;
            closestIndex = i;
        }
    }

    return closestIndex;
}

export function getPortScreenPosition(building, type, portIndex, camera, bounds, target) {
    if (!setPortFrame(building, type, portIndex, screenFrame)) return false;

    screenPosition.copy(screenFrame.position).project(camera);
    target.x = bounds.left + (screenPosition.x + 1) * 0.5 * bounds.width;
    target.y = bounds.top + (1 - (screenPosition.y + 1) * 0.5) * bounds.height;
    return true;
}

function getSideIndex(building, type, portIndex, side) {
    const ports = getPorts(building, type);
    let index = 0;

    for (let i = 0; i < portIndex; i++) {
        if (rotateDirection(building.rotation, ports[i].side) === side) index++;
    }

    return index;
}

function getSideCount(building, type, side) {
    const ports = getPorts(building, type);

    let count = 0;
    for (let i = 0; i < ports.length; i++) if (rotateDirection(building.rotation, ports[i].side) === side) count++;

    return count;
}

function setSideVectors(side, frame) {
    if (side === DIRECTION.north) {
        frame.side.copy(frame.north);
        frame.tangent.copy(frame.east);
    } else if (side === DIRECTION.east) {
        frame.side.copy(frame.east);
        frame.tangent.copy(frame.north);
    } else if (side === DIRECTION.south) {
        frame.side.copy(frame.north).multiplyScalar(-1);
        frame.tangent.copy(frame.east);
    } else {
        frame.side.copy(frame.east).multiplyScalar(-1);
        frame.tangent.copy(frame.north);
    }
}