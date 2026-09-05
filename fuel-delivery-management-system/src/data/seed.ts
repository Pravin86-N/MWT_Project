import { Delivery } from '../types/delivery';
import { Fleet } from '../types/fleet';
import { Inventory } from '../types/inventory';

export const seedDeliveries: Delivery[] = [
    {
        id: '1',
        destination: '123 Main St, Springfield',
        status: 'Delivered',
        fuelType: 'Diesel',
        quantity: 500,
        deliveryDate: new Date('2023-10-01'),
    },
    {
        id: '2',
        destination: '456 Elm St, Springfield',
        status: 'In Transit',
        fuelType: 'Gasoline',
        quantity: 300,
        deliveryDate: new Date('2023-10-02'),
    },
    {
        id: '3',
        destination: '789 Oak St, Springfield',
        status: 'Pending',
        fuelType: 'Diesel',
        quantity: 400,
        deliveryDate: new Date('2023-10-03'),
    },
];

export const seedFleet: Fleet[] = [
    {
        id: '1',
        driverName: 'John Doe',
        vehicleNumber: 'ABC123',
        status: 'Active',
    },
    {
        id: '2',
        driverName: 'Jane Smith',
        vehicleNumber: 'XYZ789',
        status: 'Inactive',
    },
];

export const seedInventory: Inventory[] = [
    {
        id: '1',
        fuelType: 'Diesel',
        quantityAvailable: 10000,
        stationId: '1',
    },
    {
        id: '2',
        fuelType: 'Gasoline',
        quantityAvailable: 8000,
        stationId: '2',
    },
];