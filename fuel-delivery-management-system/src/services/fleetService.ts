import { Fleet } from '../types/fleet';
import { api } from '../lib/api';

export const getFleetData = async (): Promise<Fleet[]> => {
    try {
        const response = await api.get('/fleet');
        return response.data;
    } catch (error) {
        console.error('Error fetching fleet data:', error);
        throw error;
    }
};

export const updateFleetStatus = async (fleetId: string, status: string): Promise<void> => {
    try {
        await api.put(`/fleet/${fleetId}`, { status });
    } catch (error) {
        console.error('Error updating fleet status:', error);
        throw error;
    }
};

export const addNewVehicle = async (vehicleData: Omit<Fleet, 'id'>): Promise<Fleet> => {
    try {
        const response = await api.post('/fleet', vehicleData);
        return response.data;
    } catch (error) {
        console.error('Error adding new vehicle:', error);
        throw error;
    }
};

export const removeVehicle = async (fleetId: string): Promise<void> => {
    try {
        await api.delete(`/fleet/${fleetId}`);
    } catch (error) {
        console.error('Error removing vehicle:', error);
        throw error;
    }
};