import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchFleetData } from '../../lib/api';
import { Fleet } from '../../types/fleet';

interface FleetState {
  fleets: Fleet[];
  loading: boolean;
  error: string | null;
}

const initialState: FleetState = {
  fleets: [],
  loading: false,
  error: null,
};

export const loadFleetData = createAsyncThunk('fleet/loadFleetData', async () => {
  const response = await fetchFleetData();
  return response.data;
});

const fleetSlice = createSlice({
  name: 'fleet',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadFleetData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadFleetData.fulfilled, (state, action) => {
        state.loading = false;
        state.fleets = action.payload;
      })
      .addCase(loadFleetData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load fleet data';
      });
  },
});

export default fleetSlice.reducer;