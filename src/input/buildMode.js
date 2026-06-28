import * as THREE from 'three';
import {BUILD_CATEGORIES, BUILDING_CELL_SCALE, BUILDING_TYPES} from '../data/buildings.js';
import {buildMessage, gameCanvas} from '../etc/elements.js';
import {cameraController} from '../camera/camera.js';
import {constructionGrid} from '../moon/constructionGrid.js';
import {MOON_RADIUS} from '../moon/moon.js';
import {getSphericalCellFrame, getSphericalCellSize} from '../moon/sphericalCoordinates.js';
import {buildingMarkers} from '../render/buildingMarkers.js';
import {constructionState} from '../simulation/constructionState.js';
import {buildToolbar} from '../ui/buildToolbar.js';

const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1);

export const buildMode = {
    activeTool: null,
    buildingRotation: 0,
    pointerHeld: false,
    placementRequested: false,
    lastPlacedCell: '',
    previousPlanetary: null,
    activeCategoryId: null,
    itemsVisible: false,
    ghost: createGhost(),
    direction: new THREE.Quaternion(),
    normal: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    basis: new THREE.Matrix4(),
    size: {},
    update
};

buildingMarkers.group.add(buildMode.ghost);
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

    if (gameCanvas.hasPointerCapture(event.pointerId)) {
        gameCanvas.releasePointerCapture(event.pointerId);
    }
}

function handlePointerCancel() {
    buildMode.pointerHeld = false;
    buildMode.lastPlacedCell = '';
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
    constructionGrid.visible = Boolean(buildMode.activeTool);
    buildMode.ghost.visible = false;
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
        buildMode.ghost.visible = false;
        return;
    }

    const key = constructionState.getCellKey(cell);
    const occupied = constructionState.hasBuilding(key);
    const valid = buildMode.activeTool === 'demolish' ? occupied : !occupied;

    updateGhost(cell, valid);

    if (buildMode.activeTool === 'conveyor' && buildMode.pointerHeld && key !== buildMode.lastPlacedCell) {
        buildMode.placementRequested = true;
    }

    if (!buildMode.placementRequested) return;

    buildMode.placementRequested = false;
    buildMode.lastPlacedCell = key;

    if (!valid) {
        buildMessage.textContent = occupied ? 'Cell occupied' : 'Nothing to demolish';
        return;
    }

    if (buildMode.activeTool === 'demolish') {
        const removal = constructionState.removeBuilding(key);

        buildingMarkers.remove(removal);
        buildMessage.textContent = 'Building demolished';
        return;
    }

    if (!buildingMarkers.hasCapacity(buildMode.activeTool)) {
        buildMessage.textContent = 'Building limit reached';
        return;
    }

    const building = constructionState.addBuilding(
        buildMode.activeTool,
        cell,
        buildMode.buildingRotation
    );

    if (!buildingMarkers.add(building)) {
        constructionState.removeBuilding(key);
        buildMessage.textContent = 'Building limit reached';
        return;
    }

    buildMessage.textContent = `${BUILDING_TYPES[buildMode.activeTool].name} placed`;
}

function createGhost() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: '#67D68A',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const ghost = new THREE.Mesh(geometry, material);
    ghost.visible = false;
    return ghost;
}

function updateGhost(cell, valid) {
    getSphericalCellFrame(cell.latitude, cell.longitude, buildMode.normal, buildMode.east, buildMode.north);
    getSphericalCellSize(MOON_RADIUS + 0.016, buildMode.size);

    buildMode.ghost.position.copy(buildMode.normal).multiplyScalar(MOON_RADIUS + 0.016);
    buildMode.basis.makeBasis(buildMode.east, buildMode.north, buildMode.normal);
    buildMode.ghost.quaternion.setFromRotationMatrix(buildMode.basis);
    buildMode.direction.setFromAxisAngle(LOCAL_FORWARD, buildMode.buildingRotation * Math.PI * 0.5);
    buildMode.ghost.quaternion.multiply(buildMode.direction);
    buildMode.ghost.scale.set(buildMode.size.width * BUILDING_CELL_SCALE, buildMode.size.height * BUILDING_CELL_SCALE, 1);
    buildMode.ghost.material.color.set(valid ? '#67D68A' : '#D85C5C');
    buildMode.ghost.visible = true;
}