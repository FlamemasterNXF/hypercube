import {constructionState} from './constructionState.js';
import {BUILDING_STATUS} from './buildingSimulation.js';
import {addResources, canAdd, canTake, takeResources} from './buffers.js';

export const TICKS_PER_SECOND = 10;

export const simulation = {
    accumulator: 0,
    speed: 1,
    paused: false,
    tick: 0,
    update,
};

function update(delta) {
    if (simulation.paused) return;

    simulation.accumulator += delta * simulation.speed;

    while (simulation.accumulator >= 1 / TICKS_PER_SECOND) {
        tickOnce();
        simulation.accumulator -= 1 / TICKS_PER_SECOND;
    }
}

function tickOnce() {
    simulation.tick += 1;

    for (const building of constructionState.buildings.values()) {
        updateBuilding(building);
    }
}

function updateBuilding(building) {
    if (building.simulation.extraction) {
        updateExtractor(building);
        return;
    }

    if (building.simulation.recipe) {
        updateRecipe(building);
    }
}

function updateExtractor(building) {
    const extraction = building.simulation.extraction;
    const produced = {
        [extraction.resource]: extraction.amount
    };

    if (!canAdd(building.simulation.outputBuffer, produced)) {
        building.simulation.status = BUILDING_STATUS.full;
        return;
    }

    building.simulation.progressTicks += 1;
    building.simulation.status = BUILDING_STATUS.working;

    if (building.simulation.progressTicks < extraction.cycleTicks) return;

    addResources(building.simulation.outputBuffer, produced);
    building.simulation.progressTicks = 0;
}

function updateRecipe(building) {
    const recipe = building.simulation.recipe;
    const bufferedInputs = getBufferedInputs(recipe);

    if (building.simulation.progressTicks === 0) {
        if (!canAdd(building.simulation.outputBuffer, recipe.outputs)) {
            building.simulation.status = BUILDING_STATUS.full;
            return;
        }

        if (!canTake(building.simulation.inputBuffer, bufferedInputs)) {
            building.simulation.status = BUILDING_STATUS.lacking;
            return;
        }

        takeResources(building.simulation.inputBuffer, bufferedInputs);
    } else if (building.simulation.progressTicks === recipe.cycleTicks - 1 && !canAdd(building.simulation.outputBuffer, recipe.outputs)) {
        building.simulation.status = BUILDING_STATUS.full;
        return;
    }

    building.simulation.progressTicks += 1;
    building.simulation.status = BUILDING_STATUS.working;

    if (building.simulation.progressTicks < recipe.cycleTicks) return;

    addResources(building.simulation.outputBuffer, recipe.outputs);
    building.simulation.progressTicks = 0;
}

function getBufferedInputs(recipe) {
    const inputs = {};

    for (const [resource, amount] of Object.entries(recipe.inputs)) {
        if (recipe.debugInputs?.[resource]) continue;
        inputs[resource] = amount;
    }

    return inputs;
}