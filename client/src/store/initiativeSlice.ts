import { createAction, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useAppSelector } from './index';
import { createAppAsyncThunk } from './createAppAsyncThunk';
import { PatchOp, performPatch } from '../shared';
import { omitKeys } from '../utils/pick';
import hashSum from 'hash-sum';

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
    avatar: string | null;
}

export interface InitiativeState {
    characters: Character[];
    history: HistoryEntry[];
    nextCharacterId: number;
    activeCharacterId: number;
    round: number;
    elementStates: ElementState[];
    patchesQueue: PatchOp[];
}

const initCharacters: Character[] = [
    { id: 0, name: 'Voidwarden', initiative: null, isEnemy: false, avatar: 'voidwarden.png' },
    { id: 1, name: 'Demolitionist', initiative: null, isEnemy: false, avatar: 'demolitionist.png' },
    { id: 2, name: 'Red Guard', initiative: null, isEnemy: false, avatar: 'red-guard.png' },
    { id: 3, name: 'Hatchet', initiative: null, isEnemy: false, avatar: 'hatchet.png' },
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
    async (payload: { id: number, initiative: number, ownerId: string, isSecondary: boolean }, {
        dispatch,
        getState
    }) => {
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
                avatar: null,
                secondaryInitiative: null,
                isDisabled: false,
                ...action.payload,
            };
            // state.characters.push(newCharacter);
            // state.nextCharacterId++;
            updateQueue(state, {
                op: 'test',
                path: '$.nextCharacterId',
                value: state.nextCharacterId
            }, {
                op: 'add',
                path: `$.characters[-]`,
                value: newCharacter
            }, {
                op: 'replace',
                path: `$.nextCharacterId`,
                value: state.nextCharacterId + 1
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
                    // state.activeCharacterId = sorted[currentCharacterIdx].id;
                    updateQueue(state, {
                        op: 'replace',
                        path: `$.activeCharacterId`,
                        value: sorted[currentCharacterIdx].id
                    });
                    return;
                }
            }

            const nextCharacterIdx = currentCharacterIdx + 1;
            if (nextCharacterIdx >= state.characters.length) {
                return;
            }

            // state.activeCharacterId = sorted[nextCharacterIdx].id;
            updateQueue(state, {
                op: 'replace',
                path: `$.activeCharacterId`,
                value: sorted[nextCharacterIdx].id
            });
        },

        removeActor: (state, { payload: id }: PayloadAction<number>) => {
            // state.characters = state.characters.filter(actor => actor.id !== action.payload);
            updateQueue(state, {
                op: 'remove',
                path: `$.characters[?(@.id==${ id })]`
            })
        },

        changeActorName: (state, action: PayloadAction<{ id: number, name: string }>) => {
            // const actorIndex = state.characters.findIndex(actor => actor.id === action.payload.id);
            // state.characters[actorIndex].name = action.payload.name;

            updateQueue(state, {
                op: 'replace',
                path: `$.characters[?(@.id==${ action.payload.id })].name`,
                value: action.payload.name
            });
        },

        setActorAvatar: (state, action: PayloadAction<{ id: number, avatar: string }>) => {
            updateQueue(state, {
                op: 'replace',
                path: `$.characters[?(@.id==${ action.payload.id })].avatar`,
                value: action.payload.avatar
            });
        },

        toggleDisabled: (state, action: PayloadAction<number>) => {
            const actorIndex = state.characters.findIndex(actor => actor.id === action.payload);
            // state.characters[actorIndex].isDisabled = !state.characters[actorIndex].isDisabled;
            updateQueue(state, {
                op: 'replace',
                path: `$.characters[?(@.id==${ action.payload })].isDisabled`,
                value: !state.characters[actorIndex].isDisabled
            });
        },

        setDisabled: (state, action: PayloadAction<{ id: number, isDisabled: boolean }>) => {
            // const actorIndex = state.characters.findIndex(actor => actor.id === action.payload.id);
            // state.characters[actorIndex].isDisabled = action.payload.isDisabled;
            updateQueue(state, {
                op: 'replace',
                path: `$.characters[?(@.id==${ action.payload.id })].isDisabled`,
                value: action.payload.isDisabled
            });
        },

        setInitiative: (state, action: PayloadAction<{
            id: number,
            initiative: number,
            ownerId: string,
            isSecondary: boolean
        }>) => {
            const character = state.characters.find(actor => actor.id === action.payload.id);
            if (!character)
                return;
            const basePath = `$.characters[?(@.id==${ action.payload.id })]`;
            const patches: PatchOp[] = [];

            if (action.payload.isSecondary) {
                // character.secondaryInitiative = action.payload.initiative;
                patches.push({
                    op: 'replace',
                    path: `${ basePath }.secondaryInitiative`,
                    value: action.payload.initiative
                });
            } else {
                // character.initiative = action.payload.initiative;
                patches.push({
                    op: 'replace',
                    path: `${ basePath }.initiative`,
                    value: action.payload.initiative
                });
            }
            // character.ownerId = action.payload.ownerId;
            patches.push({
                op: 'replace',
                path: `${ basePath }.ownerId`,
                value: action.payload.ownerId
            });
            updateQueue(state, ...patches);
        },
        setElementState: (state, action: { payload: { element: number, state: ElementState } }) => {
            // state.elementStates[action.payload.element] = action.payload.state;

            updateQueue(state, {
                op: 'replace',
                path: `$.elementStates[${ action.payload.element }]`,
                value: action.payload.state
            });
        },
        nextRound: (state) => {
            const historyEntry = getNewHistoryEntry(state);
            updateQueue(state, {
                op: 'test',
                path: '$.history.length',
                value: state.history.length
            }, {
                op: 'add',
                path: '$.history[-]',
                value: historyEntry
            })

            // state.round++;
            updateQueue(state, {
                op: 'replace',
                path: `$.round`,
                value: state.round + 1
            });

            // state.activeCharacterId = -1;
            updateQueue(state, {
                op: 'replace',
                path: `$.activeCharacterId`,
                value: -1
            });

            state.characters = state.characters.map(actor => {
                updateQueue(state, ...['ownerId', 'initiative', 'secondaryInitiative'].map(prop => ({
                    op: 'replace',
                    path: `$.characters[*].${ prop }`,
                    value: null
                } as PatchOp)));

                return {
                    ...actor,
                    ownerId: null,
                    initiative: null,
                    secondaryInitiative: null
                }
            });

            // state.elementStates = state.elementStates.map(e => Math.max(e - 1, ElementState.Inert));
            updateQueue(state, {
                op: 'replace',
                path: `$.elementStates`,
                value: state.elementStates.map(e => Math.max(e - 1, ElementState.Inert))
            });
        },

        changeRound: (state, action: PayloadAction<number>) => {
            if (action.payload < 1) {
                return;
            }
            // state.round = action.payload;
            updateQueue(state, {
                op: 'replace',
                path: `$.round`,
                value: action.payload
            });
        },

        setActiveCharacter: (state, action: PayloadAction<number>) => {
            if (!isInitiativeReadySelector(state)) {
                return;
            }
            // state.activeCharacterId = action.payload;
            updateQueue(state, {
                op: 'replace',
                path: `$.activeCharacterId`,
                value: action.payload
            });
        },

        applyState: (state, action: PayloadAction<InitiativeState>) => {
            state.characters = action.payload.characters;
            state.activeCharacterId = action.payload.activeCharacterId;
            state.nextCharacterId = action.payload.nextCharacterId;
            state.round = action.payload.round;
            state.elementStates = action.payload.elementStates;
            state.history = action.payload.history;
        },

        applyPatches: (state, action: PayloadAction<PatchOp[]>) => {
            performPatch(state, action.payload);
        },
        clearPatchQueue: (state) => {
            state.patchesQueue = [];
        }
    }
});

function getNewHistoryEntry(state: InitiativeState) {
    return {
        round: state.round,
        characters: state.characters.map(actor => ({
            name: actor.name,
            initiative: actor.initiative ?? 0,
            secondaryInitiative: actor.secondaryInitiative ?? 0,
            isEnemy: actor.isEnemy
        })),
        elementStates: state.elementStates.map(e => e)
    }
}

function updateQueue(state: InitiativeState, ...patches: any[]) {
    performPatch(state, patches);
    state.patchesQueue = [
        ...state.patchesQueue,
        ...patches
    ];
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

export const getRoomHashSelector = createSelector(
    (state: InitiativeState) => state,
    (state) => {
        const hasheableState = omitKeys(state, ['patchesQueue']);
        return hashSum(hasheableState);
    }
);


export const {
    addActor,
    removeActor,
    changeActorName,
    nextRound,
    nextCharacter,
    toggleDisabled,
    applyState,
    clearPatchQueue
} = initiativeSlice.actions;


export const initiativeSliceActions = initiativeSlice.actions;

export default initiativeSlice.reducer;
