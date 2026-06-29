import * as THREE from 'three';
import {camera, cameraController} from './camera/camera.js';
import {buildMode} from './input/buildMode.js';
import {constructionGrid} from './moon/constructionGrid.js';
import {moon} from './moon/moon.js';
import {buildingMarkers} from './render/buildingMarkers.js';
import {conveyorItems} from './render/conveyorItems.js';
import {conveyorMarkers} from './render/conveyorMarkers.js';
import {renderer, resizeRenderer} from './render/renderer.js';
import {scene} from './render/scene.js';
import {simulation} from './simulation/simulation.js';
import './styles.css';

const clock = new THREE.Clock();

scene.add(moon);
scene.add(constructionGrid);
scene.add(buildingMarkers.group);
scene.add(conveyorMarkers.group);
scene.add(conveyorItems.group);

function render() {
    const delta = Math.min(clock.getDelta(), 0.05);

    resizeRenderer(camera);
    cameraController.update(delta);
    simulation.update(delta);
    buildMode.update();
    conveyorItems.update(!cameraController.planetary, simulation.tick);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

render();