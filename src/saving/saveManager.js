import {cameraController} from '../camera/camera.js';
import {buildMode} from '../input/buildMode.js';
import {constructionDisplay} from '../render/constructionDisplay.js';
import {conveyorItems} from '../render/conveyorItems.js';
import {constructionState} from '../simulation/constructionState.js';
import {simulation} from '../simulation/simulation.js';
import {buildingInspector} from '../ui/buildingInspector.js';
import {buildMessage} from '../ui/elements.js';
import {outputPortSelector} from '../ui/outputPortSelector.js';
import {applySaveData, createSaveData} from './saveData.js';
import {benchmark} from "../performance/benchmark.js";

const SAVE_KEY = 'fnxfhypercubesave';

export const saveManager = {
    autosaveTimer: 0,
    load,
    autosave
};

window.addEventListener('keydown', handleKeyDown);

function load() {
    let rawSave = null;

    try {
        rawSave = localStorage.getItem(SAVE_KEY);
    } catch (error) {
        buildMessage.textContent = 'WARNING: Load failed! Check the console please :)';
        console.warn(error);
    }

    if (!rawSave) return 'missing';

    try {
        applySaveData(JSON.parse(rawSave));
        benchmark.clear();
        resetRuntimeUi();
        constructionDisplay.rebuild();
        conveyorItems.reset();
    } catch (error) {
        benchmark.clear();
        resetWorld();
        buildMessage.textContent = 'WARNING: Your save is invalid!';
        console.warn(error);
    }
}

function autosave(delta) {
    if (benchmark.active) return;

    saveManager.autosaveTimer += delta;
    if (saveManager.autosaveTimer < 10) return;

    saveManager.autosaveTimer = 0;
    save(false);
}

function save(showMessage = true) {
    if (benchmark.active) {
        if (showMessage) buildMessage.textContent = 'Benchmark worlds cannot be saved';
        return false;
    }

    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(createSaveData()));
        saveManager.autosaveTimer = 0;

        if (showMessage) buildMessage.textContent = 'Game saved';

        return true;
    } catch (error) {
        if (showMessage) buildMessage.textContent = 'WARNING: Save failed! Check the console please :)';
        console.warn(error);
        return false;
    }
}

function newGame() {
    if (!window.confirm('Start a new game?')) return false;

    try {
        localStorage.removeItem(SAVE_KEY);
    } catch (error) {
        console.error(error);
        return false;
    }

    resetWorld();
    benchmark.clear();
    buildMessage.textContent = 'Save deleted';
    return true;
}

function resetWorld() {
    saveManager.autosaveTimer = 0;
    constructionState.clear();
    simulation.reset();
    cameraController.resetView();
    resetRuntimeUi();
    constructionDisplay.rebuild();
    conveyorItems.reset();
}

function resetRuntimeUi() {
    buildMode.clearSelection();
    buildingInspector.clear();
    outputPortSelector.hide();
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();

    if (!event.ctrlKey) return;

    if (key === 's') {
        event.preventDefault();
        save();
        return;
    }

    if (key === 'r') {
        event.preventDefault();
        newGame();
    }
}