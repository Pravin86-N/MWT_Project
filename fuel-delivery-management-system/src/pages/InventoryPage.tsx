import React, { useEffect, useState } from 'react';
import { fetchInventoryData } from '../services/inventoryService';
import { InventoryItem } from '../types/inventory';
import Card from '../components/common/Card';
import './InventoryPage.css';

const InventoryPage: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInventory = async () => {
            try {
                const data = await fetchInventoryData();
                setInventory(data);
            } catch (err) {
                setError('Failed to load inventory data');
            } finally {
                setLoading(false);
            }
        };

        loadInventory();
    }, []);

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="inventory-page">
            <h1>Fuel Inventory Management</h1>
            <div className="inventory-list">
                {inventory.map(item => (
                    <Card key={item.id} title={item.name}>
                        <p>Quantity: {item.quantity}</p>
                        <p>Location: {item.location}</p>
                        <p>Status: {item.status}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default InventoryPage;