import React, { useCallback } from 'react';
import { store, useAppDispatch, useAppSelector } from '../store';
import {
    addActor,
    isInitiativeReadySelector,
    isLastActorSelector,
    nextCharacter,
    nextRound,
    useSelectedInitiativeState
} from '../store/initiativeSlice';
import { uiStateActions } from '../store/uiStateSlice';

export function ButtonsList() {
    const dispatch = useAppDispatch();
    const isLastChar = useSelectedInitiativeState(isLastActorSelector);
    const isInitiativeReady = useSelectedInitiativeState(isInitiativeReadySelector);
    const showControls = useAppSelector(state => state.ui.isExtraControlsVisible);
    const addChar = useCallback((isEnemy: boolean) => {
        dispatch(addActor({
            name: isEnemy ? 'Enemy' : 'New Character',
            isEnemy: isEnemy,
        }));
    }, []);
    const inHistoryMode = useAppSelector(state => state.ui.isInHistoryMode);
    const round = useAppSelector(state => state.initiative.round);
    const toggleHistoryMode = useCallback(() => {
        const state = store.getState();
        if (state.ui.isInHistoryMode) {
            dispatch(uiStateActions.setHistoryMode(false));
        } else {
            dispatch(uiStateActions.historyBack({ currentRound: state.initiative.round }));
        }
    }, [inHistoryMode]);

    return <div className={ 'Charlist-buttonsContainer' }>
        { showControls ?
            <button className={ 'Charlist-button' } onClick={ () => addChar(true) }>Add Enemy</button> : null }
        { showControls ?
            <button className={ 'Charlist-button' } onClick={ () => addChar(false) }>Add Player</button> : null }
        { showControls && round > 1 ?
            <button className={ 'Charlist-button' } onClick={ () => toggleHistoryMode() }>Toggle History</button> : null }

        {
            isInitiativeReady ? <button className={ 'Charlist-button' }
                  onClick={ () => dispatch(isLastChar ? nextRound() : nextCharacter()) }>
                { isLastChar ? 'Next Round' : 'Next Character' }
            </button> : null
        }
    </div>
}
