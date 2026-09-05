import React from 'react';
import { KPIGrid } from '../components/dashboard/KPIGrid';
import { FleetOverview } from '../components/dashboard/FleetOverview';
import { DeliveryMap } from '../components/dashboard/DeliveryMap';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">Fuel Delivery Management Dashboard</h1>
            <KPIGrid />
            <FleetOverview />
            <DeliveryMap />
            <ActivityFeed />
        </div>
    );
};

export default DashboardPage;