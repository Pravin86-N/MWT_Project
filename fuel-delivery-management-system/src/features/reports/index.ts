import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchReports } from '../../lib/api';

export const getReports = createAsyncThunk('reports/getReports', async () => {
    const response = await fetchReports();
    return response.data;
});

const reportsSlice = createSlice({
    name: 'reports',
    initialState: {
        reports: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getReports.pending, (state) => {
                state.loading = true;
            })
            .addCase(getReports.fulfilled, (state, action) => {
                state.loading = false;
                state.reports = action.payload;
            })
            .addCase(getReports.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    },
});

export const selectReports = (state) => state.reports.reports;
export const selectLoading = (state) => state.reports.loading;
export const selectError = (state) => state.reports.error;

export default reportsSlice.reducer;