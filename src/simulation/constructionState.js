import {BUILDING_TYPES} from '../data/buildings.js';

export const constructionState = {
    buildings: new Map(),
    buildingsByType: Object.fromEntries(Object.keys(BUILDING_TYPES).map((type) => [type, []])),
    addBuilding,
    getCellKey,
    hasBuilding,
    removeBuilding
};

function addBuilding(type, cell, rotation) {
    const key = getCellKey(cell);
    const typeBuildings = constructionState.buildingsByType[type];
    const building = {
        type,
        latitude: cell.latitude,
        longitude: cell.longitude,
        rotation,
        typeIndex: typeBuildings.length
    };

    constructionState.buildings.set(key, building);
    typeBuildings.push(building);
    return building;
}

function removeBuilding(key) {
    const building = constructionState.buildings.get(key);
    const typeBuildings = constructionState.buildingsByType[building.type];
    const removedIndex = building.typeIndex;
    const lastBuilding = typeBuildings.pop();
    let movedBuilding = null;

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

function hasBuilding(key) {
    return constructionState.buildings.has(key);
}

function getCellKey(cell) {
    return `${cell.latitude}:${cell.longitude}`;
}