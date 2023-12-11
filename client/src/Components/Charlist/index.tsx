import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FlipMove from 'react-flip-move';
import { useAppDispatch, useAppSelector } from '../../store';
import {
    changeActorName,
    Character,
    initiativeSliceActions as sliceActions,
    isAllPlayersInitiativeReadySelector,
    isInitiativeReadySelector,
    setInitiativeAction,
    sortedCharactersSelector,
    useSelectedInitiativeState
} from '../../store/initiativeSlice';
import { CharItem } from '../CharItem';

import './styles.scss';

function nop() {
}


export function Charlist() {
    const dispatch = useAppDispatch();

    // store state
    const characters = useSelectedInitiativeState(sortedCharactersSelector);
    const playerId = useAppSelector(state => state.connection.connectionId);
    const isInitiativeReady = useSelectedInitiativeState(isInitiativeReadySelector);
    const isPlayerInitiativeReady = useSelectedInitiativeState(isAllPlayersInitiativeReadySelector);

    // character id
    const activeCharId = useAppSelector(state => state.initiative.activeCharacterId);
    const setActiveCharId = useCallback((id: number) => dispatch(sliceActions.setActiveCharacter(id)), [dispatch]);

    const setInitiative = useCallback((id: number, value: number, isSecondary: boolean) => {
        dispatch(setInitiativeAction({ id, initiative: value, ownerId: playerId, isSecondary }));
        dispatch(sliceActions.setDisabled({ id, isDisabled: false }));
    }, [dispatch, playerId]);
    const changeName = useCallback((id: number, name: string) => dispatch(changeActorName({ id, name })), []);

    const [editingId, setEditingId] = useState<number | null>(null);

    const scrollableRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!isInitiativeReady) {
            setTimeout(() => scrollableRef.current?.parentElement.scrollTo({ top: 0, behavior: 'smooth' }), 50);
        }
    }, [isInitiativeReady]);

    const isInHistoryMode = useAppSelector(state => state.ui.isInHistoryMode);
    const historyRoundNo = useAppSelector(state => state.ui.historyRound);
    const history = useAppSelector(state => state.initiative.history);
    const historyCharacters = useMemo(() => history.find(h => h.round === historyRoundNo)?.characters ?? [], [history, historyRoundNo]);

    const showControls = useAppSelector(state => state.ui.isExtraControlsVisible);
    const charElements = isInHistoryMode
        ? historyCharacters.map((char, idx) => <CharItem key={ idx }
                                                         id={idx}
                                                         hideInitiative={ false }
                                                         isActive={ false }
                                                         editingId={ null }
                                                         setEditingId={ nop }
                                                         showControls={ false }
                                                         changeName={ nop }
                                                         isDisabled={ false }
                                                         setInitiative={ nop }
                                                         initiative={ char.initiative }
                                                         secondaryInitiative={ char.secondaryInitiative }
                                                         name={ char.name }
                                                         isEnemy={ char.isEnemy }
                                                         haveSecondaryInitiative={ !!char.secondaryInitiative }
                                                         setActive={ nop }
        />)
        : characters.map(char => <CharItem key={ char.id } { ...char }
                                           hideInitiative={ hideInitiativePredicate(char, isPlayerInitiativeReady, isInitiativeReady, playerId) }
                                           isActive={ char.id == activeCharId }
                                           editingId={ editingId }
                                           setEditingId={ setEditingId }
                                           showControls={ showControls }
                                           changeName={ changeName }
                                           isDisabled={ char.isDisabled }
                                           setInitiative={ setInitiative }
                                           haveSecondaryInitiative={ isInitiativeReady && shouldHaveSecondaryInitiative(char, characters) }
                                           setActive={ setActiveCharId }
        />);

    return <div className={ 'Charlist-wrapper' }>
        <div className={ 'Charlist-scrollable' } ref={ scrollableRef }>
            <FlipMove>
                { charElements }
            </FlipMove>
        </div>
        {/*<hr style={{ width: '98%', position: 'relative', bottom: 0, overflow: 'hidden' }}/>*/ }
    </div>
}

function shouldHaveSecondaryInitiative(char: Character, characters: Character[]) {
    if (char.isEnemy) {
        return false;
    }
    if (char.initiative === null) {
        return false;
    }
    return characters.some(other =>
        other.id !== char.id
        && other.initiative === char.initiative);
}

function hideInitiativePredicate(char: Character, isPlayerInitiativeReady: boolean, isInitiativeReady: boolean, playerId: string) {
    if (char.ownerId === playerId || !char.ownerId) {
        return false;
    }

    if (char.isEnemy) {
        return !isPlayerInitiativeReady;
    }

    return !isInitiativeReady;
}
