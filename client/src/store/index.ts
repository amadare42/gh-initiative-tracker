import { configureStore, createSelector } from '@reduxjs/toolkit';
import initiativeReducer from './initiativeSlice';
import uiStateReducer from './uiStateSlice';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { serverConnectionSliceReducer } from './serverConnectionSlice';
import { listenerMiddlewareInstance } from './middleware';

export const store = configureStore({
    reducer: {
        initiative: initiativeReducer,
        ui: uiStateReducer,
        connection: serverConnectionSliceReducer
    },
    middleware: gdm => gdm().concat(listenerMiddlewareInstance.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const createAppSelector = <T>(selector: (state: RootState) => T) => createSelector;
