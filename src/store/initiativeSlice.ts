import { createAction, createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createAppSelector, RootState, store, useAppSelector } from './index';
import { createAppAsyncThunk } from './createAppAsyncThunk';
import { pushRoomStateAction } from './serverConnectionSlice';

export interface HistoryEntry {
    round: number;
    characters: HistoryCharacter[];
}

export interface HistoryCharacter {
    name: string;
    initiative: number;
    isEnemy: boolean;
    secondaryInitiative: number | null;
}

export interface Character {
    id: number;
    name: string;
    initiative: number | null;
    secondaryInitiative: number | null;
    ownerId: string | null;
    isEnemy: boolean;
    isActive: boolean;
    isDisabled: boolean;
}

export interface InitiativeState {
    characters: Character[];
    history: HistoryEntry[];
    nextCharacterId: number;
    activeCharacterId: number;
    round: number;
}

const initCharacters: Character[] = [
    { id: 0, name: 'Voidwarden', initiative: null, isEnemy: false },
    { id: 1, name: 'Demolitionist', initiative: null, isEnemy: false },
    { id: 2, name: 'Red Guard', initiative: null, isEnemy: false },
    { id: 3, name: 'Hatchet', initiative: null, isEnemy: false },
].map(c => ({
    ...c,
    secondaryInitiative: null,
    ownerId: null,
    isActive: true,
    isDisabled: false
}))

const initialState: InitiativeState = {
    characters: initCharacters,
    activeCharacterId: -1,
    nextCharacterId: initCharacters.length,
    round: 1,
    history: []
}
export const toggleDisabledAction = createAction<number>('toggleDisabled');
export const deleteCharacterAction = createAction<number>('deleteCharacter');
export const setInitiativeAction = createAppAsyncThunk('setInitiativeAction',
    async (payload: { id: number, initiative: number, ownerId: string, isSecondary: boolean }, { dispatch, getState }) => {
        dispatch(initiativeSliceActions.setInitiative(payload));
        const state = getState();
        if (!isInitiativeReadySelector(state.initiative)) {
            return;
        }
        if (state.initiative.activeCharacterId === -1) {
            dispatch(initiativeSliceActions.nextCharacter());
        }
    });

export const initiativeSlice = createSlice({
    name: 'initiative',
    initialState,
    extraReducers: (builder) => builder
        .addCase(toggleDisabledAction, (state, action) => {
            initiativeSlice.caseReducers.toggleDisabled(state, action);
        })
        .addCase(deleteCharacterAction, (state, action) => {
            initiativeSlice.caseReducers.removeActor(state, action);
        })
    ,
    reducers: {
        addActor: (state, action: PayloadAction<Partial<Omit<Character, 'id'>>>) => {
            state.characters.push({
                ownerId: null,
                isActive: false,
                id: state.nextCharacterId,
                isEnemy: false,
                name: '',
                initiative: null,
                secondaryInitiative: null,
                isDisabled: false,
                ...action.payload,
            } as Character);
            state.nextCharacterId++;
        },

        nextCharacter: (state) => {
            const isInitiativeReady = isInitiativeReadySelector(state);
            if (!isInitiativeReady) {
                return;
            }
            const sorted = getSortedCharacters(state.characters, isInitiativeReadySelector(state))
                .filter(actor => actor.initiative !== null && !actor.isDisabled);
            if (sorted.length === 0) {
                return;
            }

            let currentCharacterIdx = sorted.findIndex(actor => actor.id === state.activeCharacterId);
            if (currentCharacterIdx < 0) {
                currentCharacterIdx = sorted.findIndex(c => !c.isDisabled);
                if (currentCharacterIdx >= 0){
                    state.activeCharacterId = sorted[currentCharacterIdx].id;
                    return;
                }
            }

            const nextCharacterIdx = currentCharacterIdx + 1;
            if (nextCharacterIdx >= state.characters.length) {
                return;
            }

            state.activeCharacterId = sorted[nextCharacterIdx].id;
        },

        removeActor: (state, action: PayloadAction<number>) => {
            state.characters = state.characters.filter(actor => actor.id !== action.payload);
        },

        updateActor: (state, action: PayloadAction<Partial<Character>>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload.id);
            state.characters[actorIndex] = {
                ...state.characters[actorIndex],
                ...action.payload
            }
        },

        toggleDisabled: (state, action: PayloadAction<number>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload);
            state.characters[actorIndex].isDisabled = !state.characters[actorIndex].isDisabled;
        },
        setDisabled: (state, action: PayloadAction<{ id: number, isDisabled: boolean }>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload.id);
            state.characters[actorIndex].isDisabled = action.payload.isDisabled;
        },

        mutateActor: (state, action: PayloadAction<{ id: number, mutate: (actor: Character) => Character }>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload.id);
            state.characters[actorIndex] = action.payload.mutate(state.characters[actorIndex]);
        },

        setInitiative: (state, action: PayloadAction<{ id: number, initiative: number, ownerId: string, isSecondary: boolean }>) => {
            const character = state.characters.find(actor => actor.id === action.payload.id);
            if (!character)
                return;
            if (action.payload.isSecondary) {
                character.secondaryInitiative = action.payload.initiative;
            } else {
                character.initiative = action.payload.initiative;
            }
            character.ownerId = action.payload.ownerId;
        },

        nextRound: (state) => {
            state.history = getUpdatedHistory(state);
            state.round++;
            state.activeCharacterId = -1;
            state.characters = state.characters.map(actor => {
                return {
                    ...actor,
                    ownerId: null,
                    initiative: null,
                    secondaryInitiative: null
                }
            });

        },

        changeRound: (state, action: PayloadAction<number>) => {
            if (action.payload < 1) {
                return;
            }
            state.round = action.payload;
        },

        setActiveCharacter: (state, action: PayloadAction<number>) => {
            if (!isInitiativeReadySelector(state)) {
                return;
            }
            state.activeCharacterId = action.payload;
        },

        applyState: (state, action: PayloadAction<InitiativeState>) => {
            state.characters = action.payload.characters;
            state.activeCharacterId = action.payload.activeCharacterId;
            state.nextCharacterId = action.payload.nextCharacterId;
            state.round = action.payload.round;
        },

        clearAll: (state) => {
            state.characters = [];
            state.activeCharacterId = -1;
            state.nextCharacterId = 0;
            state.round = 1;
        },
        clearOwner: (state, action: PayloadAction<string>) => {
            state.characters = state.characters.map(actor => ({
                ...actor,
                ownerId: null
            }));
        }
    }
});

function getUpdatedHistory(state: InitiativeState) {
    const history = [...state.history];
    const historyEntry: HistoryEntry = {
        round: state.round,
        characters: state.characters.map(actor => ({
            name: actor.name,
            initiative: actor.initiative ?? 0,
            secondaryInitiative: actor.secondaryInitiative ?? 0,
            isEnemy: actor.isEnemy
        }))
    }

    const existingEntryIdx = history.findIndex(entry => entry.round === historyEntry.round);
    if (existingEntryIdx >= 0) {
        history[existingEntryIdx] = historyEntry;
    } else {
        history.push(historyEntry);
    }

    return history;
}

function initiativeSortPredicate(a: Character, b: Character) {
    const ai = (a.initiative ?? 0) + (a.secondaryInitiative ?? 0) * 0.01;
    const bi = (b.initiative ?? 0) + (b.secondaryInitiative ?? 0) * 0.01;
    return ai - bi;
}

function getSortedCharacters(characters: Character[], isInitiativeReady: boolean) {
    const disabledActors = characters
        .filter(actor => actor.isDisabled)
        .sort((a, b) => a.id - b.id);

    const actorsWithInitiative = characters
        .filter(actor => actor.initiative !== null && !actor.isDisabled);

    const actorsWithoutInitiative = characters
        .filter(actor => actor.initiative === null && !actor.isDisabled)
        .sort((a, b) => a.id - b.id);

    if (!isInitiativeReady) {
        actorsWithInitiative.sort((a, b) => a.id! - b.id!);
    } else {
        actorsWithInitiative.sort(initiativeSortPredicate);
    }
    return [
        ...disabledActors,
        ...actorsWithInitiative,
        ...actorsWithoutInitiative
    ];
}

export const useSelectedInitiativeState = <T>(selector: (state: InitiativeState) => T) => useAppSelector(s => selector(s.initiative));

export const isInitiativeReadySelector = createSelector(
    (state: InitiativeState) => state.characters,
    (characters) => characters.every(actor => actor.initiative !== null || actor.isDisabled)
)

export const isAllPlayersInitiativeReadySelector = createSelector(
    (state: InitiativeState) => state.characters,
    (characters) => characters
        .filter(actor => !actor.isEnemy)
        .every(actor => actor.initiative !== null || actor.isDisabled)
)

export const sortedCharactersSelector = createSelector(
    (state: InitiativeState) => state.characters, isInitiativeReadySelector,
    (characters, isInitiativeReady) => getSortedCharacters(characters, isInitiativeReady));
export const isLastActorSelector = createSelector(
    (state: InitiativeState) => state.activeCharacterId, sortedCharactersSelector,
    (activeCharacterId, characters) => {
        const currentCharacterIdx = characters.findIndex(actor => actor.id === activeCharacterId);
        return currentCharacterIdx + 1 >= characters.length && characters.length > 0;
    });


export const {
    addActor,
    removeActor,
    updateActor,
    nextRound,
    nextCharacter,
    toggleDisabled,
    applyState
} = initiativeSlice.actions;


export const initiativeSliceActions = initiativeSlice.actions;

export default initiativeSlice.reducer;
