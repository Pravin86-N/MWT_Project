export interface InventoryItem {
    id: string;
    fuelType: string;
    quantity: number;
    unit: string;
    stationId: string;
    lastUpdated: Date;
}

export interface StationInventory {
    stationId: string;
    items: InventoryItem[];
}

export interface InventoryState {
    inventory: StationInventory[];
    loading: boolean;
    error: string | null;
}