import {cameraController} from '../camera/camera.js';
import {constructionState} from '../simulation/constructionState.js';
import {simulation} from '../simulation/simulation.js';

export const VERSION = "0.0.1";
export function createSaveData() {
    return {
        gameVersion: VERSION,
        savedAt: Date.now(),
        camera: cameraController.getSaveState(),
        simulation: serializeSimulation(),
        buildings: serializeBuildings()
    };
}

export function applySaveData(saveData) {
    constructionState.clear();
    simulation.applySavedState(saveData.simulation);
    cameraController.applySaveState(saveData.camera);

    for (let i = 0; i < saveData.buildings.length; i++) {
        const savedBuilding = saveData.buildings[i];
        const building = constructionState.addBuilding(savedBuilding.type, getSavedBuildingCell(savedBuilding), savedBuilding.rotation);

        if (!building) throw new Error(`Could not restore building ${savedBuilding.key}`);

        applyBuildingSimulation(building, savedBuilding.simulation);
    }
}

function getSavedBuildingCell(savedBuilding) {
    return {
        latitude: savedBuilding.latitude,
        longitude: savedBuilding.longitude
    };
}

function serializeSimulation() {
    return {
        tick: simulation.tick,
        speed: simulation.speed,
        paused: simulation.paused
    };
}

function serializeBuildings() {
    const buildings = constructionState.getBuildings().sort((first, second) => first.key.localeCompare(second.key));
    const entries = [];

    for (let i = 0; i < buildings.length; i++) entries.push(serializeBuilding(buildings[i]));
    return entries;
}

function serializeBuilding(building) {
    return {
        type: building.type,
        latitude: building.latitude,
        longitude: building.longitude,
        rotation: building.rotation,
        simulation: serializeBuildingSimulation(building)
    };
}

function serializeBuildingSimulation(building) {
    return {
        status: building.simulation.status,
        progressTicks: building.simulation.progressTicks,
        inputBuffer: serializeBuffer(building.simulation.inputBuffer),
        outputBuffer: serializeBuffer(building.simulation.outputBuffer),
        inputPorts: serializePorts(building.simulation.inputPorts),
        outputPorts: serializePorts(building.simulation.outputPorts),
        conveyor: building.simulation.conveyor ? serializeConveyor(building.simulation.conveyor) : null
    };
}

function serializeBuffer(buffer) {
    return {...buffer.contents};
}

function serializePorts(ports) {
    const entries = [];
    for (let i = 0; i < ports.length; i++) entries.push(ports[i].resource);
    return entries;
}

function serializeConveyor(conveyor) {
    return {
        connections: [...conveyor.connections],
        portLinks: conveyor.portLinks.map((link) => link ? {...link} : null),
        nextOutputDirection: conveyor.nextOutputDirection,
        slots: conveyor.slots.map((item) => item ? {...item} : null)
    };
}

function applyBuildingSimulation(building, savedSimulation) {
    building.simulation.status = savedSimulation.status;
    building.simulation.progressTicks = savedSimulation.progressTicks;
    applyBuffer(building.simulation.inputBuffer, savedSimulation.inputBuffer);
    applyBuffer(building.simulation.outputBuffer, savedSimulation.outputBuffer);
    applyPorts(building.simulation.inputPorts, savedSimulation.inputPorts);
    applyPorts(building.simulation.outputPorts, savedSimulation.outputPorts);

    if (building.simulation.conveyor) applyConveyor(building.simulation.conveyor, savedSimulation.conveyor);
}

function applyBuffer(buffer, contents) {
    for (const resource of Object.keys(buffer.capacities)) buffer.contents[resource] = contents[resource];
}

function applyPorts(ports, savedPorts) {
    for (let i = 0; i < ports.length; i++) ports[i].resource = savedPorts[i];
}

function applyConveyor(conveyor, savedConveyor) {
    conveyor.connections = [...savedConveyor.connections];
    conveyor.portLinks = savedConveyor.portLinks.map((link) => link ? {...link} : null);
    conveyor.nextOutputDirection = savedConveyor.nextOutputDirection;
    conveyor.slots = savedConveyor.slots.map((item) => item ? {...item} : null);
}