import * as THREE from 'three';
import {camera, cameraController} from './camera/camera.js';
import {buildMode} from './input/buildMode.js';
import {constructionGrid} from './moon/constructionGrid.js';
import {moon} from './moon/moon.js';
import {buildingMarkers} from './render/buildingMarkers.js';
import {renderer, resizeRenderer} from './render/renderer.js';
import {scene} from './render/scene.js';
import './styles.css';

const clock = new THREE.Clock();

scene.add(moon);
scene.add(constructionGrid);
scene.add(buildingMarkers.group);

function render() {
    const delta = Math.min(clock.getDelta(), 0.05);

    resizeRenderer(camera);
    cameraController.update(delta);
    buildMode.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

render();