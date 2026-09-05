import { Delivery } from '../types/delivery';
import { api } from '../lib/api';

export const getDeliveries = async (): Promise<Delivery[]> => {
    const response = await api.get('/deliveries');
    return response.data;
};

export const getDeliveryById = async (id: string): Promise<Delivery> => {
    const response = await api.get(`/deliveries/${id}`);
    return response.data;
};

export const createDelivery = async (delivery: Delivery): Promise<Delivery> => {
    const response = await api.post('/deliveries', delivery);
    return response.data;
};

export const updateDelivery = async (id: string, delivery: Delivery): Promise<Delivery> => {
    const response = await api.put(`/deliveries/${id}`, delivery);
    return response.data;
};

export const deleteDelivery = async (id: string): Promise<void> => {
    await api.delete(`/deliveries/${id}`);
};