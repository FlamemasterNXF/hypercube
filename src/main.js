import * as THREE from 'three';
import {camera, cameraController} from './camera/camera.js';
import './input/buildingInspection.js';
import {buildMode} from './input/buildMode.js';
import {constructionGrid} from './moon/constructionGrid.js';
import {moon} from './moon/moon.js';
import {performanceInfo} from './performance/performanceInfo.js';
import {performancePanel} from './performance/performancePanel.js';
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

function main() {
    const delta = Math.min(clock.getDelta(), 0.05);

    // Perf
    performanceInfo.beginFrame();

    // Camera
    resizeRenderer(camera);
    cameraController.update(delta);

    // Simulation
    const simulationStart = performance.now();
    simulation.update(delta);
    performanceInfo.recordSimulation(performance.now() - simulationStart);

    // Autosave
    saveManager.autosave(delta);

    // UI
    buildMode.update();
    buildingInspector.update(simulation.tick);
    outputPortSelector.update(simulation.tick);
    constructionDisplay.update();
    constructionDisplay.setLocalDetailVisible(!cameraController.planetary);
    conveyorItems.update(!cameraController.planetary, simulation.tick);
    performancePanel.update(delta);

    // Render
    const renderStart = performance.now();
    renderer.render(scene, camera);
    performanceInfo.recordRender(performance.now() - renderStart, renderer);

    requestAnimationFrame(main);
}

main();