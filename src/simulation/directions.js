import {getLongitudeCellCount, LATITUDE_CELLS} from '../moon/sphericalCoordinates.js';

export const DIRECTION = {
    north: 0,
    east: 1,
    south: 2,
    west: 3
};

export function getOppositeDirection(direction) {
    return (direction + 2) % 4;
}

export function rotateDirection(rotation, relativeDirection) {
    return (rotation + relativeDirection) % 4;
}

export function getNeighborCell(cell, direction) {
    if (direction === DIRECTION.north) return getLatitudeNeighbor(cell, 1);
    if (direction === DIRECTION.south) return getLatitudeNeighbor(cell, -1);

    const longitudeCells = getLongitudeCellCount(cell.latitude);
    const longitudeOffset = direction === DIRECTION.east ? 1 : -1;

    return {
        latitude: cell.latitude,
        longitude: (cell.longitude + longitudeOffset + longitudeCells) % longitudeCells
    };
}

export function getDirectionBetween(fromCell, toCell) {
    for (let i = 0; i < 4; i++) {
        const neighbor = getNeighborCell(fromCell, i);

        if (neighbor && neighbor.latitude === toCell.latitude && neighbor.longitude === toCell.longitude) return i;
    }

    return null;
}

function getLatitudeNeighbor(cell, offset) {
    const latitude = cell.latitude + offset;

    if (latitude < 0 || latitude >= LATITUDE_CELLS) return null;

    const currentLongitudeCells = getLongitudeCellCount(cell.latitude);
    const nextLongitudeCells = getLongitudeCellCount(latitude);
    const longitudeRatio = (cell.longitude + 0.5) / currentLongitudeCells;

    return {
        latitude,
        longitude: Math.min(Math.floor(longitudeRatio * nextLongitudeCells), nextLongitudeCells - 1)
    };
}