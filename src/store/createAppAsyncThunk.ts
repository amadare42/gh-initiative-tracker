import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from './index';

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
    state: RootState
    dispatch: AppDispatch
}>()
