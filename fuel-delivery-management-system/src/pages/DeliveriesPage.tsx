import React from 'react';
import DeliveryTable from '../components/deliveries/DeliveryTable';
import DeliveryFilters from '../components/deliveries/DeliveryFilters';
import DeliveryTimeline from '../components/deliveries/DeliveryTimeline';
import './DeliveriesPage.css';

const DeliveriesPage: React.FC = () => {
    return (
        <div className="deliveries-page">
            <h1 className="page-title">Deliveries Management</h1>
            <DeliveryFilters />
            <DeliveryTable />
            <DeliveryTimeline />
        </div>
    );
};

export default DeliveriesPage;