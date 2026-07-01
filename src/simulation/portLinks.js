import {constructionState} from './constructionState.js';
import {getNeighborCell, getOppositeDirection} from './directions.js';
import {getMatchingInputPorts, getPortDirection} from './ports.js';

export function connectConveyorDirection(conveyor, direction) {
    if (!isConveyor(conveyor)) return false;
    if (!isValidDirection(direction)) return false;

    conveyor.simulation.conveyor.connections[direction] = true;
    conveyor.simulation.conveyor.portLinks[direction] = null;
    return true;
}

export function disconnectConveyorDirection(conveyor, direction) {
    if (!isConveyor(conveyor)) return false;
    if (!isValidDirection(direction)) return false;

    conveyor.simulation.conveyor.connections[direction] = false;
    conveyor.simulation.conveyor.portLinks[direction] = null;
    return true;
}

export function setOnlyConveyorDirections(conveyor, firstDirection, secondDirection) {
    if (!isConveyor(conveyor)) return false;
    if (!isValidDirection(firstDirection)) return false;
    if (!isValidDirection(secondDirection)) return false;

    for (let i = 0; i < 4; i++) {
        disconnectConveyorDirection(conveyor, i);
    }

    connectConveyorDirection(conveyor, firstDirection);
    connectConveyorDirection(conveyor, secondDirection);
    return true;
}

export function setInputPortLink(conveyor, direction, building, portIndex) {
    if (!isValidInputPortLink(conveyor, direction, building, portIndex)) return false;

    conveyor.simulation.conveyor.connections[direction] = true;
    conveyor.simulation.conveyor.portLinks[direction] = {
        buildingKey: constructionState.getCellKey(building),
        portIndex
    };
    return true;
}

export function resolveInputPortIndex(conveyor, direction, building, incomingDirection) {
    const link = getInputPortLink(conveyor, direction);

    if (!link) return getAutomaticInputPortIndex(building, incomingDirection);

    if (isValidInputPortLink(conveyor, direction, building, link.portIndex)) {
        return link.portIndex;
    }

    conveyor.simulation.conveyor.portLinks[direction] = null;
    return getAutomaticInputPortIndex(building, incomingDirection);
}

export function getAutomaticInputPortIndex(building, incomingDirection) {
    const ports = getMatchingInputPorts(building, incomingDirection);
    return ports.length === 1 ? ports[0] : null;
}

export function disconnectLinksToBuilding(building) {
    if (!building) return false;

    const key = constructionState.getCellKey(building);
    let changed = false;

    for (let i = 0; i < 4; i++) {
        const cell = getNeighborCell(building, i);

        if (!cell) continue;

        const neighbor = constructionState.getBuilding(constructionState.getCellKey(cell));

        if (!isConveyor(neighbor)) continue;

        const direction = getOppositeDirection(i);
        const link = getInputPortLink(neighbor, direction);

        if (link?.buildingKey !== key) continue;

        disconnectConveyorDirection(neighbor, direction);
        changed = true;
    }

    return changed;
}

function getInputPortLink(conveyor, direction) {
    if (!isConveyor(conveyor)) return null;
    if (!isValidDirection(direction)) return null;

    return conveyor.simulation.conveyor.portLinks[direction];
}

function isValidInputPortLink(conveyor, direction, building, portIndex) {
    if (!isConveyor(conveyor)) return false;
    if (building?.simulation.conveyor) return false;
    if (!isValidDirection(direction)) return false;

    const targetCell = getNeighborCell(conveyor, direction);

    if (!targetCell) return false;
    if (constructionState.getCellKey(targetCell) !== constructionState.getCellKey(building)) return false;

    const port = building.simulation.inputPorts[portIndex];

    if (!port) return false;

    return getPortDirection(building, port) === getOppositeDirection(direction);
}

function isConveyor(building) {
    return Boolean(building?.simulation.conveyor);
}

function isValidDirection(direction) {
    return Number.isInteger(direction) && direction >= 0 && direction < 4;
}