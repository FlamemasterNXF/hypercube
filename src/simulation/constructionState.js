import {BUILDING_DATA} from '../data/buildings.js';
import {getLongitudeCellCount, LATITUDE_CELLS} from '../moon/sphericalCoordinates.js';
import {getFootprintCellKey, getFootprintCells, getPlacedFootprint} from './buildingFootprints.js';
import {initBuildingSimulation} from './buildingSimulation.js';

const buildings = new Map();
const occupiedCells = new Map();
const buildingsByType = Object.fromEntries(Object.keys(BUILDING_DATA).map((type) => [type, []]));

export const constructionState = {
    buildingsByType,
    conveyorBuildings: [],
    outputBuildings: [],
    simulatedBuildings: [],
    statusChangedBuildings: [],
    addBuilding,
    canPlaceBuilding,
    clear,
    getAndResetStatusChangedBuildings,
    getBuilding,
    getBuildings,
    getCellKey,
    hasBuilding,
    markStatusChanged,
    removeBuilding,
    setBuildingRotation
};

function addBuilding(type, cell, rotation) {
    if (!BUILDING_DATA[type]) return null;
    if (!isValidCell(cell)) return null;
    if (!isValidRotation(rotation)) return null;

    const cells = getFootprintCells(type, cell, rotation);
    if (!cells || hasOccupancyConflict(cells)) return null;

    const key = getAnchorKey(cell);
    const typeBuildings = buildingsByType[type];
    const building = {
        type,
        key,
        latitude: cell.latitude,
        longitude: cell.longitude,
        rotation,
        cells,
        typeIndex: typeBuildings.length,
        conveyorIndex: null,
        outputIndex: null,
        simulatedIndex: null,
        statusChangeIndex: null,
        statusMarkerIndex: null,
        statusMarkerStatus: null,
        simulation: initBuildingSimulation(type, rotation)
    };

    addOccupancy(building);
    typeBuildings.push(building);
    addToBuildingCollection(building);
    return building;
}

function clear() {
    buildings.clear();
    occupiedCells.clear();

    for (const type of Object.keys(buildingsByType)) {
        buildingsByType[type] = [];
    }

    constructionState.conveyorBuildings = [];
    constructionState.outputBuildings = [];
    constructionState.simulatedBuildings = [];
    constructionState.statusChangedBuildings = [];
}

function canPlaceBuilding(type, cell, rotation) {
    if (!BUILDING_DATA[type]) return false;
    if (!isValidCell(cell)) return false;
    if (!isValidRotation(rotation)) return false;

    const cells = getFootprintCells(type, cell, rotation);

    if (!cells) return false;
    return !hasOccupancyConflict(cells);
}

function removeBuilding(key) {
    const building = getOccupiedBuilding(key);

    if (!building) return null;

    const typeBuildings = buildingsByType[building.type];
    const removedIndex = building.typeIndex;
    const lastBuilding = typeBuildings.pop();
    let movedBuilding = null;

    removeFromBuildingCollection(building);
    removeOccupancy(building);

    if (lastBuilding !== building) {
        movedBuilding = lastBuilding;
        movedBuilding.typeIndex = removedIndex;
        typeBuildings[removedIndex] = movedBuilding;
    }

    return {
        building,
        movedBuilding,
        removedIndex,
        type: building.type
    };
}

function addOccupancy(building) {
    buildings.set(building.key, building);
    for (let i = 0; i < building.cells.length; i++) occupiedCells.set(getFootprintCellKey(building.cells[i]), building);
}

function removeOccupancy(building) {
    for (let i = 0; i < building.cells.length; i++) occupiedCells.delete(getFootprintCellKey(building.cells[i]));
    buildings.delete(building.key);
}

function hasOccupancyConflict(cells) {
    for (let i = 0; i < cells.length; i++) if (occupiedCells.has(getFootprintCellKey(cells[i]))) return true;
    return false;
}

function addToBuildingCollection(building) {
    if (building.simulation.extraction || building.simulation.recipe) {
        addToCollection(constructionState.simulatedBuildings, 'simulatedIndex', building);
    }

    if (building.simulation.conveyor) {
        addToCollection(constructionState.conveyorBuildings, 'conveyorIndex', building);
    }

    if (building.simulation.outputPorts.length > 0) {
        addToCollection(constructionState.outputBuildings, 'outputIndex', building);
    }
}

function removeFromBuildingCollection(building) {
    removeFromCollection(constructionState.simulatedBuildings, 'simulatedIndex', building);
    removeFromCollection(constructionState.conveyorBuildings, 'conveyorIndex', building);
    removeFromCollection(constructionState.outputBuildings, 'outputIndex', building);
}

function addToCollection(collection, indexProperty, building) {
    building[indexProperty] = collection.length;
    collection.push(building);
}

function removeFromCollection(collection, indexProperty, building) {
    const removedIndex = building[indexProperty];

    if (removedIndex === null) return;

    const lastBuilding = collection.pop();

    if (lastBuilding !== building) {
        lastBuilding[indexProperty] = removedIndex;
        collection[removedIndex] = lastBuilding;
    }

    building[indexProperty] = null;
}

function hasBuilding(key) {
    if (!key) return false;

    return occupiedCells.has(key);
}

function getBuilding(key) {
    return getOccupiedBuilding(key);
}

function getBuildings() {
    return Array.from(buildings.values());
}

function markStatusChanged(building) {
    if (building.statusChangeIndex !== null) return;

    building.statusChangeIndex = constructionState.statusChangedBuildings.length;
    constructionState.statusChangedBuildings.push(building);
}

function getAndResetStatusChangedBuildings() {
    const changedBuildings = constructionState.statusChangedBuildings;

    constructionState.statusChangedBuildings = [];

    for (const building of changedBuildings) {
        if (building) building.statusChangeIndex = null;
    }

    return changedBuildings;
}

function getCellKey(cell) {
    if (!isValidCell(cell)) return '';

    return getAnchorKey(cell);
}

function getAnchorKey(cell) {
    return getFootprintCellKey(cell);
}

function getOccupiedBuilding(key) {
    return occupiedCells.get(key) ?? null;
}

function setBuildingRotation(key, rotation) {
    const building = getBuilding(key);

    if (!building) return null;
    if (!isValidRotation(rotation)) return null;
    if (building.rotation === rotation) return building;
    if (!canRotatePlacedFootprint(building, rotation)) return null;

    building.rotation = rotation;
    return building;
}

function canRotatePlacedFootprint(building, rotation) {
    const currentFootprint = getPlacedFootprint(building.type, building.rotation);
    const nextFootprint = getPlacedFootprint(building.type, rotation);

    return currentFootprint.width === nextFootprint.width && currentFootprint.height === nextFootprint.height;
}

function isValidCell(cell) {
    if (!cell) return false;
    if (!Number.isInteger(cell.latitude) || !Number.isInteger(cell.longitude)) return false;
    if (cell.latitude < 0 || cell.latitude >= LATITUDE_CELLS) return false;

    return cell.longitude >= 0 && cell.longitude < getLongitudeCellCount(cell.latitude);
}

function isValidRotation(rotation) {
    return Number.isInteger(rotation) && rotation >= 0 && rotation < 4;
}