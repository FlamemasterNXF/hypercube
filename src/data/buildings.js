import {DIRECTION} from '../simulation/directions.js';
import {RESOURCE} from './resources.js';
import {RECIPE} from './recipes.js';

export const BUILDING_CELL_SCALE = 0.65;

export const BUILDING_DATA = {
    miner: {
        name: 'Miner',
        letter: 'M',
        color: '#D5A848',
        simulation: {
            extraction: {
                resource: RESOURCE.ilmenite,
                amount: 1,
                cycleTicks: 10
            },
            outputBuffer: {
                [RESOURCE.ilmenite]: 20
            },
            outputPorts: [
                {side: DIRECTION.north}
            ]
        }
    },
    conveyor: {
        name: 'Conveyor',
        letter: 'C',
        color: '#7A8791',
        simulation: {
            conveyor: {
                slots: 4
            }
        }
    },
    reactor: {
        name: 'Reactor',
        letter: 'H',
        color: '#B7674E',
        simulation: {
            recipe: RECIPE.hydrogenReduction,
            inputBuffer: {
                [RESOURCE.ilmenite]: 10
            },
            outputBuffer: {
                [RESOURCE.iron]: 10,
                [RESOURCE.titaniumDioxide]: 10,
                [RESOURCE.processWater]: 10
            },
            inputPorts: [
                {side: DIRECTION.south}
            ],
            outputPorts: [
                {side: DIRECTION.north},
                {side: DIRECTION.north},
                {side: DIRECTION.north}
            ]
        }
    },
    storage: {
        name: 'Storage',
        letter: 'S',
        color: '#4F89A8',
        simulation: {
            inputBuffer: {
                [RESOURCE.iron]: 100
            },
            inputPorts: [
                {side: DIRECTION.south}
            ]
        }
    }
};

export const BUILD_CATEGORIES = [
    {
        id: 'extraction',
        name: 'Extraction',
        key: '1',
        icon: 'E',
        buildings: ['miner']
    },
    {
        id: 'logistics',
        name: 'Logistics',
        key: '2',
        icon: 'L',
        buildings: ['conveyor', 'storage']
    },
    {
        id: 'processing',
        name: 'Processing',
        key: '3',
        icon: 'P',
        buildings: ['reactor']
    }
];