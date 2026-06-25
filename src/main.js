import * as THREE from 'three';
import {
  createCamera,
  createCameraController,
} from './camera/createCamera.js';
import { createMoon } from './moon/createMoon.js';
import {
  createRenderer,
  resizeRenderer,
} from './render/createRenderer.js';
import { createScene } from './render/createScene.js';
import './styles.css';

const gameCanvas = document.getElementById('gameCanvas');
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(gameCanvas);
const moon = createMoon();
const cameraController = createCameraController(camera, gameCanvas, moon);
const clock = new THREE.Clock();

scene.add(moon);

function render() {
  const delta = Math.min(clock.getDelta(), 0.05);

  resizeRenderer(renderer, camera, gameCanvas);
  cameraController.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();