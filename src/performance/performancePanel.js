import {performancePanelElement} from '../ui/elements.js';
import {benchmark} from './benchmark.js';
import {performanceInfo} from './performanceInfo.js';

const UPDATE_INTERVAL = 0.25;
const BENCHMARK_SIZES = [1000, 10000, 100000];

const rows = {
    fps: createRow('FPS'),
    simulation: createRow('Simulation'),
    render: createRow('Render'),
    buildings: createRow('Buildings'),
    conveyors: createRow('Conveyors'),
    items: createRow('Items'),
    drawCalls: createRow('Draw Calls'),
};

export const performancePanel = {
    element: performancePanelElement,
    visible: false,
    updateTimer: 0,
    update
};

performancePanel.element.className = 'performanceHidden';
performancePanel.element.append(
    createHeader("Performance"),
    ...Object.values(rows).map((row) => row.element),
    createHeader("Benchmark"),
    createButtonRow()
);
performancePanel.element.addEventListener('click', handleClick);

window.addEventListener('keydown', handleKeyDown);

function update(delta) {
    if (!performancePanel.visible) return;

    performancePanel.updateTimer += delta;

    if (performancePanel.updateTimer < UPDATE_INTERVAL) return;

    performancePanel.updateTimer = 0;
    updateRows(performanceInfo.getSnapshot());
}

function createHeader(text) {
    const header = document.createElement('div');

    header.className = 'performanceHeader';
    header.textContent = text;
    return header;
}

function createButtonRow() {
    const row = document.createElement('div');
    row.className = 'performanceButtons';

    for (let i = 0; i < BENCHMARK_SIZES.length; i++) row.append(createButton(BENCHMARK_SIZES[i]));
    return row;
}

function createButton(size) {
    const button = document.createElement('button');

    button.dataset.benchmarkSize = String(size);
    button.textContent = formatCount(size);
    return button;
}

function createRow(labelText) {
    const element = document.createElement('div');
    const label = document.createElement('span');
    const value = document.createElement('span');

    element.className = 'performanceRow';
    label.className = 'performanceLabel';
    value.className = 'performanceValue';
    label.textContent = labelText;
    value.textContent = '-';
    element.append(label, value);

    return {
        element,
        value
    };
}

function updateRows(snapshot) {
    rows.fps.value.textContent = snapshot.fps.toFixed(1);
    rows.simulation.value.textContent = `${snapshot.simulationAverage.toFixed(2)} ms`;
    rows.render.value.textContent = `${snapshot.renderAverage.toFixed(2)} ms`;
    rows.buildings.value.textContent = formatCount(snapshot.buildings);
    rows.conveyors.value.textContent = formatCount(snapshot.conveyors);
    rows.items.value.textContent = formatCount(snapshot.items);
    rows.drawCalls.value.textContent = String(snapshot.drawCalls);
}

function handleClick(event) {
    if (event.target.tagName !== 'BUTTON') return;

    const size = Number(event.target.dataset.benchmarkSize);

    if (!BENCHMARK_SIZES.includes(size)) return;

    benchmark.generate(size);
    performancePanel.updateTimer = UPDATE_INTERVAL;
}

function handleKeyDown(event) {
    if (!event.ctrlKey || event.key.toLowerCase() !== 'p') return;

    event.preventDefault();
    performancePanel.visible = !performancePanel.visible;
    performancePanel.element.className = performancePanel.visible ? '' : 'performanceHidden';
    performancePanel.updateTimer = UPDATE_INTERVAL;
}

function formatCount(count) {
    return new Intl.NumberFormat('en-US').format(count);
}