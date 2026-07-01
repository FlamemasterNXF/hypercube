import {cameraController} from '../camera/camera.js';
import {buildMode} from '../input/buildMode.js';
import {getLongitudeCellCount, LATITUDE_CELLS} from '../moon/sphericalCoordinates.js';
import {constructionDisplay} from '../render/constructionDisplay.js';
import {conveyorItems} from '../render/conveyorItems.js';
import {constructionState} from '../simulation/constructionState.js';
import {DIRECTION} from '../simulation/directions.js';
import {simulation} from '../simulation/simulation.js';
import {buildingInspector} from '../ui/buildingInspector.js';
import {buildMessage} from '../ui/elements.js';
import {outputPortSelector} from '../ui/outputPortSelector.js';

const START_LATITUDE = Math.floor(LATITUDE_CELLS * 0.35);

export const benchmark = {
    active: false,
    size: 0,
    clear,
    generate
};

function clear() {
    benchmark.active = false;
    benchmark.size = 0;
}

function generate(size) {
    resetWorld();
    placeBuildings(size);
    constructionDisplay.rebuild();
    conveyorItems.reset();
    benchmark.active = true;
    benchmark.size = size;
    buildMessage.textContent = `Benchmark world: ${size} buildings`;
}

function resetWorld() {
    constructionState.clear();
    simulation.reset();
    cameraController.resetView();
    buildMode.clearSelection();
    buildingInspector.clear();
    outputPortSelector.hide();
}

function placeBuildings(size) {
    let placed = 0;
    let latitude = START_LATITUDE;

    while (placed < size && latitude < LATITUDE_CELLS) {
        const longitudeCells = getLongitudeCellCount(latitude);

        for (let longitude = 0; longitude < longitudeCells && placed < size; longitude++) {
            const building = constructionState.addBuilding(getBenchmarkType(placed), {latitude, longitude}, DIRECTION.east);

            if (building) placed++;
        }

        latitude++;
    }

    if (placed !== size) throw new Error(`Only placed ${placed} of ${size} benchmark buildings`);
}

function getBenchmarkType(i) {
    const slot = i % 20;

    if (slot === 0) return 'miner';
    if (slot === 19) return 'storage';
    return 'conveyor';
}