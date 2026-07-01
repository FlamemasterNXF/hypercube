import {camera, cameraController} from '../camera/camera.js';
import {getPortScreenPosition} from '../construction/portLayout.js';
import {RESOURCE_DATA} from '../data/resources.js';
import {constructionState} from '../simulation/constructionState.js';
import {PORT_TYPE, setOutputPortResource} from '../simulation/ports.js';
import {gameCanvas, outputPortSelectorElement} from './elements.js';

const screenPosition = {x: 0, y: 0};

export const outputPortSelector = {
    element: outputPortSelectorElement,
    buildingKey: '',
    portIndex: null,
    lastTick: null,
    buttons: [],
    show,
    hide,
    update
};

outputPortSelector.element.className = 'selectorHidden';
outputPortSelector.element.addEventListener('click', handleClick);

function show(buildingKey, portIndex) {
    outputPortSelector.buildingKey = buildingKey;
    outputPortSelector.portIndex = portIndex;
    outputPortSelector.lastTick = null;
    render(null);
}

function hide() {
    outputPortSelector.buildingKey = '';
    outputPortSelector.portIndex = null;
    outputPortSelector.lastTick = null;
    outputPortSelector.buttons = [];
    outputPortSelector.element.className = 'selectorHidden';
    outputPortSelector.element.replaceChildren();
}

function update(tick) {
    if (!outputPortSelector.buildingKey) return;

    const building = constructionState.getBuilding(outputPortSelector.buildingKey);

    if (!building || cameraController.planetary) {
        hide();
        return;
    }

    updatePosition(building);

    if (outputPortSelector.lastTick === tick) return;

    updateButtons(building, tick);
}

function render(tick) {
    const building = constructionState.getBuilding(outputPortSelector.buildingKey);

    if (!building) {
        hide();
        return;
    }

    const port = building.simulation.outputPorts[outputPortSelector.portIndex];

    if (!port) {
        hide();
        return;
    }

    const children = [createTitle(`Output Port ${outputPortSelector.portIndex + 1}`)];

    outputPortSelector.buttons = [createButton(null)];

    for (const resource of Object.keys(building.simulation.outputBuffer.capacities)) {
        outputPortSelector.buttons.push(createButton(resource));
    }

    children.push(...outputPortSelector.buttons);
    outputPortSelector.element.className = '';
    outputPortSelector.element.replaceChildren(...children);
    updateButtons(building, tick);
    updatePosition(building);
}

function updateButtons(building, tick) {
    const port = building.simulation.outputPorts[outputPortSelector.portIndex];

    for (let i = 0; i < outputPortSelector.buttons.length; i++) {
        const button = outputPortSelector.buttons[i];
        const resource = button.dataset.resource || null;

        button.className = port.resource === resource ? 'activeOutputResource' : '';
        button.textContent = resource ? getResourceButtonText(building, resource) : 'None';
    }

    outputPortSelector.lastTick = tick;
}

function getResourceButtonText(building, resource) {
    const amount = building.simulation.outputBuffer.contents[resource] ?? 0;
    const capacity = building.simulation.outputBuffer.capacities[resource];

    return `${RESOURCE_DATA[resource].name} ${amount}/${capacity}`;
}

function updatePosition(building) {
    const bounds = gameCanvas.getBoundingClientRect();

    if (!getPortScreenPosition(building, PORT_TYPE.output, outputPortSelector.portIndex, camera, bounds, screenPosition)) {
        hide();
        return;
    }

    outputPortSelector.element.style.left = `${screenPosition.x}px`;
    outputPortSelector.element.style.top = `${screenPosition.y}px`;
}

function createTitle(text) {
    const title = document.createElement('div');

    title.className = 'selectorTitle';
    title.textContent = text;
    return title;
}

function createButton(resource) {
    const button = document.createElement('button');

    button.dataset.resource = resource ?? '';
    return button;
}

function handleClick(event) {
    if (event.target.tagName !== 'BUTTON') return;

    const building = constructionState.getBuilding(outputPortSelector.buildingKey);

    if (!building) {
        hide();
        return;
    }

    const resource = event.target.dataset.resource || null;

    setOutputPortResource(building, outputPortSelector.portIndex, resource);
    updateButtons(building, null);
}