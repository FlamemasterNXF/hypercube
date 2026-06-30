import {constructionDisplay} from '../render/constructionDisplay.js';
import {constructionState} from '../simulation/constructionState.js';
import {conveyorPlacement} from './conveyorPlacement.js';

export const constructionOperations = {
    demolish,
    place
};

function demolish(key) {
    const building = constructionState.getBuilding(key);

    conveyorPlacement.disconnect(building);

    const removal = constructionState.removeBuilding(key);

    if (!removal) {
        constructionDisplay.applyConveyorChanges(conveyorPlacement.getAndResetChanges());
        return null;
    }

    constructionDisplay.removeBuilding(removal);
    constructionDisplay.applyConveyorChanges(conveyorPlacement.getAndResetChanges());
    return removal;
}

function place(type, cell, rotation) {
    const building = constructionState.addBuilding(type, cell, rotation);

    if (!building) {
        constructionDisplay.applyConveyorChanges(conveyorPlacement.getAndResetChanges());
        return null;
    }

    constructionDisplay.addBuilding(building);
    conveyorPlacement.completePlacement(type, building, cell);
    constructionDisplay.applyConveyorChanges(conveyorPlacement.getAndResetChanges());
    return building;
}