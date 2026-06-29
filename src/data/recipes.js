import {RESOURCE} from './resources.js';

export const RECIPE_DATA = {
    hydrogenReduction: {
        name: 'Hydrogen Reduction',
        cycleTicks: 10,
        inputs: {
            [RESOURCE.ilmenite]: 1,
            [RESOURCE.hydrogen]: 1
        },
        outputs: {
            [RESOURCE.iron]: 1,
            [RESOURCE.titaniumDioxide]: 1,
            [RESOURCE.processWater]: 1
        },
        debugInputs: {
            [RESOURCE.hydrogen]: true
        }
    }
};

export const RECIPE = Object.freeze(
    Object.fromEntries(Object.keys(RECIPE_DATA).map((key) => [key, key]))
);