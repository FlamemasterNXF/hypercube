import * as THREE from 'three';
import { MOON_RADIUS } from '../moon/createMoon.js';
import { normalToCubeCell } from '../moon/surfaceCoordinates.js';

const LOCAL_MIN_DISTANCE = 0.45;
const PLANETARY_THRESHOLD = 3;
const PLANETARY_DISTANCE = 5.8;
const GRID_RESOLUTION = 64;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, MOON_RADIUS + PLANETARY_DISTANCE);
  camera.lookAt(0, 0, 0);

  return camera;
}

export function createCameraController(camera, canvas, moon) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(2, 2);
  const keys = new Set();
  const targetDirection = camera.position.clone().normalize();
  const currentDirection = targetDirection.clone();
  const north = new THREE.Vector3();
  const east = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let targetDistance = PLANETARY_DISTANCE;
  let currentDistance = PLANETARY_DISTANCE;
  let planetary = true;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  let hoveredCell = null;

  function updatePointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  }

  function pan(deltaX, deltaY, speed) {
    getTangentAxes(targetDirection, north, east);
    targetDirection
      .addScaledVector(east, -deltaX * speed)
      .addScaledVector(north, deltaY * speed)
      .normalize();
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    updatePointer(event);

    if (!dragging) return;

    const distanceScale = 0.00045 * currentDistance;
    pan(event.clientX - previousX, event.clientY - previousY, distanceScale);
    previousX = event.clientX;
    previousY = event.clientY;
  });

  canvas.addEventListener('pointerup', (event) => {
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.set(2, 2);
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    if (planetary && event.deltaY < 0) {
      planetary = false;
      targetDistance = PLANETARY_THRESHOLD - 0.2;
      return;
    }

    targetDistance += event.deltaY * 0.004;

    if (targetDistance >= PLANETARY_THRESHOLD) {
      planetary = true;
      targetDistance = PLANETARY_DISTANCE;
    } else {
      targetDistance = Math.max(targetDistance, LOCAL_MIN_DISTANCE);
    }
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if ('wasd'.includes(event.key.toLowerCase())) {
      keys.add(event.key.toLowerCase());
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });

  function update(delta) {
    const movementX = Number(keys.has('d')) - Number(keys.has('a'));
    const movementY = Number(keys.has('w')) - Number(keys.has('s'));

    if (movementX || movementY) {
      pan(-movementX, movementY, delta * (0.18 + currentDistance * 0.08));
    }

    const directionDamping = 1 - Math.exp(-10 * delta);
    const distanceDamping = 1 - Math.exp(-8 * delta);
    currentDirection.lerp(targetDirection, directionDamping).normalize();
    currentDistance = THREE.MathUtils.lerp(
      currentDistance,
      targetDistance,
      distanceDamping,
    );

    const planetaryBlend = THREE.MathUtils.smoothstep(
      currentDistance,
      PLANETARY_THRESHOLD,
      PLANETARY_DISTANCE,
    );

    camera.position
      .copy(currentDirection)
      .multiplyScalar(MOON_RADIUS + currentDistance);

    getTangentAxes(currentDirection, north, east);
    camera.up.copy(north);
    lookTarget
      .copy(currentDirection)
      .multiplyScalar(MOON_RADIUS * (1 - planetaryBlend));
    camera.lookAt(lookTarget);

    raycaster.setFromCamera(pointer, camera);
    const intersection = raycaster.intersectObject(moon, false)[0];
    hoveredCell = intersection
      ? normalToCubeCell(intersection.point.normalize(), GRID_RESOLUTION)
      : null;
  }

  return {
    get hoveredCell() {
      return hoveredCell;
    },
    update,
  };
}

function getTangentAxes(direction, north, east) {
  north.copy(WORLD_UP).addScaledVector(
    direction,
    -WORLD_UP.dot(direction),
  );

  if (north.lengthSq() < 0.0001) {
    north.set(0, 0, 1);
  }

  north.normalize();
  east.crossVectors(north, direction).normalize();
}