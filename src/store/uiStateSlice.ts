import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState = {
    isExtraControlsVisible: false,
    isInHistoryMode: false,
    historyRound: -1
}

export const uiStateSlice = createSlice({
    name: 'uiState',
    initialState,
    reducers: {
        toggleExtraControls: (state) => {
            state.isExtraControlsVisible = !state.isExtraControlsVisible;
        },
        setHistoryMode: (state, action: PayloadAction<boolean>) => {
            state.isInHistoryMode = action.payload;
        },
        setHistoryRound: (state, action: PayloadAction<number>) => {
            state.historyRound = action.payload;
        },
        historyBack: (state, action: PayloadAction<{ currentRound: number}>) => {
            if (state.isInHistoryMode) {
                state.historyRound--;
                if (state.historyRound < 1) {
                    state.historyRound = 1;
                }
                return;
            }

            state.isInHistoryMode = true;
            state.historyRound = action.payload.currentRound - 1;
            if (state.historyRound < 1) {
                state.historyRound = 1;
            }
        },
        historyForward: (state, action: PayloadAction<{ currentRound: number }>) => {
            if (!state.isInHistoryMode)
                return;

            state.historyRound++;
            if (state.historyRound >= action.payload.currentRound) {
                state.historyRound = -1;
                state.isInHistoryMode = false;
            }
        }
    }
});

export const uiStateActions = uiStateSlice.actions;

export default uiStateSlice.reducer;

