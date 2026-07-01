import {BUILDING_DATA} from '../data/buildings.js';
import {constructionState} from '../simulation/constructionState.js';
import {conveyorPlacement} from './conveyorPlacement.js';
import {constructionOperations} from './constructionOperations.js';

export const placementActions = {
    getPreview,
    commit,
    reset
};

function getPreview(context) {
    const key = constructionState.getCellKey(context.cell);
    const occupied = constructionState.hasBuilding(key);
    const inputPortTarget = conveyorPlacement.getInputPortTarget(
        context.tool,
        context.pointerHeld,
        context.cell,
        context.pointerClientX,
        context.pointerClientY,
        context.camera,
        context.bounds
    );
    const disconnectedConveyor = conveyorPlacement.isDisconnected(context.tool, context.pointerHeld, context.cell);
    const valid = context.tool === 'demolish'
        ? occupied
        : Boolean(inputPortTarget) || !occupied && !disconnectedConveyor;

    return {
        tool: context.tool,
        cell: context.cell,
        key,
        rotation: context.rotation,
        occupied,
        inputPortTarget,
        disconnectedConveyor,
        valid,
        ghostVisible: !inputPortTarget,
        ghostRotation: conveyorPlacement.getPreviewRotation(context.tool, context.rotation, context.cell),
        shouldPlaceDuringDrag: conveyorPlacement.shouldPlaceDuringDrag(context.tool, context.pointerHeld, key, context.lastPlacedCell)
    };
}

function commit(preview) {
    if (!preview.valid) {
        return {
            message: getInvalidPlacementMessage(preview)
        };
    }

    if (preview.inputPortTarget) {
        return {
            message: constructionOperations.linkConveyorToInputPort(preview.inputPortTarget) ? 'Port linked' : 'Invalid port link'
        };
    }

    if (preview.tool === 'demolish') {
        const removal = constructionOperations.demolish(preview.key);

        return {
            message: removal ? 'Building demolished' : 'Nothing to demolish'
        };
    }

    const rotation = conveyorPlacement.getPlacementRotation(preview.tool, preview.rotation, preview.cell);
    const building = constructionOperations.place(preview.tool, preview.cell, rotation);

    return {
        message: building ? `${BUILDING_DATA[preview.tool].name} placed` : 'Invalid placement'
    };
}

function reset() {
    conveyorPlacement.reset();
}

function getInvalidPlacementMessage(preview) {
    if (preview.occupied) return 'Cell occupied';
    if (preview.disconnectedConveyor) return 'Disconnected belt direction';
    return 'Nothing to demolish';
}