import {BUILDING_DATA} from '../data/buildings.js';
import {getLongitudeCellCount, LATITUDE_CELLS} from '../moon/sphericalCoordinates.js';

const DEFAULT_FOOTPRINT = {
    width: 1,
    height: 1
};
export function getBaseFootprint(type) {
    const footprint = BUILDING_DATA[type]?.footprint ?? DEFAULT_FOOTPRINT;

    return {
        width: footprint.width ?? DEFAULT_FOOTPRINT.width,
        height: footprint.height ?? DEFAULT_FOOTPRINT.height
    };
}

export function getPlacedFootprint(type, rotation) {
    const footprint = getBaseFootprint(type);

    if (rotation % 2 === 0) return footprint;

    // noinspection JSSuspiciousNameCombination
    return {
        width: footprint.height,
        height: footprint.width
    };
}

export function getBuildingFootprint(building) {
    return getPlacedFootprint(building.type, building.rotation);
}

export function getFootprintCells(type, cell, rotation) {
    const footprint = getPlacedFootprint(type, rotation);
    const cells = [];
    const keys = new Set();

    for (let y = 0; y < footprint.height; y++) {
        const latitude = cell.latitude + y;
        if (latitude < 0 || latitude >= LATITUDE_CELLS) return null;

        const longitudeCells = getLongitudeCellCount(latitude);
        if (footprint.width > longitudeCells) return null;

        for (let x = 0; x < footprint.width; x++) {
            const occupiedCell = {
                latitude,
                longitude: (cell.longitude + x) % longitudeCells
            };
            const key = getFootprintCellKey(occupiedCell);

            if (keys.has(key)) return null;

            keys.add(key);
            cells.push(occupiedCell);
        }
    }

    return cells;
}

export function getBuildingCenter(building) {
    const footprint = getBuildingFootprint(building);
    return getFootprintCenter(building, footprint);
}

export function getPlacementCenter(type, cell, rotation) {
    return getFootprintCenter(cell, getPlacedFootprint(type, rotation));
}

function getFootprintCenter(cell, footprint) {
    return {
        latitude: cell.latitude + (footprint.height - 1) * 0.5,
        longitude: cell.longitude + (footprint.width - 1) * 0.5
    };
}

export function getFootprintCell(building, latitudeOffset, longitudeOffset) {
    const latitude = building.latitude + latitudeOffset;
    if (latitude < 0 || latitude >= LATITUDE_CELLS) return null;

    const longitudeCells = getLongitudeCellCount(latitude);

    return {
        latitude,
        longitude: (building.longitude + longitudeOffset + longitudeCells) % longitudeCells
    };
}

export function getFootprintCellKey(cell) {
    return `${cell.latitude}:${cell.longitude}`;
}