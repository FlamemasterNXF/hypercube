import * as THREE from 'three';
import {buildingMarkers} from './buildingMarkers.js';
import {conveyorMarkers} from './conveyorMarkers.js';
import {portMarkers} from './portMarkers.js';
import {statusMarkers} from './statusMarkers.js';

export const constructionDisplay = {
    group: new THREE.Group(),
    addBuilding,
    addPlacementGhost,
    applyConveyorChanges,
    removeBuilding,
    setLocalDetailVisible,
    update
};

constructionDisplay.group.add(buildingMarkers.group, conveyorMarkers.group, portMarkers.group, statusMarkers.group);

function addBuilding(building) {
    buildingMarkers.add(building);
    statusMarkers.add(building);
    portMarkers.rebuild();
}

function removeBuilding(removal) {
    buildingMarkers.remove(removal);
    statusMarkers.remove(removal);
    portMarkers.rebuild();
}

function applyConveyorChanges(changes) {
    for (const building of changes.buildings) {
        buildingMarkers.update(building);
    }

    if (changes.topologyChanged) conveyorMarkers.rebuild();
}

function addPlacementGhost(mesh) {
    buildingMarkers.group.add(mesh);
}

function setLocalDetailVisible(visible) {
    portMarkers.setVisible(visible);
}

function update() {
    statusMarkers.update();
}