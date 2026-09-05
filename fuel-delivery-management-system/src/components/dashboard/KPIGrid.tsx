import React from 'react';
import './KPIGrid.css'; // Assuming you will create a CSS file for styling

const KPIGrid = () => {
    const kpis = [
        { title: 'Total Deliveries', value: 120, change: '+5%', trend: 'up' },
        { title: 'Fuel Sold (Liters)', value: 15000, change: '-2%', trend: 'down' },
        { title: 'Active Drivers', value: 45, change: '+3%', trend: 'up' },
        { title: 'Pending Deliveries', value: 10, change: '0%', trend: 'stable' },
    ];

    return (
        <div className="kpi-grid">
            {kpis.map((kpi, index) => (
                <div key={index} className={`kpi-card ${kpi.trend}`}>
                    <h3>{kpi.title}</h3>
                    <p>{kpi.value}</p>
                    <span className={`change ${kpi.trend}`}>{kpi.change}</span>
                </div>
            ))}
        </div>
    );
};

export default KPIGrid;