import { createContext, useContext } from 'react';

export const OverlayContext = createContext({ setOverlay(overlay: JSX.Element, name: string) {} });

export function useOverlay(name: string, overlay: (close: () => void) => JSX.Element) {

    const { setOverlay } = useContext(OverlayContext);
    const close = () => setOverlay(null, null);
    const open = () => setOverlay(overlay(close), name);

    return {
        open, close
    }
}
