import {BUILDING_DATA} from '../data/buildings.js';
import {getLongitudeCellCount, LATITUDE_CELLS} from '../moon/sphericalCoordinates.js';
import {initBuildingSimulation} from './buildingSimulation.js';

export const constructionState = {
    buildings: new Map(),
    buildingsByType: Object.fromEntries(Object.keys(BUILDING_DATA).map((type) => [type, []])),
    conveyorBuildings: [],
    outputBuildings: [],
    simulatedBuildings: [],
    statusChangedBuildings: [],
    addBuilding,
    getAndResetStatusChangedBuildings,
    getBuilding,
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

    const key = getCellKey(cell);
    if (constructionState.buildings.has(key)) return null;

    const typeBuildings = constructionState.buildingsByType[type];
    const building = {
        type,
        latitude: cell.latitude,
        longitude: cell.longitude,
        rotation,
        typeIndex: typeBuildings.length,
        conveyorIndex: null,
        outputIndex: null,
        simulatedIndex: null,
        statusChangeIndex: null,
        statusMarkerIndex: null,
        statusMarkerStatus: null,
        simulation: initBuildingSimulation(type, rotation)
    };

    constructionState.buildings.set(key, building);
    typeBuildings.push(building);
    addToBuildingCollection(building);
    return building;
}

function removeBuilding(key) {
    const building = constructionState.buildings.get(key);

    if (!building) return null;

    const typeBuildings = constructionState.buildingsByType[building.type];
    const removedIndex = building.typeIndex;
    const lastBuilding = typeBuildings.pop();
    let movedBuilding = null;

    removeFromBuildingCollection(building);

    if (lastBuilding !== building) {
        movedBuilding = lastBuilding;
        movedBuilding.typeIndex = removedIndex;
        typeBuildings[removedIndex] = movedBuilding;
    }

    constructionState.buildings.delete(key);
    return {
        building,
        movedBuilding,
        removedIndex,
        type: building.type
    };
}

function addToBuildingCollection(building) {
    if (building.simulation.extraction || building.simulation.recipe) {
        addToCollection(constructionState.simulatedBuildings, 'simulatedIndex', building);
    }

    if (building.simulation.conveyor) {
        addToCollection(constructionState.conveyorBuildings, 'conveyorIndex', building);
    }

    if (building.simulation.outputDirections.length > 0) {
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

    return constructionState.buildings.has(key);
}

function getBuilding(key) {
    return constructionState.buildings.get(key) ?? null;
}

function markStatusChanged(building) {
    if (building.statusChangeIndex !== null) return;

    building.statusChangeIndex = constructionState.statusChangedBuildings.length;
    constructionState.statusChangedBuildings.push(building);
}

function getAndResetStatusChangedBuildings() {
    const buildings = constructionState.statusChangedBuildings;

    constructionState.statusChangedBuildings = [];

    for (const building of buildings) {
        if (building) building.statusChangeIndex = null;
    }

    return buildings;
}

function getCellKey(cell) {
    if (!isValidCell(cell)) return '';

    return `${cell.latitude}:${cell.longitude}`;
}

function setBuildingRotation(key, rotation) {
    const building = getBuilding(key);

    if (!building) return null;
    if (!isValidRotation(rotation)) return null;
    if (building.rotation === rotation) return building;

    building.rotation = rotation;
    return building;
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