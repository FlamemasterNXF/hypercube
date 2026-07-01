import {BUILD_CATEGORIES} from '../data/buildings.js';
import {buildMessage, gameCanvas} from '../ui/elements.js';
import {camera, cameraController} from '../camera/camera.js';
import {constructionGrid} from '../moon/constructionGrid.js';
import {placementGhost} from '../render/placementGhost.js';
import {placementActions} from '../construction/placementActions.js';
import {buildToolbar} from '../ui/buildToolbar.js';
import {outputPortSelector} from '../ui/outputPortSelector.js';

export const buildMode = {
    activeTool: null,
    buildingRotation: 0,
    pointerHeld: false,
    placementRequested: false,
    lastPlacedCell: '',
    previousPlanetary: null,
    activeCategoryId: null,
    itemsVisible: false,
    update
};

gameCanvas.addEventListener('pointerdown', handlePointerDown);
gameCanvas.addEventListener('pointerup', handlePointerUp);
gameCanvas.addEventListener('pointercancel', handlePointerCancel);
window.addEventListener('keydown', handleKeyDown);
buildToolbar.element.addEventListener('click', handleToolbarClick);

function handlePointerDown(event) {
    if (event.button !== 0 || !buildMode.activeTool) return;
    buildMode.pointerHeld = true;
    buildMode.placementRequested = true;
    gameCanvas.setPointerCapture(event.pointerId);
}

function handlePointerUp(event) {
    if (!buildMode.pointerHeld) return;

    buildMode.pointerHeld = false;
    buildMode.lastPlacedCell = '';
    placementActions.reset();

    if (gameCanvas.hasPointerCapture(event.pointerId)) {
        gameCanvas.releasePointerCapture(event.pointerId);
    }
}

function handlePointerCancel() {
    buildMode.pointerHeld = false;
    buildMode.lastPlacedCell = '';
    placementActions.reset();
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    const category = BUILD_CATEGORIES.find((entry) => entry.key === key);
    const itemKey = /^f[1-9]$/.test(key);

    if (cameraController.planetary && (category || itemKey || key === 'x')) return;

    if (category) {
        toggleCategory(category.id);
        return;
    }

    if (itemKey) {
        const activeCategory = getActiveCategory();

        if (!activeCategory) return;

        const i = Number(key.slice(1)) - 1;
        const type = activeCategory.buildings[i];

        if (type) selectTool(type);
        event.preventDefault();
        return;
    }

    if (key === 'x') {
        toggleDemolition();
        return;
    }

    if (key === 'escape') {
        selectTool(null);
        return;
    }

    if (key === 'r' && buildMode.activeTool && buildMode.activeTool !== 'demolish') {
        buildMode.buildingRotation = (buildMode.buildingRotation + 1) % 4;
    }
}

function handleToolbarClick(event) {
    const button = getEventButton(event);

    if (!button || button.disabled) return;

    if (button.dataset.categoryId) {
        toggleCategory(button.dataset.categoryId);
        return;
    }

    if (button.dataset.buildingType) {
        selectTool(button.dataset.buildingType);
        return;
    }

    if (button.dataset.action === 'demolish') {
        toggleDemolition();
    }
}

function getEventButton(event) {
    let element = event.target;

    while (element && element !== buildToolbar.element) {
        if (element.tagName === 'BUTTON') return element;
        element = element.parentElement;
    }

    return null;
}

function toggleCategory(categoryId) {
    if (buildMode.activeCategoryId === categoryId && buildMode.itemsVisible) {
        clearSelection();
        return;
    }

    buildMode.activeCategoryId = categoryId;
    buildMode.itemsVisible = true;
    buildMode.activeTool = null;
    updatePlacementState();
    buildMessage.textContent = '';
}

function selectTool(type) {
    if (type && cameraController.planetary) {
        buildMessage.textContent = 'Zoom in to enter build mode';
        return;
    }

    buildMode.activeTool = type;
    updatePlacementState();
}

function toggleDemolition() {
    if (buildMode.activeTool === 'demolish') {
        clearSelection();
        return;
    }

    buildMode.activeCategoryId = null;
    buildMode.itemsVisible = false;
    buildMode.activeTool = 'demolish';
    updatePlacementState();
}

function clearSelection() {
    buildMode.activeCategoryId = null;
    buildMode.itemsVisible = false;
    buildMode.activeTool = null;
    updatePlacementState();
}

function updatePlacementState() {
    buildMode.placementRequested = false;
    buildMode.pointerHeld = false;
    buildMode.lastPlacedCell = '';
    placementActions.reset();
    constructionGrid.visible = Boolean(buildMode.activeTool);
    placementGhost.hide();
    outputPortSelector.hide();
    cameraController.setBuildMode(Boolean(buildMode.activeTool));
    buildToolbar.setSelection({
        activeTool: buildMode.activeTool,
        categoryId: buildMode.activeCategoryId,
        itemsVisible: buildMode.itemsVisible
    });

    if (buildMode.activeTool === 'demolish') {
        buildMessage.textContent = 'Select a building to demolish it // Esc to exit';
    } else if (buildMode.activeTool) {
        buildMessage.textContent = 'R to rotate // Esc to exit';
    } else {
        buildMessage.textContent = '';
    }
}

function getActiveCategory() {
    return BUILD_CATEGORIES.find((category) => category.id === buildMode.activeCategoryId);
}

function update() {
    const planetary = cameraController.planetary;

    if (planetary !== buildMode.previousPlanetary) {
        buildMode.previousPlanetary = planetary;
        buildToolbar.setDisabled(planetary);
    }

    if (planetary && buildMode.activeTool) {
        clearSelection();
        return;
    }

    const cell = cameraController.hoveredCell;

    if (!buildMode.activeTool || !cell) {
        placementGhost.hide();
        return;
    }

    const preview = placementActions.getPreview({
        tool: buildMode.activeTool,
        cell,
        rotation: buildMode.buildingRotation,
        pointerHeld: buildMode.pointerHeld,
        lastPlacedCell: buildMode.lastPlacedCell,
        pointerClientX: cameraController.pointerClientX,
        pointerClientY: cameraController.pointerClientY,
        camera,
        bounds: gameCanvas.getBoundingClientRect()
    });

    updatePlacementGhost(preview);

    if (preview.shouldPlaceDuringDrag) {
        buildMode.placementRequested = true;
    }

    if (!buildMode.placementRequested) return;

    buildMode.placementRequested = false;
    buildMode.lastPlacedCell = preview.key;

    const result = placementActions.commit(preview);
    buildMessage.textContent = result.message;
}

function updatePlacementGhost(preview) {
    if (!preview.ghostVisible) {
        placementGhost.hide();
        return;
    }
    placementGhost.update(preview.cell, preview.tool, preview.ghostRotation, preview.valid);
}