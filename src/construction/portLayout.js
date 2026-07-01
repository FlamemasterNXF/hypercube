import * as THREE from 'three';
import {CONSTRUCTION_MARKER_RADIUS} from '../render/markerPlacement.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {DIRECTION} from '../simulation/directions.js';
import {getBuildingCenter, getBuildingFootprint} from '../simulation/buildingFootprints.js';
import {getPortLayoutEntries} from '../simulation/ports.js';
import {getPortSocketLayout} from './footprintLayout.js';

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
        depth: 0,
        size: {}
    };
}

export function setPortFrame(building, type, portIndex, frame) {
    const entry = getPortLayoutEntries(building, type)[portIndex];

    if (!entry) return false;

    setPortLayoutEntryFrame(building, entry, frame);
    return true;
}

export function setPortLayoutEntryFrame(building, entry, frame) {
    const center = getBuildingCenter(building);
    const footprint = getBuildingFootprint(building);

    getSphericalCellFrame(center.latitude, center.longitude, frame.normal, frame.east, frame.north);
    getSphericalCellSize(CONSTRUCTION_MARKER_RADIUS, frame.size);
    setSideVectors(entry.direction, frame);
    setPortPosition(entry, footprint, frame);
}

export function findPortAtScreenPosition(building, type, x, y, camera, bounds, maxDistance, sideFilter = null, allowedIndices = null) {
    const entries = getPortLayoutEntries(building, type);
    let closestIndex = null;
    let closestDistance = maxDistance;

    for (let i = 0; i < entries.length; i++) {
        if (allowedIndices && !allowedIndices.includes(entries[i].portIndex)) continue;
        if (sideFilter !== null && entries[i].direction !== sideFilter) continue;

        setPortLayoutEntryFrame(building, entries[i], searchFrame);

        screenPosition.copy(searchFrame.position).project(camera);

        const screenX = bounds.left + (screenPosition.x + 1) * 0.5 * bounds.width;
        const screenY = bounds.top + (1 - (screenPosition.y + 1) * 0.5) * bounds.height;
        const distance = Math.hypot(screenX - x, screenY - y);

        if (distance <= closestDistance) {
            closestDistance = distance;
            closestIndex = entries[i].portIndex;
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

function setPortPosition(entry, footprint, frame) {
    const socket = getPortSocketLayout(footprint, entry.direction);
    frame.depth = socket.depth;

    frame.position.copy(frame.normal).multiplyScalar(CONSTRUCTION_MARKER_RADIUS).addScaledVector(frame.side, frame.size.width * socket.centerOffset).addScaledVector(frame.tangent, frame.size.width * entry.tangentOffset);
}