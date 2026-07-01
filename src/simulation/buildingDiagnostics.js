import {RESOURCE_DATA} from '../data/resources.js';
import {BUILDING_STATUS_DATA} from './buildingSimulation.js';
import {TICKS_PER_SECOND} from './simulation.js';

/*
    Technically repeated info from directions.js, but this is just a simple solution.
    If I really wanted to I could create a DIRECTION array similar to how the RECIPE and RESOURCE objects are created.
*/
const DIRECTION_NAMES = ['North', 'East', 'South', 'West'];

export function getBuildingStatusLabel(building) {
    return BUILDING_STATUS_DATA[building.simulation.status].label;
}

export function getBuildingProgress(building) {
    const cycleTicks = getCycleTicks(building);
    if (!cycleTicks) return null;

    return building.simulation.progressTicks / cycleTicks;
}

export function getDirectionName(direction) {
    return DIRECTION_NAMES[direction];
}

export function getResourceName(resource) {
    return RESOURCE_DATA[resource].name;
}

export function getTheoreticalRates(building) {
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

function getCycleTicks(building) {
    if (building.simulation.extraction) return building.simulation.extraction.cycleTicks;
    if (building.simulation.recipe) return building.simulation.recipe.cycleTicks;
    return 0;
}