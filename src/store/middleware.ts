import { createListenerMiddleware } from '@reduxjs/toolkit';
import { pushRoomStateAction } from './serverConnectionSlice';
import { store } from './index';

const pushState = () => store.dispatch(pushRoomStateAction({ state: store.getState().initiative }));
const throttledPushState = () => {
    if (pushStateTimeout) {
        clearTimeout(pushStateTimeout);
    }
    pushStateTimeout = setTimeout(pushState, 0);
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
