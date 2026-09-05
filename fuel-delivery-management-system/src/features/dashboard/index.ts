import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDashboardData } from '../../lib/api';

export const fetchDashboard = createAsyncThunk('dashboard/fetchDashboard', async () => {
    const response = await fetchDashboardData();
    return response;
});

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState: {
        data: null,
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboard.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    },
});

export const selectDashboard = (state) => state.dashboard;

export default dashboardSlice.reducer;