import React from 'react';
import { useFleetData } from '../../hooks/useDashboard';
import Card from '../common/Card';
import './FleetOverview.css';

const FleetOverview: React.FC = () => {
    const { fleetData, loading, error } = useFleetData();

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error loading fleet data</div>;
    }

    return (
        <div className="fleet-overview">
            <h2 className="title">Fleet Overview</h2>
            <div className="fleet-cards">
                {fleetData.map((vehicle) => (
                    <Card key={vehicle.id} className="fleet-card">
                        <h3>{vehicle.name}</h3>
                        <p>Status: {vehicle.status}</p>
                        <p>Location: {vehicle.location}</p>
                        <p>Fuel Level: {vehicle.fuelLevel}%</p>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default FleetOverview;