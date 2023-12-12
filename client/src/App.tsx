import React, { useEffect, useState } from 'react';
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

    const [overlay, setOverlay] = useState<JSX.Element>(null);

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

                        { overlay
                            ? <>
                                <div className={ 'overlay' } onClick={ () => setOverlay(null) }/>
                                { overlay }
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
