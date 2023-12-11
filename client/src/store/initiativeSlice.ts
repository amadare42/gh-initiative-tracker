import { createAction, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useAppSelector } from './index';
import { createAppAsyncThunk } from './createAppAsyncThunk';
import * as JsonPatch from 'fast-json-patch';

export interface HistoryEntry {
    round: number;
    characters: HistoryCharacter[];
    elementStates: ElementState[];
}

const ElementsCount = 6;

export enum ElementState {
    Inert,
    Waning,
    Strong
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
    elementStates: ElementState[];
    patchesQueue: JsonPatch.Operation[];
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
    history: [],
    elementStates: Array.from({ length: ElementsCount }, () => ElementState.Inert),
    patchesQueue: []
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
            const newCharacter: Character = {
                ownerId: null,
                isActive: false,
                id: state.nextCharacterId,
                isEnemy: false,
                name: '',
                initiative: null,
                secondaryInitiative: null,
                isDisabled: false,
                ...action.payload,
            };
            // TODO: apply patch instead of making change and applying patch separately
            state.characters.push(newCharacter);
            state.nextCharacterId++;
            updateQueue(state, {
                op: 'add',
                path: `/characters/-`,
                value: newCharacter
            }, {
                op: 'replace',
                path: `/nextCharacterId`,
                value: state.nextCharacterId
            });
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
                if (currentCharacterIdx >= 0) {
                    state.activeCharacterId = sorted[currentCharacterIdx].id;
                    return;
                }
            }

            const nextCharacterIdx = currentCharacterIdx + 1;
            if (nextCharacterIdx >= state.characters.length) {
                return;
            }

            state.activeCharacterId = sorted[nextCharacterIdx].id;
            updateQueue(state, {
                op: 'replace',
                path: `/nextCharacterId`,
                value: state.nextCharacterId
            });
        },

        removeActor: (state, action: PayloadAction<number>) => {
            state.characters = state.characters.filter(actor => actor.id !== action.payload);
            updateQueue(state, {
                op: 'remove',
                path: `$.characters[?(@.id==${action.payload})]`
            })
        },

        changeActorName: (state, action: PayloadAction<{ id: number, name: string }>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload.id);
            state.characters[actorIndex].name = action.payload.name;
            updateQueue(state, {
                op: 'replace',
                path: `$.characters[?(@.id==${action.payload.id})].name`,
                value: action.payload.name
            });
        },

        toggleDisabled: (state, action: PayloadAction<number>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload);
            state.characters[actorIndex].isDisabled = !state.characters[actorIndex].isDisabled;
            updateQueue(state, {
                op: 'replace',
                path: `$.characters[?(@.id==${action.payload})].isDisabled`,
                value: state.characters[actorIndex].isDisabled
            });
        },

        setDisabled: (state, action: PayloadAction<{ id: number, isDisabled: boolean }>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload.id);
            state.characters[actorIndex].isDisabled = action.payload.isDisabled;
            updateQueue(state, {
                op: 'replace',
                path: `$.characters[?(@.id==${action.payload})].isDisabled`,
                value: action.payload.isDisabled
            });
        },

        setInitiative: (state, action: PayloadAction<{ id: number, initiative: number, ownerId: string, isSecondary: boolean }>) => {
            const character = state.characters.find(actor => actor.id === action.payload.id);
            if (!character)
                return;
            const basePath = `$.characters[?(@.id==${action.payload.id})]`;
            const patches: JsonPatch.Operation[] = [];

            if (action.payload.isSecondary) {
                character.secondaryInitiative = action.payload.initiative;
                patches.push({
                    op: 'replace',
                    path: `${basePath}.secondaryInitiative`,
                    value: action.payload.initiative
                });
            } else {
                character.initiative = action.payload.initiative;
                patches.push({
                    op: 'replace',
                    path: `${basePath}.initiative`,
                    value: action.payload.initiative
                });
            }
            character.ownerId = action.payload.ownerId;
            patches.push({
                op: 'replace',
                path: `${basePath}.ownerId`,
                value: action.payload.ownerId
            });
            updateQueue(state, ...patches);
        },
        setElementState: (state, action: { payload: { element: number, state: ElementState } }) => {
            state.elementStates[action.payload.element] = action.payload.state;
            updateQueue(state, {
                op: 'replace',
                path: `$.elementStates[${action.payload.element}]`,
                value: action.payload.state
            });
        },
        nextRound: (state) => {
            state.history = updateQueuePrefixed(state, '/history', state.history, getUpdatedHistory(state));

            state.round++;
            updateQueue(state, {
                op: 'replace',
                path: `/round`,
                value: state.round
            });

            state.activeCharacterId = -1;
            updateQueue(state, {
                op: 'replace',
                path: `/activeCharacterId`,
                value: state.activeCharacterId
            });

            state.characters = state.characters.map(actor => {
                updateQueue(state, ...['ownerId', 'initiative', 'secondaryInitiative'].map(prop => ({
                    op: 'replace',
                    path: `/characters/*/${prop}`,
                    value: null
                } as JsonPatch.Operation)));

                return {
                    ...actor,
                    ownerId: null,
                    initiative: null,
                    secondaryInitiative: null
                }
            });

            state.elementStates = state.elementStates.map(e => Math.max(e - 1, ElementState.Inert));
            updateQueue(state, {
                op: 'replace',
                path: `/elementStates`,
                value: state.elementStates
            });
        },

        changeRound: (state, action: PayloadAction<number>) => {
            if (action.payload < 1) {
                return;
            }
            state.round = action.payload;
            updateQueue(state, {
                op: 'replace',
                path: `/round`,
                value: state.round
            });
        },

        setActiveCharacter: (state, action: PayloadAction<number>) => {
            if (!isInitiativeReadySelector(state)) {
                return;
            }
            state.activeCharacterId = action.payload;
            updateQueue(state, {
                op: 'replace',
                path: `/activeCharacterId`,
                value: state.activeCharacterId
            });
        },

        applyState: (state, action: PayloadAction<InitiativeState>) => {
            state.characters = action.payload.characters;
            state.activeCharacterId = action.payload.activeCharacterId;
            state.nextCharacterId = action.payload.nextCharacterId;
            state.round = action.payload.round;
            state.elementStates = action.payload.elementStates;
        },

        applyPatches: (state, action: PayloadAction<JsonPatch.Operation[]>) => {
            JsonPatch.applyPatch(state, action.payload);
            if (action.payload.some(p => p.path === '/characters')) {
                state.characters = [...state.characters];
            }
            if (action.payload.some(p => p.path === '/elementStates')) {
                state.elementStates = [...state.elementStates];
            }
            if (action.payload.some(p => p.path === '/history')) {
                state.history = [...state.history];
            }
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
        })),
        elementStates: state.elementStates.map(e => e)
    }

    const existingEntryIdx = history.findIndex(entry => entry.round === historyEntry.round);
    if (existingEntryIdx >= 0) {
        history[existingEntryIdx] = historyEntry;
    } else {
        history.push(historyEntry);
    }

    return history;
}

function updateQueuePrefixed<T>(state: InitiativeState, prefix: string, value: T, newValue: T) {
    const patches = JsonPatch.compare(value, newValue);
    // updateQueue(state, ...patches.map(p => ({
    //     ...p,
    //     path: prefix + p.path
    // })));
    return newValue;
}

function updateQueue(state: InitiativeState, ...patches: JsonPatch.Operation[]) {
    // state.patchesQueue = [
    //     ...state.patchesQueue,
    //     ...patches
    // ];
}

function initiativeSortPredicate(a: Character, b: Character) {
    const ai = (a.initiative ?? 0) + (a.secondaryInitiative ?? 99) * 0.01 + (a.isEnemy ? 0.001 : 0);
    const bi = (b.initiative ?? 0) + (b.secondaryInitiative ?? 99) * 0.01 + (b.isEnemy ? 0.001 : 0);

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
    changeActorName,
    nextRound,
    nextCharacter,
    toggleDisabled,
    applyState
} = initiativeSlice.actions;


export const initiativeSliceActions = initiativeSlice.actions;

export default initiativeSlice.reducer;
