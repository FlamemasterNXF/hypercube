import {constructionState} from './constructionState.js';
import {BUILDING_STATUS} from './buildingSimulation.js';
import {addEntries, addResource, canAddEntries, canAddResource, canTakeEntries, getAmount, takeEntries, takeResource} from './buffers.js';
import {getNeighborCell, getOppositeDirection, rotateDirection} from './directions.js';

export const TICKS_PER_SECOND = 10;

export const simulation = {
    accumulator: 0,
    speed: 1,
    paused: false,
    tick: 0,
    update
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

    for (const building of constructionState.simulatedBuildings) {
        updateBuilding(building);
    }

    transferConveyorOutputs();
    moveConveyorItems();
    transferBuildingOutputs();
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

    if (!canAddResource(building.simulation.outputBuffer, extraction.resource, extraction.amount)) {
        building.simulation.status = BUILDING_STATUS.full;
        return;
    }

    building.simulation.progressTicks += 1;
    building.simulation.status = BUILDING_STATUS.working;

    if (building.simulation.progressTicks < extraction.cycleTicks) return;

    addResource(building.simulation.outputBuffer, extraction.resource, extraction.amount);
    building.simulation.progressTicks = 0;
}

function updateRecipe(building) {
    if (building.simulation.progressTicks === 0) {
        if (!canAddEntries(building.simulation.outputBuffer, building.simulation.recipeOutputs)) {
            building.simulation.status = BUILDING_STATUS.full;
            return;
        }

        if (!canTakeEntries(building.simulation.inputBuffer, building.simulation.recipeInputs)) {
            building.simulation.status = BUILDING_STATUS.lacking;
            return;
        }

        takeEntries(building.simulation.inputBuffer, building.simulation.recipeInputs);
    } else if (building.simulation.progressTicks === building.simulation.recipe.cycleTicks - 1 && !canAddEntries(building.simulation.outputBuffer, building.simulation.recipeOutputs)) {
        building.simulation.status = BUILDING_STATUS.full;
        return;
    }

    building.simulation.progressTicks += 1;
    building.simulation.status = BUILDING_STATUS.working;

    if (building.simulation.progressTicks < building.simulation.recipe.cycleTicks) return;

    addEntries(building.simulation.outputBuffer, building.simulation.recipeOutputs);
    building.simulation.progressTicks = 0;
}

function transferConveyorOutputs() {
    for (const building of constructionState.conveyorBuildings) {
        const slots = building.simulation.conveyor.slots;
        const resource = slots[slots.length - 1];

        if (!resource) continue;
        if (!transferToNextCell(building, building.rotation, resource)) continue;

        slots[slots.length - 1] = null;
    }
}

function moveConveyorItems() {
    for (const building of constructionState.conveyorBuildings) {
        const slots = building.simulation.conveyor.slots;

        for (let i = slots.length - 1; i > 0; i -= 1) {
            if (slots[i] || !slots[i - 1]) continue;

            slots[i] = slots[i - 1];
            slots[i - 1] = null;
        }
    }
}

function transferBuildingOutputs() {
    for (const building of constructionState.outputBuildings) {
        for (const relativeDirection of building.simulation.outputDirections) {
            const direction = rotateDirection(building.rotation, relativeDirection);

            if (transferOneBuildingOutput(building, direction)) break;
        }
    }
}

function transferOneBuildingOutput(building, direction) {
    const resources = building.simulation.transferableOutputs ?? Object.keys(building.simulation.outputBuffer.contents);

    for (const resource of resources) {
        if (getAmount(building.simulation.outputBuffer, resource) <= 0) continue;
        if (!transferToNextCell(building, direction, resource)) continue;

        takeResource(building.simulation.outputBuffer, resource, 1);
        return true;
    }

    return false;
}

function transferToNextCell(building, direction, resource) {
    const targetCell = getNeighborCell(building, direction);

    if (!targetCell) return false;

    const target = constructionState.getBuilding(constructionState.getCellKey(targetCell));
    const incomingDirection = getOppositeDirection(direction);

    if (!target) return false;
    if (target.simulation.conveyor) return transferToConveyor(target, incomingDirection, resource);

    return transferToBuilding(target, incomingDirection, resource);
}

function transferToConveyor(building, incomingDirection, resource) {
    if (building.simulation.conveyor.inputDirection !== incomingDirection) return false;
    if (building.simulation.conveyor.slots[0]) return false;

    building.simulation.conveyor.slots[0] = resource;
    return true;
}

function transferToBuilding(building, incomingDirection, resource) {
    const acceptsDirection = building.simulation.inputDirections.some((relativeDirection) => {
        return rotateDirection(building.rotation, relativeDirection) === incomingDirection;
    });

    if (!acceptsDirection) return false;
    if (!canAddResource(building.simulation.inputBuffer, resource, 1)) return false;

    addResource(building.simulation.inputBuffer, resource, 1);
    return true;
}