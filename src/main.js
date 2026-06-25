import { createCamera } from './camera/createCamera.js';
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

scene.add(moon);

function render() {
  resizeRenderer(renderer, camera, gameCanvas);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();