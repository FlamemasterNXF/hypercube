import * as THREE from 'three';
import {gameCanvas} from '../ui/elements.js';
import {MOON_RADIUS, moon} from '../moon/moon.js';
import {normalToSphericalCell} from '../moon/sphericalCoordinates.js';

const LOCAL_MIN_DISTANCE = 0.45;
const PLANETARY_THRESHOLD = 2;
const PLANETARY_DISTANCE = 5.8;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0, MOON_RADIUS + PLANETARY_DISTANCE);
camera.lookAt(0, 0, 0);

export const cameraController = {
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(2, 2),
    keys: new Set(),
    targetDirection: camera.position.clone().normalize(),
    currentDirection: camera.position.clone().normalize(),
    north: new THREE.Vector3(),
    east: new THREE.Vector3(),
    lookTarget: new THREE.Vector3(),
    targetDistance: PLANETARY_DISTANCE,
    currentDistance: PLANETARY_DISTANCE,
    planetary: true,
    dragging: false,
    previousX: 0,
    previousY: 0,
    hoveredCell: null,
    buildMode: false,
    setBuildMode,
    update
};

gameCanvas.addEventListener('pointerdown', handlePointerDown);
gameCanvas.addEventListener('pointermove', handlePointerMove);
gameCanvas.addEventListener('pointerup', handlePointerUp);
gameCanvas.addEventListener('pointerleave', handlePointerLeave);
gameCanvas.addEventListener('wheel', handleWheel, {passive: false});
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

function handlePointerDown(event) {
    if (cameraController.buildMode) return;

    cameraController.dragging = true;
    cameraController.previousX = event.clientX;
    cameraController.previousY = event.clientY;
    gameCanvas.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
    updatePointer(event);

    if (cameraController.buildMode || !cameraController.dragging) return;

    const distanceScale = 0.00045 * cameraController.currentDistance;
    pan(event.clientX - cameraController.previousX, event.clientY - cameraController.previousY, distanceScale);
    cameraController.previousX = event.clientX;
    cameraController.previousY = event.clientY;
}

function handlePointerUp(event) {
    cameraController.dragging = false;

    if (gameCanvas.hasPointerCapture(event.pointerId)) gameCanvas.releasePointerCapture(event.pointerId);
}

function handlePointerLeave() {
    cameraController.pointer.set(2, 2);
}

function handleWheel(event) {
    event.preventDefault();

    if (cameraController.planetary && event.deltaY < 0) {
        cameraController.planetary = false;
        cameraController.targetDistance = PLANETARY_THRESHOLD - 0.2;
        return;
    }

    cameraController.targetDistance += event.deltaY * 0.004;

    if (cameraController.targetDistance >= PLANETARY_THRESHOLD) {
        cameraController.planetary = true;
        cameraController.targetDistance = PLANETARY_DISTANCE;
    } else {
        cameraController.targetDistance = Math.max(cameraController.targetDistance, LOCAL_MIN_DISTANCE);
    }
}

function handleKeyDown(event) {
    if ('wasd'.includes(event.key.toLowerCase())) {
        cameraController.keys.add(event.key.toLowerCase());
        event.preventDefault();
    }
}

function handleKeyUp(event) {
    cameraController.keys.delete(event.key.toLowerCase());
}

function update(delta) {
    const movementX = Number(cameraController.keys.has('d')) - Number(cameraController.keys.has('a'));
    const movementY = Number(cameraController.keys.has('w')) - Number(cameraController.keys.has('s'));

    if (movementX || movementY) {
        pan(-movementX, movementY, delta * (0.18 + cameraController.currentDistance * 0.08));
    }

    const directionDamping = 1 - Math.exp(-10 * delta);
    const distanceDamping = 1 - Math.exp(-8 * delta);
    cameraController.currentDirection.lerp(cameraController.targetDirection, directionDamping).normalize();
    cameraController.currentDistance = THREE.MathUtils.lerp(
        cameraController.currentDistance,
        cameraController.targetDistance,
        distanceDamping
    );

    const planetaryBlend = THREE.MathUtils.smoothstep(
        cameraController.currentDistance,
        PLANETARY_THRESHOLD,
        PLANETARY_DISTANCE
    );

    camera.position.copy(cameraController.currentDirection).multiplyScalar(MOON_RADIUS + cameraController.currentDistance);

    getTangentAxes(cameraController.currentDirection);
    camera.up.copy(cameraController.north);
    cameraController.lookTarget.copy(cameraController.currentDirection).multiplyScalar(MOON_RADIUS * (1 - planetaryBlend));
    camera.lookAt(cameraController.lookTarget);

    cameraController.raycaster.setFromCamera(cameraController.pointer, camera);
    const intersection = cameraController.raycaster.intersectObject(moon, false)[0];
    cameraController.hoveredCell = intersection
        ? normalToSphericalCell(intersection.point.normalize())
        : null;
}

function updatePointer(event) {
    const bounds = gameCanvas.getBoundingClientRect();
    cameraController.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    cameraController.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function pan(deltaX, deltaY, speed) {
    getTangentAxes(cameraController.targetDirection);
    cameraController.targetDirection
        .addScaledVector(cameraController.east, -deltaX * speed)
        .addScaledVector(cameraController.north, deltaY * speed)
        .normalize();
}

function setBuildMode(active) {
    cameraController.buildMode = active;
    cameraController.dragging = false;
}

function getTangentAxes(direction) {
    cameraController.north.copy(WORLD_UP).addScaledVector(
        direction,
        -WORLD_UP.dot(direction)
    );

    if (cameraController.north.lengthSq() < 0.0001) {
        cameraController.north.set(0, 0, 1);
    }

    cameraController.north.normalize();
    cameraController.east.crossVectors(cameraController.north, direction).normalize();
}