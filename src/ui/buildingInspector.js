import {BUILDING_DATA} from '../data/buildings.js';
import {buildingInspectorElement} from './elements.js';
import {constructionState} from '../simulation/constructionState.js';
import {getPortLayoutEntries, PORT_TYPE} from '../simulation/ports.js';
import {getBuildingProgress, getBuildingStatusLabel, getDirectionName, getResourceName, getTheoreticalRates} from '../simulation/buildingDiagnostics.js';

export const buildingInspector = {
    element: buildingInspectorElement,
    selectedKey: '',
    lastTick: null,
    view: null,
    select,
    clear,
    update
};

buildingInspector.element.className = 'inspectorHidden';

function select(key) {
    const building = constructionState.getBuilding(key);

    if (!building) {
        clear();
        return;
    }

    buildingInspector.selectedKey = key;
    buildingInspector.lastTick = null;
    buildingInspector.view = createInspectorView(building);
    buildingInspector.element.className = '';
    buildingInspector.element.replaceChildren(...buildingInspector.view.elements);
    update(-1);
}

function clear() {
    buildingInspector.selectedKey = '';
    buildingInspector.lastTick = null;
    buildingInspector.view = null;
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

    updateInspectorView(buildingInspector.view, building);
    buildingInspector.lastTick = tick;
}

function createInspectorView(building) {
    const definition = BUILDING_DATA[building.type];
    const elements = [];
    const view = {
        elements,
        statusValue: null,
        progressValue: null,
        progressFill: null,
        inputBuffers: [],
        outputBuffers: [],
        inputPorts: [],
        outputPorts: [],
        slots: []
    };
    const header = createHeader(definition.name);
    const coordinates = createDetailRow('(Debug) Coords', `Lat ${building.latitude} / Lon ${building.longitude}`);
    const theoreticalRateRows = createRateRows(getTheoreticalRates(building));
    const inputBufferRows = createBufferRows(building.simulation.inputBuffer);
    const outputBufferRows = createBufferRows(building.simulation.outputBuffer);
    const inputPortRows = createPortRows(building, PORT_TYPE.input, 'Empty');
    const outputPortRows = createPortRows(building, PORT_TYPE.output, 'Unassigned');
    const slotRows = createSlotRows(building);

    view.statusValue = header.statusValue;
    view.inputBuffers = inputBufferRows.views;
    view.outputBuffers = outputBufferRows.views;
    view.inputPorts = inputPortRows.views;
    view.outputPorts = outputPortRows.views;
    view.slots = slotRows.views;

    elements.push(header.element, coordinates.element);
    addProgressView(view, building, elements);
    appendSection(elements, 'Theoretical Rate', theoreticalRateRows);
    appendSection(elements, 'Input Buffer', inputBufferRows.elements);
    appendSection(elements, 'Output Buffer', outputBufferRows.elements);
    appendSection(elements, 'Input Ports', inputPortRows.elements);
    appendSection(elements, 'Output Ports', outputPortRows.elements);
    appendSection(elements, 'Slots', slotRows.elements);
    return view;
}

function updateInspectorView(view, building) {
    if (!view) return;

    view.statusValue.textContent = getBuildingStatusLabel(building);
    updateProgress(view, building);
    updateBufferRows(view.inputBuffers, building.simulation.inputBuffer);
    updateBufferRows(view.outputBuffers, building.simulation.outputBuffer);
    updatePortRows(view.inputPorts, building.simulation.inputPorts);
    updatePortRows(view.outputPorts, building.simulation.outputPorts);
    updateSlotRows(view.slots, building);
}

function createHeader(name) {
    const element = document.createElement('div');
    const title = document.createElement('strong');
    const statusValue = document.createElement('span');

    element.className = 'inspectorHeader';
    title.textContent = name;
    element.append(title, statusValue);

    return {
        element,
        statusValue
    };
}

function addProgressView(view, building, elements) {
    if (getBuildingProgress(building) === null) return;

    const row = document.createElement('div');
    const value = document.createElement('span');
    const bar = document.createElement('div');
    const fill = document.createElement('div');

    row.className = 'inspectorProgress';
    value.className = 'inspectorValue';
    bar.className = 'progressBar';
    fill.className = 'progressFill';
    bar.append(fill);
    row.append(createLabel('Progress'), value, bar);
    elements.push(row);
    view.progressValue = value;
    view.progressFill = fill;
}

function appendSection(elements, title, rows) {
    if (rows.length === 0) return;

    const section = document.createElement('div');
    const heading = document.createElement('div');

    section.className = 'inspectorSection';
    heading.className = 'sectionTitle';
    heading.textContent = title;
    section.append(heading, ...rows);
    elements.push(section);
}

function createRateRows(rates) {
    const rows = [];

    for (let i = 0; i < rates.length; i++) {
        rows.push(createDetailRow(getResourceName(rates[i].resource), `${formatAmount(rates[i].amount)}/s`).element);
    }

    return rows;
}

function createBufferRows(buffer) {
    const elements = [];
    const views = [];
    const resources = Object.keys(buffer.capacities);

    for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        const row = createDetailRow(getResourceName(resource), '');

        elements.push(row.element);
        views.push({
            resource,
            value: row.value
        });
    }

    return {
        elements,
        views
    };
}

function createPortRows(building, type, emptyText) {
    const elements = [];
    const views = [];
    const ports = getPortLayoutEntries(building, type);

    for (let i = 0; i < ports.length; i++) {
        const row = createDetailRow(`Port ${i + 1} ${getDirectionName(ports[i].direction)}`, '');

        elements.push(row.element);
        views.push({
            emptyText,
            value: row.value
        });
    }

    return {
        elements,
        views
    };
}

function createSlotRows(building) {
    const elements = [];
    const views = [];
    const slots = building.simulation.conveyor?.slots ?? [];

    for (let i = 0; i < slots.length; i++) {
        const row = createDetailRow(`Slot ${i + 1}`, '');

        elements.push(row.element);
        views.push(row.value);
    }

    return {
        elements,
        views
    };
}

function createDetailRow(labelText, valueText) {
    const element = document.createElement('div');
    const value = document.createElement('span');

    element.className = 'inspectorRow';
    value.className = 'inspectorValue';
    value.textContent = valueText;
    element.append(createLabel(labelText), value);

    return {
        element,
        value
    };
}

function createLabel(text) {
    const label = document.createElement('span');

    label.className = 'inspectorLabel';
    label.textContent = text;
    return label;
}

function updateProgress(view, building) {
    if (!view.progressValue) return;

    const progress = getBuildingProgress(building);
    const percent = progress === null ? 0 : Math.min(progress * 100, 100);

    view.progressValue.textContent = `${Math.floor(percent)}%`;
    view.progressFill.style.width = `${percent}%`;
}

function updateBufferRows(rows, buffer) {
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        row.value.textContent = `${buffer.contents[row.resource] ?? 0}/${buffer.capacities[row.resource]}`;
    }
}

function updatePortRows(rows, ports) {
    for (let i = 0; i < rows.length; i++) {
        const resource = ports[i].resource;

        rows[i].value.textContent = resource ? getResourceName(resource) : rows[i].emptyText;
    }
}

function updateSlotRows(rows, building) {
    const slots = building.simulation.conveyor?.slots ?? [];

    for (let i = 0; i < rows.length; i++) {
        const item = slots[i];

        rows[i].textContent = item ? getResourceName(item.resource) : 'Empty';
    }
}

function formatAmount(amount) {
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}