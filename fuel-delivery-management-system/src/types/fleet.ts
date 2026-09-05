export interface FleetVehicle {
    id: string;
    licensePlate: string;
    model: string;
    year: number;
    status: 'active' | 'inactive' | 'maintenance';
    fuelType: 'diesel' | 'petrol' | 'electric';
    capacity: number; // in liters
    currentFuelLevel: number; // in liters
    location: {
        latitude: number;
        longitude: number;
    };
}

export interface Fleet {
    vehicles: FleetVehicle[];
    totalVehicles: number;
    activeVehicles: number;
    inactiveVehicles: number;
    maintenanceVehicles: number;
}