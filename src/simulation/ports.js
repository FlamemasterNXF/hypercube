import {addResource, canAddResource, getAmount} from './buffers.js';
import {DIRECTION, getNeighborCell, rotateDirection} from './directions.js';
import {getBuildingFootprint, getFootprintCell} from './buildingFootprints.js';

export const PORT_TYPE = {
    input: 'input',
    output: 'output'
};

export function createPorts(definitions = []) {
    const ports = [];

    for (let i = 0; i < definitions.length; i++) {
        ports.push({
            side: definitions[i].side,
            resource: null
        });
    }

    return ports;
}

export function createOutputPorts(definitions = [], outputBufferDefinition = {}) {
    const ports = createPorts(definitions);
    const resources = Object.keys(outputBufferDefinition);

    if (ports.length === 1 && resources.length === 1) {
        ports[0].resource = resources[0];
    }

    return ports;
}

export function getPorts(building, type) {
    return type === PORT_TYPE.input ? building.simulation.inputPorts : building.simulation.outputPorts;
}

function getPortDirection(building, port) {
    return rotateDirection(building.rotation, port.side);
}

export function getPortLayoutEntries(building, type) {
    const ports = getPorts(building, type);
    const footprint = getBuildingFootprint(building);
    const sideCounts = [0, 0, 0, 0];
    const sideIndices = [0, 0, 0, 0];
    const entries = [];

    for (let i = 0; i < ports.length; i++) {
        sideCounts[getPortDirection(building, ports[i])]++;
    }

    for (let i = 0; i < ports.length; i++) {
        const port = ports[i];
        const direction = getPortDirection(building, port);
        const sideIndex = sideIndices[direction];
        const sideCount = sideCounts[direction];
        const sideCells = getPortSideCells(footprint, direction);
        const cellOffset = getPortOffset(sideIndex, sideCount, sideCells);
        const cell = getPortCellFromOffset(building, footprint, direction, cellOffset);

        sideIndices[direction]++;

        entries.push({
            port,
            portIndex: i,
            direction,
            sideIndex,
            sideCount,
            sideCells,
            tangentOffset: cellOffset - (sideCells - 1) * 0.5,
            cell,
            neighborCell: cell ? getNeighborCell(cell, direction) : null
        });
    }

    return entries;
}

export function clearDrainedInputPortBindings(building) {
    const ports = building.simulation.inputPorts;

    for (let i = 0; i < ports.length; i++) {
        const resource = ports[i].resource;

        if (resource && getAmount(building.simulation.inputBuffer, resource) <= 0) {
            ports[i].resource = null;
        }
    }
}

export function setOutputPortResource(building, portIndex, resource) {
    const ports = building?.simulation.outputPorts;

    if (!ports || portIndex < 0 || portIndex >= ports.length) return false;

    if (resource === null) {
        ports[portIndex].resource = null;
        return true;
    }

    if (!Object.hasOwn(building.simulation.outputBuffer.capacities, resource)) return false;

    for (let i = 0; i < ports.length; i++) {
        if (i !== portIndex && ports[i].resource === resource) ports[i].resource = null;
    }

    ports[portIndex].resource = resource;
    return true;
}

export function getMatchingInputPorts(building, incomingDirection, targetCell = null) {
    const entries = getPortLayoutEntries(building, PORT_TYPE.input);
    const matches = [];

    for (let i = 0; i < entries.length; i++) {
        if (entries[i].direction !== incomingDirection) continue;
        if (targetCell && !isSameCell(entries[i].cell, targetCell)) continue;

        matches.push(entries[i].portIndex);
    }

    return matches;
}

export function transferToInputPort(building, portIndex, incomingDirection, resource) {
    clearDrainedInputPortBindings(building);

    const entry = getPortLayoutEntries(building, PORT_TYPE.input)[portIndex];
    const port = entry?.port;

    if (!port) return false;
    if (entry.direction !== incomingDirection) return false;
    if (!Object.hasOwn(building.simulation.inputBuffer.capacities, resource)) return false;
    if (isResourceBoundToOtherInputPort(building, resource, portIndex)) return false;
    if (port.resource && port.resource !== resource) return false;
    if (!canAddResource(building.simulation.inputBuffer, resource, 1)) return false;

    port.resource = resource;
    addResource(building.simulation.inputBuffer, resource, 1);
    return true;
}

function isResourceBoundToOtherInputPort(building, resource, portIndex) {
    const ports = building.simulation.inputPorts;

    for (let i = 0; i < ports.length; i++) {
        if (i !== portIndex && ports[i].resource === resource) return true;
    }

    return false;
}

function getPortOffset(sideIndex, sideCount, sideLength) {
    return Math.min(Math.floor((sideIndex + 0.5) * sideLength / sideCount), sideLength - 1);
}

function getPortSideCells(footprint, direction) {
    return direction === DIRECTION.north || direction === DIRECTION.south ? footprint.width : footprint.height;
}

function getPortCellFromOffset(building, footprint, direction, cellOffset) {
    if (direction === DIRECTION.north) return getFootprintCell(building, footprint.height - 1, cellOffset);
    if (direction === DIRECTION.east) return getFootprintCell(building, cellOffset, footprint.width - 1);
    if (direction === DIRECTION.south) return getFootprintCell(building, 0, cellOffset);

    return getFootprintCell(building, cellOffset, 0);
}

function isSameCell(firstCell, secondCell) {
    if (!firstCell || !secondCell) return false;

    return firstCell.latitude === secondCell.latitude && firstCell.longitude === secondCell.longitude;
}