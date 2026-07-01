import {constructionState} from './constructionState.js';
import {BUILDING_STATUS} from './buildingSimulation.js';
import {addEntries, addResource, canAddEntries, canAddResource, canTakeEntries, getAmount, takeEntries, takeResource} from './buffers.js';
import {getNeighborCell, getOppositeDirection} from './directions.js';
import {getAutomaticInputPortIndex, resolveInputPortIndex} from './portLinks.js';
import {getPortLayoutEntries, PORT_TYPE, transferToInputPort} from './ports.js';

export const TICKS_PER_SECOND = 10;

export const simulation = {
    accumulator: 0,
    speed: 1,
    paused: false,
    tick: 0,
    applySavedState,
    reset,
    update
};

function reset() {
    simulation.accumulator = 0;
    simulation.speed = 1;
    simulation.paused = false;
    simulation.tick = 0;
}

function applySavedState(state) {
    simulation.accumulator = 0;
    simulation.speed = state.speed;
    simulation.paused = state.paused;
    simulation.tick = state.tick;
}

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
        setBuildingStatus(building, BUILDING_STATUS.full);
        return;
    }

    building.simulation.progressTicks += 1;
    setBuildingStatus(building, BUILDING_STATUS.working);

    if (building.simulation.progressTicks < extraction.cycleTicks) return;

    addResource(building.simulation.outputBuffer, extraction.resource, extraction.amount);
    building.simulation.progressTicks = 0;
}

function updateRecipe(building) {
    if (building.simulation.progressTicks === 0) {
        if (!canAddEntries(building.simulation.outputBuffer, building.simulation.recipeOutputs)) {
            setBuildingStatus(building, BUILDING_STATUS.full);
            return;
        }

        if (!canTakeEntries(building.simulation.inputBuffer, building.simulation.recipeInputs)) {
            setBuildingStatus(building, BUILDING_STATUS.lacking);
            return;
        }

        takeEntries(building.simulation.inputBuffer, building.simulation.recipeInputs);
    } else if (building.simulation.progressTicks === building.simulation.recipe.cycleTicks - 1 && !canAddEntries(building.simulation.outputBuffer, building.simulation.recipeOutputs)) {
        setBuildingStatus(building, BUILDING_STATUS.full);
        return;
    }

    building.simulation.progressTicks += 1;
    setBuildingStatus(building, BUILDING_STATUS.working);

    if (building.simulation.progressTicks < building.simulation.recipe.cycleTicks) return;

    addEntries(building.simulation.outputBuffer, building.simulation.recipeOutputs);
    building.simulation.progressTicks = 0;
}

function transferConveyorOutputs() {
    for (const building of constructionState.conveyorBuildings) {
        const slots = building.simulation.conveyor.slots;
        const item = slots[slots.length - 1];

        if (!item) continue;
        if (!transferConveyorItem(building, item)) continue;

        slots[slots.length - 1] = null;
        updateConveyorStatus(building);
    }
}

function transferConveyorItem(building, item) {
    const directions = getConveyorOutputDirections(building, item.incomingDirection);
    const conveyor = building.simulation.conveyor;
    const straightDirection = getOppositeDirection(item.incomingDirection);
    const hasStraightOutput = directions[0] === straightDirection;
    const branchStart = hasStraightOutput ? 1 : 0;

    if (directions.length === 0) return false;
    if (hasStraightOutput && transferToNextCell(building, straightDirection, item.resource, building)) return true;

    const branchCount = directions.length - branchStart;

    for (let i = 0; i < branchCount; i++) {
        const branchIndex = (conveyor.nextOutputDirection + i) % branchCount;
        const direction = directions[branchStart + branchIndex];

        if (!transferToNextCell(building, direction, item.resource, building)) continue;

        conveyor.nextOutputDirection = (branchIndex + 1) % branchCount;
        return true;
    }

    return false;
}

function getConveyorOutputDirections(building, incomingDirection) {
    const directions = [];
    const straightDirection = getOppositeDirection(incomingDirection);
    const connections = building.simulation.conveyor.connections;

    if (connections[straightDirection]) directions.push(straightDirection);

    for (let i = 0; i < connections.length; i++) {
        if (i === incomingDirection || i === straightDirection) continue;
        if (connections[i]) directions.push(i);
    }

    return directions;
}

function moveConveyorItems() {
    for (const building of constructionState.conveyorBuildings) {
        const slots = building.simulation.conveyor.slots;
        let moved = false;

        for (let i = slots.length - 1; i > 0; i--) {
            if (slots[i] || !slots[i - 1]) continue;

            slots[i] = slots[i - 1];
            slots[i - 1] = null;
            moved = true;
        }

        if (moved) updateConveyorStatus(building);
    }
}

function transferBuildingOutputs() {
    for (const building of constructionState.outputBuildings) {
        const entries = getPortLayoutEntries(building, PORT_TYPE.output);

        for (let i = 0; i < entries.length; i++) {
            transferOneBuildingOutput(building, entries[i]);
        }
    }
}

function transferOneBuildingOutput(building, entry) {
    const resource = entry.port.resource;

    if (!resource) return false;
    if (!entry.neighborCell) return false;
    if (getAmount(building.simulation.outputBuffer, resource) <= 0) return false;
    if (!transferToCell(entry.neighborCell, getOppositeDirection(entry.direction), resource)) return false;

    takeResource(building.simulation.outputBuffer, resource, 1);
    return true;
}

function transferToNextCell(building, direction, resource, sourceConveyor = null) {
    const targetCell = getNeighborCell(building, direction);

    if (!targetCell) return false;

    const incomingDirection = getOppositeDirection(direction);

    return transferToCell(targetCell, incomingDirection, resource, sourceConveyor, direction);
}

function transferToCell(targetCell, incomingDirection, resource, sourceConveyor = null, direction = null) {
    const target = constructionState.getBuilding(constructionState.getCellKey(targetCell));

    if (!target) return false;
    if (target.simulation.conveyor) return transferToConveyor(target, incomingDirection, resource);

    return transferToBuilding(target, incomingDirection, resource, sourceConveyor, direction, targetCell);
}

function transferToConveyor(building, incomingDirection, resource) {
    if (!building.simulation.conveyor.connections[incomingDirection]) return false;
    if (building.simulation.conveyor.slots[0]) return false;

    building.simulation.conveyor.slots[0] = {
        resource,
        incomingDirection
    };
    updateConveyorStatus(building);
    return true;
}

function transferToBuilding(building, incomingDirection, resource, sourceConveyor, direction, targetCell) {
    const portIndex = sourceConveyor
        ? resolveInputPortIndex(sourceConveyor, direction, building, incomingDirection, targetCell)
        : getAutomaticInputPortIndex(building, incomingDirection, targetCell);

    return portIndex === null ? false : transferToInputPort(building, portIndex, incomingDirection, resource);
}

function setBuildingStatus(building, status) {
    if (building.simulation.status === status) return;

    building.simulation.status = status;
    constructionState.markStatusChanged(building);
}

function updateConveyorStatus(building) {
    const slots = building.simulation.conveyor.slots;
    let occupiedSlots = 0;

    for (const item of slots) {
        if (item) occupiedSlots++;
    }

    if (occupiedSlots === 0) setBuildingStatus(building, BUILDING_STATUS.idle);
    else if (occupiedSlots === slots.length) setBuildingStatus(building, BUILDING_STATUS.full);
    else setBuildingStatus(building, BUILDING_STATUS.working);
}