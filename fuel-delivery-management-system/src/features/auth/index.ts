import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../lib/api';

export const login = createAsyncThunk('auth/login', async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
});

export const logout = createAsyncThunk('auth/logout', async () => {
    await api.post('/logout');
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        status: 'idle',
        error: null,
    },
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
        },
        clearUser(state) {
            state.user = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(login.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.user = action.payload;
            })
            .addCase(login.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
            });
    },
});

export const { setUser, clearUser } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;

export default authSlice.reducer;