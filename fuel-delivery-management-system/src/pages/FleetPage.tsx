import React from 'react';
import { useFleet } from '../features/fleet';
import FleetOverview from '../components/dashboard/FleetOverview';
import DriverList from '../components/drivers/DriverList';
import StationInventory from '../components/fuel-stations/StationInventory';
import './FleetPage.css';

const FleetPage = () => {
    const { fleetData, loading, error } = useFleet();

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading fleet data</div>;

    return (
        <div className="fleet-page">
            <h1 className="page-title">Fleet Management</h1>
            <FleetOverview data={fleetData.overview} />
            <DriverList drivers={fleetData.drivers} />
            <StationInventory inventory={fleetData.stationInventory} />
        </div>
    );
};

export default FleetPage;