export interface Delivery {
    id: string;
    driverId: string;
    fuelStationId: string;
    deliveryDate: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'canceled';
    quantity: number; // in liters
    destination: string;
    notes?: string;
}

export interface DeliveryFilter {
    status?: 'pending' | 'in-progress' | 'completed' | 'canceled';
    startDate?: Date;
    endDate?: Date;
    driverId?: string;
    fuelStationId?: string;
}