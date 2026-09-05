import React from 'react';
import { useDrivers } from '../../hooks/useDrivers';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';

const DriverStatusPanel: React.FC = () => {
    const { drivers } = useDrivers();

    return (
        <div className="driver-status-panel">
            <h2 className="panel-title">Driver Status</h2>
            <div className="driver-cards">
                {drivers.map(driver => (
                    <Card key={driver.id} className="driver-card">
                        <h3>{driver.name}</h3>
                        <p>Vehicle: {driver.vehicle}</p>
                        <StatusBadge status={driver.status} />
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default DriverStatusPanel;