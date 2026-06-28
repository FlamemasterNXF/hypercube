export const LATITUDE_CELLS = 640;
export const EQUATOR_LONGITUDE_CELLS = 1280;
export const MINIMUM_LONGITUDE_CELLS = 5;
export const LONGITUDE_CELL_COUNTS = [1280, 640, 320, 160, 80, 40, 20, 10, 5];

const LATITUDE_STEP = Math.PI / LATITUDE_CELLS;

export function normalToSphericalCell(normal) {
    const latitudeAngle = Math.asin(Math.min(Math.max(normal.y, -1), 1));
    const longitudeAngle = Math.atan2(normal.x, normal.z);
    const latitude = Math.min(Math.max(Math.floor((latitudeAngle + Math.PI * 0.5) / LATITUDE_STEP), 0), LATITUDE_CELLS - 1);
    const longitudeCells = getLongitudeCellCount(latitude);
    const longitudeStep = Math.PI * 2 / longitudeCells;

    return {
        latitude,
        longitude: Math.min(Math.floor((longitudeAngle + Math.PI) / longitudeStep), longitudeCells - 1)
    };
}

export function getSphericalCellFrame(latitude, longitude, normal, east, north) {
    const latitudeAngle = latitudeCellToAngle(latitude);
    const longitudeAngle = longitudeCellToAngle(latitude, longitude);
    const sinLatitude = Math.sin(latitudeAngle);
    const cosLatitude = Math.cos(latitudeAngle);
    const sinLongitude = Math.sin(longitudeAngle);
    const cosLongitude = Math.cos(longitudeAngle);

    normal.set(cosLatitude * sinLongitude, sinLatitude, cosLatitude * cosLongitude);
    east.set(cosLongitude, 0, -sinLongitude);
    north.set(-sinLatitude * sinLongitude, cosLatitude, -sinLatitude * cosLongitude);
}

export function getSphericalCellSize(radius, size) {
    const side = radius * LATITUDE_STEP;
    size.width = side;
    size.height = side;
}

export function getLongitudeCellCount(latitude) {
    const latitudeAngle = latitudeCellToAngle(latitude);
    const idealCellCount = Math.max(Math.cos(latitudeAngle) * EQUATOR_LONGITUDE_CELLS, MINIMUM_LONGITUDE_CELLS);
    let closestCellCount = LONGITUDE_CELL_COUNTS[0];
    let closestDistance = Math.abs(idealCellCount - closestCellCount);

    for (let i = 1; i < LONGITUDE_CELL_COUNTS.length; i += 1) {
        const cellCount = LONGITUDE_CELL_COUNTS[i];
        const distance = Math.abs(idealCellCount - cellCount);

        if (distance < closestDistance) {
            closestCellCount = cellCount;
            closestDistance = distance;
        }
    }

    return closestCellCount;
}

function latitudeCellToAngle(latitude) {
    return -Math.PI * 0.5 + (latitude + 0.5) * LATITUDE_STEP;
}

function longitudeCellToAngle(latitude, longitude) {
    const longitudeStep = Math.PI * 2 / getLongitudeCellCount(latitude);
    return -Math.PI + (longitude + 0.5) * longitudeStep;
}