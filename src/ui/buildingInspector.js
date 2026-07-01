import {BUILDING_DATA} from '../data/buildings.js';
import {RESOURCE_DATA} from '../data/resources.js';
import {buildingInspectorElement} from './elements.js';
import {constructionState} from '../simulation/constructionState.js';
import {getBuildingDiagnostics} from '../simulation/buildingDiagnostics.js';

export const buildingInspector = {
    element: buildingInspectorElement,
    selectedKey: '',
    lastTick: null,
    select,
    clear,
    update
};

buildingInspector.element.className = 'inspectorHidden';

function select(key) {
    buildingInspector.selectedKey = key;
    buildingInspector.lastTick = null;
    update(-1);
}

function clear() {
    buildingInspector.selectedKey = '';
    buildingInspector.lastTick = null;
    buildingInspector.element.className = 'inspectorHidden';
    buildingInspector.element.replaceChildren();
}

function update(tick) {
    if (!buildingInspector.selectedKey) return;
    if (buildingInspector.lastTick === tick) return;

    const building = constructionState.getBuilding(buildingInspector.selectedKey);

    if (!building) {
        clear();
        return;
    }

    const diagnostics = getBuildingDiagnostics(building);
    const definition = BUILDING_DATA[building.type];

    const details = [
        createHeader(definition.name, diagnostics.statusLabel),
        createDetailRow('(Debug) Coords', `Lat ${building.latitude} / Lon ${building.longitude}`)
    ];
    const progress = createProgress(diagnostics.progress);
    const sections = [
        createSection('Theoretical Rate', createRateRows(diagnostics.theoreticalRates)),
        createSection('Input Buffer', createBufferRows(diagnostics.inputBuffers)),
        createSection('Output Buffer', createBufferRows(diagnostics.outputBuffers)),
        createSection('Input Ports', createInputPortRows(diagnostics.inputPorts)),
        createSection('Output Ports', createOutputPortRows(diagnostics.outputPorts)),
        createSection('Slots', createSlotRows(diagnostics.conveyorSlots))
    ].filter(Boolean);

    if (progress) details.push(progress);

    buildingInspector.element.className = '';
    buildingInspector.element.replaceChildren(...details, ...sections);
    buildingInspector.lastTick = tick;
}

function createHeader(name, statusLabel) {
    const header = document.createElement('div');
    const title = document.createElement('strong');
    const status = document.createElement('span');

    header.className = 'inspectorHeader';
    title.textContent = name;
    status.textContent = statusLabel;
    header.append(title, status);
    return header;
}

function createProgress(progress) {
    if (progress === null) return null;

    const row = document.createElement('div');
    const value = document.createElement('span');
    const bar = document.createElement('div');
    const fill = document.createElement('div');
    const progressLabel = `${Math.floor(progress * 100)}%`;

    row.className = 'inspectorProgress';
    value.className = 'inspectorValue';
    value.textContent = progressLabel;
    bar.className = 'progressBar';
    fill.className = 'progressFill';
    fill.style.width = `${Math.min(progress * 100, 100)}%`;
    bar.append(fill);
    row.append(createLabel('Progress'), value, bar);
    return row;
}

function createSection(title, rows) {
    if (rows.length === 0) return null;

    const section = document.createElement('div');
    const heading = document.createElement('div');

    section.className = 'inspectorSection';
    heading.className = 'sectionTitle';
    heading.textContent = title;
    section.append(heading);

    section.append(...rows);
    return section;
}

function createRateRows(rates) {
    const rows = [];
    for (const rate of rates) rows.push(createDetailRow(RESOURCE_DATA[rate.resource].name, `${formatAmount(rate.amount)}/s`));
    return rows;
}

function createBufferRows(entries) {
    const rows = [];
    for (const entry of entries) rows.push(createDetailRow(entry.name, `${entry.amount}/${entry.capacity}`));
    return rows;
}

function createInputPortRows(ports) {
    const rows = [];
    for (let i = 0; i < ports.length; i++) rows.push(createDetailRow(`Port ${i + 1} ${ports[i].directionName}`, ports[i].resourceName ?? 'Empty'));
    return rows;
}

function createOutputPortRows(ports) {
    const rows = [];
    for (let i = 0; i < ports.length; i++) rows.push(createDetailRow(`Port ${i + 1} ${ports[i].directionName}`, ports[i].resourceName ?? 'Unassigned'));
    return rows;
}

function createSlotRows(slots) {
    const rows = [];
    for (let i = 0; i < slots.length; i++) rows.push(createDetailRow(`Slot ${i + 1}`, slots[i]));
    return rows;
}

function createDetailRow(labelText, valueText) {
    const row = document.createElement('div');
    const value = document.createElement('span');

    row.className = 'inspectorRow';
    value.className = 'inspectorValue';
    value.textContent = valueText;
    row.append(createLabel(labelText), value);
    return row;
}

function createLabel(text) {
    const label = document.createElement('span');

    label.className = 'inspectorLabel';
    label.textContent = text;
    return label;
}

function formatAmount(amount) {
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}