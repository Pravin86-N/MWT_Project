import { InventoryItem } from '../types/inventory';
import { fetchInventoryData, updateInventoryData } from '../lib/api';

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    try {
        const inventoryItems = await fetchInventoryData();
        return inventoryItems;
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        throw error;
    }
};

export const updateInventoryItem = async (itemId: string, updatedData: Partial<InventoryItem>): Promise<InventoryItem> => {
    try {
        const updatedItem = await updateInventoryData(itemId, updatedData);
        return updatedItem;
    } catch (error) {
        console.error('Error updating inventory item:', error);
        throw error;
    }
};