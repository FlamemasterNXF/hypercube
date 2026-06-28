export const BUILDING_CELL_SCALE = 0.65;

export const BUILDING_TYPES = {
    miner: {
        name: 'Miner',
        letter: 'M',
        color: '#D5A848'
    },
    conveyor: {
        name: 'Conveyor',
        letter: 'C',
        color: '#7A8791'
    },
    reactor: {
        name: 'Reactor',
        letter: 'H',
        color: '#B7674E'
    },
    storage: {
        name: 'Storage',
        letter: 'S',
        color: '#4F89A8'
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