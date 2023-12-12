import { createContext, useContext } from 'react';

export const OverlayContext = createContext({ setOverlay(overlay: JSX.Element) {} });

export function useOverlay(overlay: (close: () => void) => JSX.Element) {

    const { setOverlay } = useContext(OverlayContext);
    const close = () => setOverlay(null);
    const open = () => setOverlay(overlay(close));

    return {
        open, close
    }
}
