import {BUILDING_CELL_SCALE} from '../data/buildings.js';
import {DIRECTION} from '../simulation/directions.js';

const CELL_EDGE_OFFSET = 0.5;
const MULTI_CELL_VISUAL_PADDING = 0.24;
const PORT_EDGE_OVERLAP = 0.1;

export function getFootprintVisualSize(footprint) {
    return {
        width: getVisualSpan(footprint.width),
        height: getVisualSpan(footprint.height)
    };
}

export function getPortSocketLayout(footprint, side) {
    const depthCells = getSideDepthCells(footprint, side);
    const visualEdgeOffset = getVisualSpan(depthCells) * 0.5;
    const cellEdgeOffset = depthCells * CELL_EDGE_OFFSET;
    const depth = cellEdgeOffset - visualEdgeOffset + PORT_EDGE_OVERLAP;

    return {
        centerOffset: visualEdgeOffset - PORT_EDGE_OVERLAP + depth * 0.5,
        depth
    };
}

export function getStatusCornerOffset(footprint, markerRadius) {
    const size = getFootprintVisualSize(footprint);

    return {
        east: size.width * 0.5 - markerRadius,
        north: size.height * 0.5 - markerRadius
    };
}

function getVisualSpan(cells) {
    const padding = cells > 1 ? MULTI_CELL_VISUAL_PADDING : 0;
    return Math.max(cells * BUILDING_CELL_SCALE, cells - 1 + padding);
}

function getSideDepthCells(footprint, side) {
    return side === DIRECTION.north || side === DIRECTION.south ? footprint.height : footprint.width;
}