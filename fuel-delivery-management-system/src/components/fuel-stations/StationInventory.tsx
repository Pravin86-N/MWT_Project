import React from 'react';
import { useInventory } from '../../features/inventory';
import Card from '../common/Card';
import './StationInventory.css';

const StationInventory: React.FC = () => {
    const { inventoryData, isLoading, error } = useInventory();

    if (isLoading) {
        return <div className="loading">Loading inventory...</div>;
    }

    if (error) {
        return <div className="error">Error loading inventory: {error.message}</div>;
    }

    return (
        <div className="station-inventory">
            <h2>Fuel Station Inventory</h2>
            <div className="inventory-list">
                {inventoryData.map((item) => (
                    <Card key={item.id} title={item.productName}>
                        <p>Quantity: {item.quantity}</p>
                        <p>Status: {item.status}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default StationInventory;