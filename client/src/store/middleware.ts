import { createListenerMiddleware } from '@reduxjs/toolkit';
import { pushRoomPatches } from './serverConnectionSlice';
import { store } from './index';
import { clearPatchQueue, getRoomHashSelector } from './initiativeSlice';

const pushPatches = () => {
    const state = store.getState();
    const patches = state.initiative.patchesQueue;
    if (!patches.length) {
        return;
    }
    const hash = getRoomHashSelector(state.initiative);
    store.dispatch(pushRoomPatches({
        patches: patches,
        hash
    }));
    store.dispatch(clearPatchQueue())
};
const throttledPushState = () => {
    if (pushStateTimeout) {
        clearTimeout(pushStateTimeout);
    }
    pushStateTimeout = setTimeout(pushPatches, 0);
}
let pushStateTimeout: ReturnType<typeof setTimeout> | undefined;

export const listenerMiddlewareInstance = createListenerMiddleware();
listenerMiddlewareInstance.startListening({
    predicate: a => a.type.startsWith('initiative/') && !a.type.endsWith('applyState'),
    effect: (action, { dispatch }) => {
        throttledPushState();
    }
});
listenerMiddlewareInstance.startListening({
    predicate: a => a.type === "serverConnection/setConnectionId",
    effect: (action, { dispatch }) => {
        localStorage.setItem('store.serverConnection.connectionId', action.payload);
    }
});

listenerMiddlewareInstance.startListening({
    predicate: a => a.type.startsWith('initiative/'),
    effect: (action, { dispatch }) => {
        localStorage.setItem('store.initiative', JSON.stringify(store.getState().initiative));
    }
});
