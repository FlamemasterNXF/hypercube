import {BUILDING_DATA} from '../data/buildings.js';
import {RECIPE_DATA} from '../data/recipes.js';
import {createBuffer} from './buffers.js';
import {getOppositeDirection} from './directions.js';
import {createOutputPorts, createPorts} from './ports.js';

export const BUILDING_STATUS = {
    idle: 'idle',
    working: 'working',
    lacking: 'lacking',
    full: 'full'
};

export const BUILDING_STATUS_DATA = {
    [BUILDING_STATUS.idle]: {
        label: 'Idle',
        color: '#9DA8B0'
    },
    [BUILDING_STATUS.working]: {
        label: 'Working',
        color: '#5FD17A'
    },
    [BUILDING_STATUS.lacking]: {
        label: 'Lacking',
        color: '#D5A848'
    },
    [BUILDING_STATUS.full]: {
        label: 'Full',
        color: '#D85E5E'
    }
};

export function initBuildingSimulation(type, rotation) {
    const definition = BUILDING_DATA[type];
    const recipe = definition.simulation?.recipe ? RECIPE_DATA[definition.simulation.recipe] : null;

    if (!definition.simulation) {
        return {
            status: BUILDING_STATUS.idle,
            progressTicks: 0,
            inputBuffer: createBuffer(),
            outputBuffer: createBuffer(),
            conveyor: null,
            inputPorts: [],
            outputPorts: []
        };
    }

    return {
        status: BUILDING_STATUS.idle,
        progressTicks: 0,
        extraction: definition.simulation.extraction ?? null,
        recipe,
        recipeInputs: recipe ? initRecipeInputs(recipe) : [],
        recipeOutputs: recipe ? initResourceEntries(recipe.outputs) : [],
        conveyor: definition.simulation.conveyor ? initConveyor(definition.simulation.conveyor, rotation) : null,
        inputBuffer: createBuffer(definition.simulation.inputBuffer),
        outputBuffer: createBuffer(definition.simulation.outputBuffer),
        inputPorts: createPorts(definition.simulation.inputPorts),
        outputPorts: createOutputPorts(definition.simulation.outputPorts, definition.simulation.outputBuffer)
    };
}

function initConveyor(definition, rotation) {
    const connections = [false, false, false, false];

    connections[rotation] = true;
    connections[getOppositeDirection(rotation)] = true;

    return {
        connections,
        portLinks: Array(4).fill(null),
        nextOutputDirection: 0,
        slots: Array(definition.slots).fill(null)
    };
}

function initRecipeInputs(recipe) {
    const entries = [];

    for (const [resource, amount] of Object.entries(recipe.inputs)) {
        if (recipe.debugInputs?.[resource]) continue;

        entries.push({
            resource,
            amount
        });
    }

    return entries;
}

function initResourceEntries(resources) {
    const entries = [];

    for (const [resource, amount] of Object.entries(resources)) {
        entries.push({
            resource,
            amount
        });
    }

    return entries;
}