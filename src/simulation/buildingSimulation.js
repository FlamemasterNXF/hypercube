import {BUILDING_TYPES} from '../data/buildings.js';
import {RECIPES} from '../data/recipes.js';
import {createBuffer} from './buffers.js';

export const BUILDING_STATUS = {
    idle: 'idle',
    working: 'working',
    lacking: 'lacking',
    full: 'full'
};

export function initBuildingSimulation(type) {
    const definition = BUILDING_TYPES[type];

    if (!definition.simulation) {
        return {
            status: BUILDING_STATUS.idle,
            progressTicks: 0,
            inputBuffer: createBuffer(),
            outputBuffer: createBuffer()
        };
    }

    return {
        status: BUILDING_STATUS.idle,
        progressTicks: 0,
        extraction: definition.simulation.extraction ?? null,
        recipe: definition.simulation.recipe ? RECIPES[definition.simulation.recipe] : null,
        inputBuffer: createBuffer(definition.simulation.inputBuffer),
        outputBuffer: createBuffer(definition.simulation.outputBuffer)
    };
}