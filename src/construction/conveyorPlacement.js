import {constructionState} from '../simulation/constructionState.js';
import {getDirectionBetween, getNeighborCell, getOppositeDirection} from '../simulation/directions.js';
import {findPortAtScreenPosition} from './portLayout.js';
import {connectConveyorDirection, disconnectConveyorDirection, disconnectLinksToBuilding, getAutomaticInputPortIndex, setInputPortLink, setOnlyConveyorDirections} from '../simulation/portLinks.js';
import {getMatchingInputPorts, PORT_TYPE} from '../simulation/ports.js';

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
    getInputPortTarget,
    linkToInputPort,
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
    connectAdjacentInputPorts(building);
    conveyorPlacement.lastCell = cell;
    markTopologyChanged();
}

function getInputPortTarget(type, pointerHeld, cell, x, y, camera, bounds) {
    if (!isConveyor(type)) return null;
    if (!pointerHeld || !conveyorPlacement.lastCell) return null;

    const direction = getDirectionBetween(conveyorPlacement.lastCell, cell);

    if (direction === null) return null;

    const conveyor = constructionState.getBuilding(constructionState.getCellKey(conveyorPlacement.lastCell));
    const building = constructionState.getBuilding(constructionState.getCellKey(cell));

    if (!conveyor?.simulation.conveyor) return null;
    if (!building || building.simulation.conveyor) return null;

    const incomingDirection = getOppositeDirection(direction);
    const ports = getMatchingInputPorts(building, incomingDirection);

    if (ports.length === 0) return null;

    if (ports.length === 1) {
        return {
            conveyor,
            direction,
            building,
            portIndex: ports[0]
        };
    }

    const portIndex = findPortAtScreenPosition(building, PORT_TYPE.input, x, y, camera, bounds, 20, incomingDirection);

    if (portIndex === null) return null;

    return {
        conveyor,
        direction,
        building,
        portIndex
    };
}

function linkToInputPort(target) {
    if (!target) return false;

    shapePreviousConveyor(target.direction);
    if (!setInputPortLink(target.conveyor, target.direction, target.building, target.portIndex)) return false;

    markTopologyChanged();
    return true;
}

function shapePreviousConveyor(direction) {
    const previousKey = constructionState.getCellKey(conveyorPlacement.lastCell);
    const previousBuilding = constructionState.getBuilding(previousKey);

    if (!previousBuilding?.simulation.conveyor) return;

    const previousForwardDirection = previousBuilding.rotation;
    const incomingDirection = conveyorPlacement.lastIncomingDirection ?? getOppositeDirection(direction);

    if (conveyorPlacement.lastIncomingDirection === null) {
        setOnlyConveyorDirections(previousBuilding, incomingDirection, direction);
    } else {
        disconnectConveyorDirection(previousBuilding, previousForwardDirection);
        connectConveyorDirection(previousBuilding, incomingDirection);
        connectConveyorDirection(previousBuilding, direction);
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

    setOnlyConveyorDirections(building, incomingDirection, direction);
    conveyorPlacement.lastIncomingDirection = incomingDirection;
}

function connectAdjacentConveyors(building) {
    for (let i = 0; i < 4; i++) {
        const neighbor = getAdjacentConveyor(building, i);

        if (!neighbor) continue;

        connectConveyorDirection(building, i);
        connectConveyorDirection(neighbor, getOppositeDirection(i));
    }
}

function connectAdjacentInputPorts(building) {
    for (let i = 0; i < 4; i++) {
        const targetCell = getNeighborCell(building, i);

        if (!targetCell) continue;

        const target = constructionState.getBuilding(constructionState.getCellKey(targetCell));

        if (!target || target.simulation.conveyor) continue;

        const portIndex = getAutomaticInputPortIndex(target, getOppositeDirection(i));

        if (portIndex === null) continue;
        if (!setInputPortLink(building, i, target, portIndex)) continue;

        markTopologyChanged();
    }
}

function disconnect(building) {
    if (!building?.simulation.conveyor) {
        if (disconnectLinksToBuilding(building)) markTopologyChanged();
        return;
    }

    for (let i = 0; i < 4; i++) {
        const neighbor = getAdjacentConveyor(building, i);
        if (neighbor) {
            disconnectConveyorDirection(neighbor, getOppositeDirection(i));
        }

        disconnectConveyorDirection(building, i);
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

function markBuildingChanged(building) {
    if (conveyorPlacement.changedBuildings.includes(building)) return;

    conveyorPlacement.changedBuildings.push(building);
}

function markTopologyChanged() {
    conveyorPlacement.topologyChanged = true;
}