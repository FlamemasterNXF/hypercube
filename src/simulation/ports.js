import {addResource, canAddResource, getAmount} from './buffers.js';
import {rotateDirection} from './directions.js';

export const PORT_TYPE = {
    input: 'input',
    output: 'output'
};

export function createPorts(definitions = []) {
    const ports = [];

    for (let i = 0; i < definitions.length; i++) {
        ports.push({
            side: definitions[i].side,
            resource: null
        });
    }

    return ports;
}

export function createOutputPorts(definitions = [], outputBufferDefinition = {}) {
    const ports = createPorts(definitions);
    const resources = Object.keys(outputBufferDefinition);

    if (ports.length === 1 && resources.length === 1) {
        ports[0].resource = resources[0];
    }

    return ports;
}

export function getPorts(building, type) {
    return type === PORT_TYPE.input ? building.simulation.inputPorts : building.simulation.outputPorts;
}

export function getPortDirection(building, port) {
    return rotateDirection(building.rotation, port.side);
}

export function clearDrainedInputPortBindings(building) {
    const ports = building.simulation.inputPorts;

    for (let i = 0; i < ports.length; i++) {
        const resource = ports[i].resource;

        if (resource && getAmount(building.simulation.inputBuffer, resource) <= 0) {
            ports[i].resource = null;
        }
    }
}

export function setOutputPortResource(building, portIndex, resource) {
    const ports = building?.simulation.outputPorts;

    if (!ports || portIndex < 0 || portIndex >= ports.length) return false;

    if (resource === null) {
        ports[portIndex].resource = null;
        return true;
    }

    if (!Object.hasOwn(building.simulation.outputBuffer.capacities, resource)) return false;

    for (let i = 0; i < ports.length; i++) {
        if (i !== portIndex && ports[i].resource === resource) ports[i].resource = null;
    }

    ports[portIndex].resource = resource;
    return true;
}

export function getMatchingInputPorts(building, incomingDirection) {
    const ports = building.simulation.inputPorts;
    const matches = [];

    for (let i = 0; i < ports.length; i++) {
        if (getPortDirection(building, ports[i]) === incomingDirection) matches.push(i);
    }

    return matches;
}

export function transferToInputPort(building, portIndex, incomingDirection, resource) {
    clearDrainedInputPortBindings(building);

    const port = building.simulation.inputPorts[portIndex];

    if (!port) return false;
    if (getPortDirection(building, port) !== incomingDirection) return false;
    if (!Object.hasOwn(building.simulation.inputBuffer.capacities, resource)) return false;
    if (isResourceBoundToOtherInputPort(building, resource, portIndex)) return false;
    if (port.resource && port.resource !== resource) return false;
    if (!canAddResource(building.simulation.inputBuffer, resource, 1)) return false;

    port.resource = resource;
    addResource(building.simulation.inputBuffer, resource, 1);
    return true;
}

function isResourceBoundToOtherInputPort(building, resource, portIndex) {
    const ports = building.simulation.inputPorts;

    for (let i = 0; i < ports.length; i++) {
        if (i !== portIndex && ports[i].resource === resource) return true;
    }

    return false;
}