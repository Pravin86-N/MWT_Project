import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchInventoryData } from '../../lib/api';
import { InventoryItem } from '../../types/inventory';

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchInventory = createAsyncThunk('inventory/fetchInventory', async () => {
  const response = await fetchInventoryData();
  return response.data;
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    addItem: (state, action) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory';
      });
  },
});

export const { addItem, removeItem } = inventorySlice.actions;

export default inventorySlice.reducer;