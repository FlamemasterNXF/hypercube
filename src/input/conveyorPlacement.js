import {buildingMarkers} from '../render/buildingMarkers.js';
import {constructionState} from '../simulation/constructionState.js';
import {getDirectionBetween, getOppositeDirection} from '../simulation/directions.js';

const CONVEYOR_TYPE = 'conveyor';

export const conveyorPlacement = {
    lastCell: null,
    reset,
    isDisconnected,
    shouldPlaceDuringDrag,
    getPreviewRotation,
    getPlacementRotation,
    completePlacement
};

function reset() {
    conveyorPlacement.lastCell = null;
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

    rotatePreviousConveyor(direction);
    return direction;
}

function completePlacement(type, building, cell) {
    if (!isConveyor(type)) return;

    setInputDirection(building);
    conveyorPlacement.lastCell = cell;
}

function rotatePreviousConveyor(direction) {
    const previousKey = constructionState.getCellKey(conveyorPlacement.lastCell);
    const previousBuilding = constructionState.setBuildingRotation(previousKey, direction);

    if (previousBuilding) buildingMarkers.update(previousBuilding);
}

function setInputDirection(building) {
    if (!conveyorPlacement.lastCell) return;

    const inputDirection = getDirectionBetween(conveyorPlacement.lastCell, building);

    if (inputDirection !== null) {
        building.simulation.conveyor.inputDirection = getOppositeDirection(inputDirection);
    }
}