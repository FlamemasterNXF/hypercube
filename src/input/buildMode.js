import {BUILD_CATEGORIES, BUILDING_DATA} from '../data/buildings.js';
import {buildMessage, gameCanvas} from '../etc/elements.js';
import {cameraController} from '../camera/camera.js';
import {constructionGrid} from '../moon/constructionGrid.js';
import {buildingMarkers} from '../render/buildingMarkers.js';
import {placementGhost} from '../render/placementGhost.js';
import {constructionState} from '../simulation/constructionState.js';
import {conveyorPlacement} from './conveyorPlacement.js';
import {buildToolbar} from '../ui/buildToolbar.js';

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

buildingMarkers.group.add(placementGhost.mesh);
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
    conveyorPlacement.reset();

    if (gameCanvas.hasPointerCapture(event.pointerId)) {
        gameCanvas.releasePointerCapture(event.pointerId);
    }
}

function handlePointerCancel() {
    buildMode.pointerHeld = false;
    buildMode.lastPlacedCell = '';
    conveyorPlacement.reset();
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
    conveyorPlacement.reset();
    constructionGrid.visible = Boolean(buildMode.activeTool);
    placementGhost.hide();
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

    const key = constructionState.getCellKey(cell);
    const occupied = constructionState.hasBuilding(key);
    const disconnectedConveyor = conveyorPlacement.isDisconnected(buildMode.activeTool, buildMode.pointerHeld, cell);
    const valid = buildMode.activeTool === 'demolish' ? occupied : !occupied && !disconnectedConveyor;

    placementGhost.update(cell, buildMode.activeTool, conveyorPlacement.getPreviewRotation(buildMode.activeTool, buildMode.buildingRotation, cell), valid);

    if (conveyorPlacement.shouldPlaceDuringDrag(buildMode.activeTool, buildMode.pointerHeld, key, buildMode.lastPlacedCell)) {
        buildMode.placementRequested = true;
    }

    if (!buildMode.placementRequested) return;

    buildMode.placementRequested = false;
    buildMode.lastPlacedCell = key;

    if (!valid) {
        buildMessage.textContent = getInvalidPlacementMessage(occupied, disconnectedConveyor);
        return;
    }

    if (buildMode.activeTool === 'demolish') {
        const removal = constructionState.removeBuilding(key);

        if (!removal) {
            buildMessage.textContent = 'Nothing to demolish';
            return;
        }

        buildingMarkers.remove(removal);
        buildMessage.textContent = 'Building demolished';
        return;
    }

    const rotation = conveyorPlacement.getPlacementRotation(buildMode.activeTool, buildMode.buildingRotation, cell);
    const building = constructionState.addBuilding(buildMode.activeTool, cell, rotation);

    if (!building) {
        buildMessage.textContent = 'Invalid placement';
        return;
    }

    buildingMarkers.add(building);
    conveyorPlacement.completePlacement(buildMode.activeTool, building, cell);

    buildMessage.textContent = `${BUILDING_DATA[buildMode.activeTool].name} placed`;
}

function getInvalidPlacementMessage(occupied, disconnectedConveyor) {
    if (occupied) return 'Cell occupied';
    if (disconnectedConveyor) return 'Disconnected belt direction';
    return 'Nothing to demolish';
}