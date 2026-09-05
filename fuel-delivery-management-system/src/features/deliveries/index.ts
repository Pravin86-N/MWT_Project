import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDeliveries } from '../../lib/api';
import { Delivery } from '../../types/delivery';

interface DeliveriesState {
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
}

const initialState: DeliveriesState = {
  deliveries: [],
  loading: false,
  error: null,
};

export const loadDeliveries = createAsyncThunk('deliveries/load', async () => {
  const response = await fetchDeliveries();
  return response.data;
});

const deliveriesSlice = createSlice({
  name: 'deliveries',
  initialState,
  reducers: {
    clearDeliveries(state) {
      state.deliveries = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDeliveries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDeliveries.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveries = action.payload;
      })
      .addCase(loadDeliveries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load deliveries';
      });
  },
});

export const { clearDeliveries } = deliveriesSlice.actions;

export default deliveriesSlice.reducer;