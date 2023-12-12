import React, { useCallback } from 'react';
import { store, useAppDispatch, useAppSelector } from '../../store';
import {
    addActor,
    isInitiativeReadySelector,
    isLastActorSelector,
    nextCharacter,
    nextRound,
    useSelectedInitiativeState
} from '../../store/initiativeSlice';
import { uiStateActions } from '../../store/uiStateSlice';

import './styles.scss'
import { useLocalize } from '../../localisation';
import { AnimatedButton } from './AnimatedButton';

export function ButtonsList() {
    const dispatch = useAppDispatch();
    const isLastChar = useSelectedInitiativeState(isLastActorSelector);
    const isInitiativeReady = useSelectedInitiativeState(isInitiativeReadySelector);
    const showControls = useAppSelector(state => state.ui.isExtraControlsVisible);
    const t = useLocalize();
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

    return <div className={ 'ButtonsList-buttonsContainer' }>
        <AnimatedButton text={ t('Add Enemy') } shown={ showControls } onClick={ () => addChar(true) }/>
        <AnimatedButton text={ t('Add Player') } shown={ showControls } onClick={ () => addChar(false) }/>
        <AnimatedButton text={ t('Toggle History') } shown={ showControls && round > 1 } onClick={ toggleHistoryMode }/>
        <AnimatedButton text={ isLastChar ? t('Next Round') : t('Next Character') } shown={ isInitiativeReady } onClick={ () => dispatch(isLastChar ? nextRound() : nextCharacter()) }/>
    </div>
}
