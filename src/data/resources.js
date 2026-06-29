export const RESOURCE_DATA = {
    ilmenite: {
        name: 'Ilmenite',
        color: '#3F4F5E'
    },
    hydrogen: {
        name: 'Hydrogen',
        color: '#A7D8FF'
    },
    iron: {
        name: 'Iron',
        color: '#B9B5AD'
    },
    titaniumDioxide: {
        name: 'Titanium Dioxide',
        color: '#E8E1D4'
    },
    processWater: {
        name: 'Process Water',
        color: '#5EA0C8'
    }
};

export const RESOURCE = Object.freeze(
    Object.fromEntries(Object.keys(RESOURCE_DATA).map((key) => [key, key]))
);