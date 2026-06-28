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

export function canAdd(buffer, resources) {
    for (const [resource, amount] of Object.entries(resources)) {
        if (getSpace(buffer, resource) < amount) return false;
    }

    return true;
}

export function canTake(buffer, resources) {
    for (const [resource, amount] of Object.entries(resources)) {
        if (getAmount(buffer, resource) < amount) return false;
    }

    return true;
}

export function addResources(buffer, resources) {
    for (const [resource, amount] of Object.entries(resources)) {
        buffer.contents[resource] = getAmount(buffer, resource) + amount;
    }
}

export function takeResources(buffer, resources) {
    for (const [resource, amount] of Object.entries(resources)) {
        buffer.contents[resource] = getAmount(buffer, resource) - amount;
    }
}