import React, { useEffect, useState } from 'react';
import './App.scss';
import { Charlist } from './Components/Charlist';
import { NumberSelectOverlayContext } from './Components/RadialNumberSelect';
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

function App() {

    useDeeplink();

    const [isOverlayOpened, setIsOverlayOpened] = useState(false);
    return (
        <div className="App">
            <NumberSelectOverlayContext.Provider value={ { isOpened: isOverlayOpened, setIsOpened: setIsOverlayOpened } }>
                <header className="App-header">
                    <ConnectionControl/>
                    <ManageButtons/>
                    <RoundCounter/>
                    <ElementsPanel />
                    <Charlist/>
                    <ButtonsList/>
                </header>
            </NumberSelectOverlayContext.Provider>
            <Debug/>
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
