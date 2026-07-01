import {constructionState} from '../simulation/constructionState.js';
import {benchmark} from "./benchmark.js";

const SAMPLE_LIMIT = 120;

const frameSamples = [];
const simulationSamples = [];
const renderSamples = [];

export const performanceInfo = {
    drawCalls: 0,
    frameStart: 0,
    beginFrame,
    getSnapshot,
    recordRender,
    recordSimulation
};

function beginFrame() {
    performanceInfo.frameStart = performance.now();
}

function recordSimulation(milliseconds) {
    addSample(simulationSamples, milliseconds);
}

function recordRender(milliseconds, renderer) {
    addSample(renderSamples, milliseconds);
    addSample(frameSamples, performance.now() - performanceInfo.frameStart);
    performanceInfo.drawCalls = renderer.info.render.calls;
}

function getSnapshot() {
    const counts = constructionState.getCounts();

    return {
        fps: getFps(),
        simulationAverage: getAverage(simulationSamples),
        renderAverage: getAverage(renderSamples),
        drawCalls: performanceInfo.drawCalls,
        buildings: counts.buildings,
        conveyors: counts.conveyors,
        items: getItemCount(),
        benchmarkSize: benchmark.active ? benchmark.size : 0
    };
}

function getItemCount() {
    let count = 0;

    for (const building of constructionState.conveyorBuildings) {
        const slots = building.simulation.conveyor.slots;
        for (let i = 0; i < slots.length; i++) if (slots[i]) count++;
    }

    return count;
}

function addSample(samples, value) {
    samples.push(value);
    if (samples.length > SAMPLE_LIMIT) samples.shift();
}

function getFps() {
    const average = getAverage(frameSamples);
    return average > 0 ? 1000 / average : 0;
}

function getAverage(samples) {
    if (samples.length === 0) return 0;

    let total = 0;
    for (let i = 0; i < samples.length; i++) total += samples[i];
    return total / samples.length;
}