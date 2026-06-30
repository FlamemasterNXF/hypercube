import {cameraController} from '../camera/camera.js';
import {gameCanvas} from '../ui/elements.js';
import {constructionState} from '../simulation/constructionState.js';
import {buildingInspector} from '../ui/buildingInspector.js';
import {buildMode} from './buildMode.js';

const CLICK_DISTANCE = 5;

let pointerDownX = 0;
let pointerDownY = 0;
let pointerDownActive = false;

gameCanvas.addEventListener('pointerdown', handlePointerDown);
gameCanvas.addEventListener('pointerup', handlePointerUp);
gameCanvas.addEventListener('pointercancel', handlePointerCancel);

function handlePointerDown(event) {
    if (event.button !== 0) return;
    if (buildMode.activeTool) return;

    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    pointerDownActive = true;
}

function handlePointerUp(event) {
    if (!pointerDownActive) return;

    pointerDownActive = false;

    if (buildMode.activeTool) return;
    if (Math.abs(event.clientX - pointerDownX) > CLICK_DISTANCE) return;
    if (Math.abs(event.clientY - pointerDownY) > CLICK_DISTANCE) return;

    const cell = cameraController.hoveredCell;

    if (!cell) {
        buildingInspector.clear();
        return;
    }

    const key = constructionState.getCellKey(cell);

    if (!constructionState.hasBuilding(key)) {
        buildingInspector.clear();
        return;
    }

    buildingInspector.select(key);
}

function handlePointerCancel() {
    pointerDownActive = false;
}