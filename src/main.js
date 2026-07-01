import * as THREE from 'three';
import {camera, cameraController} from './camera/camera.js';
import './input/buildingInspection.js';
import {buildMode} from './input/buildMode.js';
import {constructionGrid} from './moon/constructionGrid.js';
import {moon} from './moon/moon.js';
import {constructionDisplay} from './render/constructionDisplay.js';
import {conveyorItems} from './render/conveyorItems.js';
import {placementGhost} from './render/placementGhost.js';
import {renderer, resizeRenderer} from './render/renderer.js';
import {scene} from './render/scene.js';
import {saveManager} from './saving/saveManager.js';
import {simulation} from './simulation/simulation.js';
import {buildingInspector} from './ui/buildingInspector.js';
import {outputPortSelector} from './ui/outputPortSelector.js';
import './styles.css';

const clock = new THREE.Clock();

constructionDisplay.addPlacementGhost(placementGhost.mesh);
scene.add(moon);
scene.add(constructionGrid);
scene.add(constructionDisplay.group);
scene.add(conveyorItems.group);

saveManager.load();

function render() {
    const delta = Math.min(clock.getDelta(), 0.05);

    resizeRenderer(camera);
    cameraController.update(delta);
    simulation.update(delta);
    saveManager.autosave(delta);
    buildMode.update();
    buildingInspector.update(simulation.tick);
    outputPortSelector.update(simulation.tick);
    constructionDisplay.update();
    constructionDisplay.setLocalDetailVisible(!cameraController.planetary);
    conveyorItems.update(!cameraController.planetary, simulation.tick);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

render();