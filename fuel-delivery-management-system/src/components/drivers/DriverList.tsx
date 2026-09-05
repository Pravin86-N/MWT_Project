import React from 'react';
import { useDrivers } from '../../hooks/useDrivers';
import DriverCard from './DriverCard';
import './DriverList.css';

const DriverList: React.FC = () => {
    const { drivers, loading, error } = useDrivers();

    if (loading) {
        return <div className="loading">Loading drivers...</div>;
    }

    if (error) {
        return <div className="error">Error loading drivers: {error.message}</div>;
    }

    return (
        <div className="driver-list">
            <h2 className="driver-list-title">Drivers</h2>
            <div className="driver-list-container">
                {drivers.map(driver => (
                    <DriverCard key={driver.id} driver={driver} />
                ))}
            </div>
        </div>
    );
};

export default DriverList;