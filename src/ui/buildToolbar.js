import {BUILD_CATEGORIES, BUILDING_DATA} from '../data/buildings.js';
import {buildToolbarElement} from '../etc/elements.js';

export const buildToolbar = {
    element: buildToolbarElement,
    itemRow: document.createElement('div'),
    categoryRow: document.createElement('div'),
    categoryButtons: new Map(),
    itemButtons: new Map(),
    demolishButton: createButton('X', 'X', 'toolbarAction'),
    setDisabled,
    setSelection
};

buildToolbar.itemRow.className = 'itemRow';
buildToolbar.categoryRow.className = 'categoryRow';
buildToolbar.demolishButton.dataset.action = 'demolish';
buildToolbar.element.classList.add('itemsHidden');

for (const category of BUILD_CATEGORIES) {
    const button = createButton(category.key, category.icon, 'categoryButton');

    button.title = category.name;
    button.dataset.categoryId = category.id;
    buildToolbar.categoryButtons.set(category.id, button);
    buildToolbar.categoryRow.append(button);
}

buildToolbar.categoryRow.append(buildToolbar.demolishButton);
buildToolbar.element.append(buildToolbar.itemRow, buildToolbar.categoryRow);

function setSelection({activeTool, categoryId, itemsVisible}) {
    setCategory(categoryId);
    setItemsVisible(itemsVisible);
    setActiveTool(activeTool);
}

function setCategory(categoryId) {
    if (!categoryId) {
        buildToolbar.itemButtons.clear();
        buildToolbar.itemRow.replaceChildren();

        for (const button of buildToolbar.categoryButtons.values()) button.classList.remove('activeCategory');
        return;
    }

    const activeCategory = BUILD_CATEGORIES.find((category) => category.id === categoryId);
    buildToolbar.itemButtons.clear();
    buildToolbar.itemRow.replaceChildren();

    for (let i = 0; i < activeCategory.buildings.length; i++) {
        const type = activeCategory.buildings[i];
        const definition = BUILDING_DATA[type];
        const button = createButton(`F${i + 1}`, definition.letter, 'itemButton');

        button.title = definition.name;
        button.dataset.buildingType = type;
        button.style.setProperty('--toolColor', definition.color);
        buildToolbar.itemButtons.set(type, button);
        buildToolbar.itemRow.append(button);
    }

    for (const [id, button] of buildToolbar.categoryButtons) {
        button.classList.toggle('activeCategory', id === categoryId);
    }
}

function setItemsVisible(visible) {
    buildToolbar.element.classList.toggle('itemsHidden', !visible);
}

function setActiveTool(type) {
    for (const [buttonType, button] of buildToolbar.itemButtons) {
        button.classList.toggle('activeTool', buttonType === type);
    }

    buildToolbar.demolishButton.classList.toggle('activeTool', type === 'demolish');
}

function setDisabled(isDisabled) {
    buildToolbar.element.classList.toggle('minimized', isDisabled);
    for (const button of buildToolbar.element.getElementsByTagName('button')) button.disabled = isDisabled;
}

function createButton(key, label, className) {
    const button = document.createElement('button');
    const keyLabel = document.createElement('span');
    const toolLabel = document.createElement('span');

    button.type = 'button';
    button.className = className;
    keyLabel.className = 'keyLabel';
    keyLabel.textContent = key;
    toolLabel.className = 'toolLabel';
    toolLabel.textContent = label;
    button.append(keyLabel, toolLabel);
    return button;
}