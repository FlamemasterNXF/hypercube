export function createBuffer(capacities = {}) {
    return {
        capacities: {...capacities},
        contents: Object.fromEntries(Object.keys(capacities).map((resource) => [resource, 0]))
    };
}

export function getAmount(buffer, resource) {
    return buffer.contents[resource] ?? 0;
}

export function getCapacity(buffer, resource) {
    return buffer.capacities[resource] ?? 0;
}

export function getSpace(buffer, resource) {
    return getCapacity(buffer, resource) - getAmount(buffer, resource);
}

export function canAddEntries(buffer, entries) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        if (getSpace(buffer, entry.resource) < entry.amount) return false;
    }

    return true;
}

export function canAddResource(buffer, resource, amount) {
    return getSpace(buffer, resource) >= amount;
}

export function canTakeEntries(buffer, entries) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        if (getAmount(buffer, entry.resource) < entry.amount) return false;
    }

    return true;
}

export function addResource(buffer, resource, amount) {
    buffer.contents[resource] = getAmount(buffer, resource) + amount;
}

export function addEntries(buffer, entries) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        buffer.contents[entry.resource] = getAmount(buffer, entry.resource) + entry.amount;
    }
}

export function takeResource(buffer, resource, amount) {
    buffer.contents[resource] = getAmount(buffer, resource) - amount;
}

export function takeEntries(buffer, entries) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        buffer.contents[entry.resource] = getAmount(buffer, entry.resource) - entry.amount;
    }
}