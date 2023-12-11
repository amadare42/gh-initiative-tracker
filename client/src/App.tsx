import React, { useEffect, useState } from 'react';
import './App.scss';
import { Charlist } from './Components/Charlist';
import { DrawerContext } from './Components/RadialNumberSelect';
import { RoundCounter } from './Components/RoundCounter';
import { ButtonsList } from './Components/ButtonsList';
import { ManageButtons } from './Components/ManageButtons';
import { useDispatch } from 'react-redux';
import { connectAction, createRoomAction, joinRoomAction } from './store/serverConnectionSlice';
import { store } from './store';
import { ConnectionControl } from './Components/ConnectionControl';
import { useDeeplink } from './hooks/deeplink';
import { ElementsPanel } from './Components/ElementsPanel';
import { omitKeys } from './utils/pick';

function App() {

    useDeeplink();

    const [isDrawerOpened, setIsDrawerOpened] = useState(false);
    return (
        <div className="App">
            <DrawerContext.Provider value={ { isDrawerOpened, setIsDrawerOpened } }>
                <header className="App-header">
                    <ConnectionControl/>
                    <ManageButtons/>
                    <RoundCounter/>
                    <ElementsPanel />
                    <Charlist/>
                    <ButtonsList/>
                </header>
            </DrawerContext.Provider>
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
