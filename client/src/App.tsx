import React, { useCallback, useEffect, useState } from 'react';
import './App.scss';
import { Charlist } from './Components/Charlist';
import { RoundCounter } from './Components/RoundCounter';
import { ButtonsList } from './Components/ButtonsList';
import { ManageButtons } from './Components/ManageButtons';
import { useDispatch } from 'react-redux';
import { connectAction, createRoomAction, joinRoomAction } from './store/serverConnectionSlice';
import { store } from './store';
import { ConnectionControl } from './Components/ConnectionControl';
import { useDeeplink } from './hooks/useDeeplink';
import { ElementsPanel } from './Components/ElementsPanel';
import { omitKeys } from './utils/pick';
import { OverlayContext } from './utils/overlay';
import { usePrefetchImages } from './Components/SelectAvatarList';
import { LocalizationProvider } from './localisation';
import { ChangeLocale } from './Components/ChangeLocale';

function App() {

    useDeeplink();
    usePrefetchImages();

    const [overlayName, setOverlayName] = useState<string>(null);
    const [overlayElement, setOverlayElement] = useState<JSX.Element>(null);
    const setOverlay = useCallback((element: JSX.Element, name: string) => {
        setOverlayElement(element);
        setOverlayName(name);
    }, []);

    const closeOverlay = useCallback(() => {
        setOverlayElement(null);
        setOverlayName(null);
        window.history.replaceState({}, '', '');
    }, []);

    useEffect(() => {
        if (overlayName) {
            window.history.pushState({}, '', ``);
            window.addEventListener("popstate", closeOverlay);
        } else {
            window.removeEventListener("popstate", closeOverlay);
            window.history.replaceState({}, '', '');
        }
    }, [overlayName]);

    return (
        <div className="App">
            <LocalizationProvider>
                <OverlayContext.Provider value={ { setOverlay } }>
                    <header className="App-header">
                        <ConnectionControl/>
                        <ManageButtons/>
                        <RoundCounter/>
                        <ElementsPanel/>
                        <Charlist/>
                        <ButtonsList/>
                        <ChangeLocale />

                        { overlayElement
                            ? <>
                                <div className={ 'overlay' } onClick={ () => setOverlayElement(null) }/>
                                { overlayElement }
                            </>
                            : null
                        }
                    </header>
                </OverlayContext.Provider>
                <Debug/>
            </LocalizationProvider>
        </div>
    );
}

function Debug() {
    const dispatch = useDispatch();
    useEffect(() => {
        window['wConnect'] = () => {
            dispatch(connectAction() as any);
        };
        window['wJoin'] = (roomId: string) => {
            dispatch(joinRoomAction({ roomId }) as any);
        };
        window['wCreate'] = () => {
            dispatch(createRoomAction({ state: omitKeys(store.getState().initiative, ['patchesQueue']) }) as any);
        };
    }, []);
    return null;
}

export default App;
