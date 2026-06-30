import {RESOURCE_DATA} from '../data/resources.js';
import {BUILDING_STATUS_DATA} from './buildingSimulation.js';
import {TICKS_PER_SECOND} from './simulation.js';
import {rotateDirection} from './directions.js';

/*
    Technically repeated info from directions.js, but this is just a simple solution.
    If I really wanted to I could create a DIRECTION array similar to how the RECIPE and RESOURCE objects are created.
*/
const DIRECTION_NAMES = ['North', 'East', 'South', 'West'];

export function getBuildingStatus(building) {
    return building.simulation.status;
}

export function getBuildingDiagnostics(building) {
    const status = getBuildingStatus(building);

    return {
        type: building.type,
        status,
        statusLabel: BUILDING_STATUS_DATA[status].label,
        progress: getProgress(building),
        theoreticalRates: getTheoreticalRates(building),
        inputBuffers: getBufferEntries(building.simulation.inputBuffer),
        outputBuffers: getBufferEntries(building.simulation.outputBuffer),
        ports: getPorts(building),
        conveyorSlots: getConveyorSlots(building)
    };
}

export function getDirectionName(direction) {
    return DIRECTION_NAMES[direction];
}

function getProgress(building) {
    const cycleTicks = getCycleTicks(building);
    if (!cycleTicks) return null;

    return building.simulation.progressTicks / cycleTicks;
}

function getCycleTicks(building) {
    if (building.simulation.extraction) return building.simulation.extraction.cycleTicks;
    if (building.simulation.recipe) return building.simulation.recipe.cycleTicks;
    return 0;
}

function getTheoreticalRates(building) {
    if (building.simulation.extraction) {
        const extraction = building.simulation.extraction;
        return [{
            resource: extraction.resource,
            amount: extraction.amount * TICKS_PER_SECOND / extraction.cycleTicks
        }];
    }

    if (!building.simulation.recipe) return [];

    const cycleTicks = building.simulation.recipe.cycleTicks;
    const rates = [];

    for (const [resource, amount] of Object.entries(building.simulation.recipe.outputs)) {
        rates.push({
            resource,
            amount: amount * TICKS_PER_SECOND / cycleTicks
        });
    }

    return rates;
}

function getBufferEntries(buffer) {
    const entries = [];

    for (const resource of Object.keys(buffer.capacities)) {
        entries.push({
            resource,
            name: RESOURCE_DATA[resource].name,
            amount: buffer.contents[resource] ?? 0,
            capacity: buffer.capacities[resource]
        });
    }

    return entries;
}

function getPorts(building) {
    const ports = [];

    for (const direction of building.simulation.inputDirections) {
        const absoluteDirection = rotateDirection(building.rotation, direction);

        ports.push({
            kind: 'Input',
            direction: absoluteDirection,
            directionName: getDirectionName(absoluteDirection)
        });
    }

    for (const direction of building.simulation.outputDirections) {
        const absoluteDirection = rotateDirection(building.rotation, direction);

        ports.push({
            kind: 'Output',
            direction: absoluteDirection,
            directionName: getDirectionName(absoluteDirection)
        });
    }

    if (building.simulation.conveyor) {
        for (let i = 0; i < building.simulation.conveyor.connections.length; i++) {
            if (!building.simulation.conveyor.connections[i]) continue;

            ports.push({
                kind: 'Belt',
                direction: i,
                directionName: getDirectionName(i)
            });
        }
    }

    return ports;
}

function getConveyorSlots(building) {
    if (!building.simulation.conveyor) return [];

    return building.simulation.conveyor.slots.map((item) => {
        if (!item) return 'Empty';

        return RESOURCE_DATA[item.resource].name;
    });
}