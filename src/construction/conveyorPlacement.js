import {constructionState} from '../simulation/constructionState.js';
import {getDirectionBetween, getNeighborCell, getOppositeDirection} from '../simulation/directions.js';

const CONVEYOR_TYPE = 'conveyor';

export const conveyorPlacement = {
    lastCell: null,
    lastIncomingDirection: null,
    changedBuildings: [],
    topologyChanged: false,
    reset,
    getAndResetChanges,
    isDisconnected,
    shouldPlaceDuringDrag,
    getPreviewRotation,
    getPlacementRotation,
    completePlacement,
    disconnect
};

function reset() {
    conveyorPlacement.lastCell = null;
    conveyorPlacement.lastIncomingDirection = null;
}

function getAndResetChanges() {
    const changes = {
        buildings: conveyorPlacement.changedBuildings,
        topologyChanged: conveyorPlacement.topologyChanged
    };

    conveyorPlacement.changedBuildings = [];
    conveyorPlacement.topologyChanged = false;
    return changes;
}

function isConveyor(type) {
    return type === CONVEYOR_TYPE;
}

function isDisconnected(type, pointerHeld, cell) {
    if (!isConveyor(type)) return false;
    if (!pointerHeld || !conveyorPlacement.lastCell) return false;

    return getDirectionBetween(conveyorPlacement.lastCell, cell) === null;
}

function shouldPlaceDuringDrag(type, pointerHeld, key, lastPlacedCell) {
    return isConveyor(type) && pointerHeld && key !== lastPlacedCell;
}

function getPreviewRotation(type, defaultRotation, cell) {
    if (!isConveyor(type)) return defaultRotation;
    if (!conveyorPlacement.lastCell) return defaultRotation;

    const direction = getDirectionBetween(conveyorPlacement.lastCell, cell);

    return direction === null ? defaultRotation : direction;
}

function getPlacementRotation(type, defaultRotation, cell) {
    if (!isConveyor(type)) return defaultRotation;
    if (!conveyorPlacement.lastCell) return defaultRotation;

    const direction = getDirectionBetween(conveyorPlacement.lastCell, cell);

    if (direction === null) return defaultRotation;

    shapePreviousConveyor(direction);
    return direction;
}

function completePlacement(type, building, cell) {
    if (!isConveyor(type)) return;

    shapePlacedConveyor(building);
    connectAdjacentConveyors(building);
    conveyorPlacement.lastCell = cell;
    markTopologyChanged();
}

function shapePreviousConveyor(direction) {
    const previousKey = constructionState.getCellKey(conveyorPlacement.lastCell);
    const previousBuilding = constructionState.getBuilding(previousKey);

    if (!previousBuilding?.simulation.conveyor) return;

    const previousForwardDirection = previousBuilding.rotation;
    const incomingDirection = conveyorPlacement.lastIncomingDirection ?? getOppositeDirection(direction);
    const connections = previousBuilding.simulation.conveyor.connections;

    if (conveyorPlacement.lastIncomingDirection === null) {
        setOnlyConnections(previousBuilding, incomingDirection, direction);
    } else {
        connections[previousForwardDirection] = false;
        connections[incomingDirection] = true;
        connections[direction] = true;
    }

    constructionState.setBuildingRotation(previousKey, direction);
    markBuildingChanged(previousBuilding);
    markTopologyChanged();
}

function shapePlacedConveyor(building) {
    if (!conveyorPlacement.lastCell) return;

    const direction = getDirectionBetween(conveyorPlacement.lastCell, building);

    if (direction === null) return;

    const incomingDirection = getOppositeDirection(direction);

    setOnlyConnections(building, incomingDirection, direction);
    conveyorPlacement.lastIncomingDirection = incomingDirection;
}

function connectAdjacentConveyors(building) {
    for (let i = 0; i < 4; i++) {
        const neighbor = getAdjacentConveyor(building, i);

        if (!neighbor) continue;

        building.simulation.conveyor.connections[i] = true;
        neighbor.simulation.conveyor.connections[getOppositeDirection(i)] = true;
    }
}

function disconnect(building) {
    if (!building?.simulation.conveyor) return;

    for (let i = 0; i < 4; i++) {
        const neighbor = getAdjacentConveyor(building, i);
        if (neighbor) neighbor.simulation.conveyor.connections[getOppositeDirection(i)] = false;

        building.simulation.conveyor.connections[i] = false;
    }
    markTopologyChanged();
}

function getAdjacentConveyor(building, direction) {
    const neighborCell = getNeighborCell(building, direction);
    if (!neighborCell) return null;

    const neighbor = constructionState.getBuilding(constructionState.getCellKey(neighborCell));
    if (!neighbor?.simulation.conveyor) return null;

    return neighbor;
}

function setOnlyConnections(building, firstDirection, secondDirection) {
    const connections = building.simulation.conveyor.connections;

    for (let i = 0; i < connections.length; i++) {
        connections[i] = false;
    }

    connections[firstDirection] = true;
    connections[secondDirection] = true;
}

function markBuildingChanged(building) {
    if (conveyorPlacement.changedBuildings.includes(building)) return;

    conveyorPlacement.changedBuildings.push(building);
}

function markTopologyChanged() {
    conveyorPlacement.topologyChanged = true;
}