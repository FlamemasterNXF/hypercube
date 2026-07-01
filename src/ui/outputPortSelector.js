import {camera, cameraController} from '../camera/camera.js';
import {getPortScreenPosition} from '../construction/portLayout.js';
import {RESOURCE_DATA} from '../data/resources.js';
import {constructionState} from '../simulation/constructionState.js';
import {PORT_TYPE, setOutputPortResource} from '../simulation/ports.js';
import {gameCanvas, outputPortSelectorElement} from './elements.js';

const screenPosition = {x: 0, y: 0};

export const outputPortSelector = {
    element: outputPortSelectorElement,
    target: null,
    view: null,
    lastTick: null,
    show,
    hide,
    update
};

outputPortSelector.element.className = 'selectorHidden';
outputPortSelector.element.addEventListener('click', handleClick);

function show(buildingKey, portIndex) {
    const target = {
        buildingKey,
        portIndex
    };
    const building = getTargetBuilding(target);

    if (!isValidTarget(building, target)) {
        hide();
        return;
    }

    outputPortSelector.target = target;
    outputPortSelector.view = createSelectorView(building, target);
    outputPortSelector.lastTick = null;
    outputPortSelector.element.className = '';
    outputPortSelector.element.replaceChildren(...outputPortSelector.view.elements);
    updateView(building, target);
    updatePosition(building, target);
}

function hide() {
    outputPortSelector.target = null;
    outputPortSelector.view = null;
    outputPortSelector.lastTick = null;
    outputPortSelector.element.className = 'selectorHidden';
    outputPortSelector.element.replaceChildren();
}

function update(tick) {
    const target = outputPortSelector.target;

    if (!target) return;

    const building = getTargetBuilding(target);

    if (!isValidTarget(building, target) || cameraController.planetary) {
        hide();
        return;
    }

    if (!updatePosition(building, target)) return;
    if (outputPortSelector.lastTick === tick) return;

    updateView(building, target);
    outputPortSelector.lastTick = tick;
}

function getTargetBuilding(target) {
    return constructionState.getBuilding(target.buildingKey);
}

function isValidTarget(building, target) {
    return Boolean(building?.simulation.outputPorts[target.portIndex]);
}

function createSelectorView(building, target) {
    const elements = [createTitle(`Output Port ${target.portIndex + 1}`)];
    const buttons = [createButtonView(null)];
    const resources = Object.keys(building.simulation.outputBuffer.capacities);

    for (let i = 0; i < resources.length; i++) {
        buttons.push(createButtonView(resources[i]));
    }

    for (let i = 0; i < buttons.length; i++) {
        elements.push(buttons[i].element);
    }

    return {
        elements,
        buttons
    };
}

function updateView(building, target) {
    const port = building.simulation.outputPorts[target.portIndex];
    const buttons = outputPortSelector.view.buttons;

    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];

        button.element.className = port.resource === button.resource ? 'activeOutputResource' : '';
        button.element.textContent = button.resource ? getResourceButtonText(building, button.resource) : 'None';
    }
}

function getResourceButtonText(building, resource) {
    const amount = building.simulation.outputBuffer.contents[resource] ?? 0;
    const capacity = building.simulation.outputBuffer.capacities[resource];

    return `${RESOURCE_DATA[resource].name} ${amount}/${capacity}`;
}

function updatePosition(building, target) {
    const bounds = gameCanvas.getBoundingClientRect();

    if (!getPortScreenPosition(building, PORT_TYPE.output, target.portIndex, camera, bounds, screenPosition)) {
        hide();
        return false;
    }

    outputPortSelector.element.style.left = `${screenPosition.x}px`;
    outputPortSelector.element.style.top = `${screenPosition.y}px`;
    return true;
}

function createTitle(text) {
    const title = document.createElement('div');

    title.className = 'selectorTitle';
    title.textContent = text;
    return title;
}

function createButtonView(resource) {
    const element = document.createElement('button');

    element.dataset.resource = resource ?? '';

    return {
        resource,
        element
    };
}

function handleClick(event) {
    if (event.target.tagName !== 'BUTTON') return;

    const target = outputPortSelector.target;

    if (!target) return;

    const building = getTargetBuilding(target);

    if (!isValidTarget(building, target)) {
        hide();
        return;
    }

    const resource = event.target.dataset.resource || null;

    if (!setOutputPortResource(building, target.portIndex, resource)) return;

    updateView(building, target);
    outputPortSelector.lastTick = null;
}