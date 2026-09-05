import React from 'react';
import { Line } from 'react-chartjs-2';
import { useRoutePerformance } from '../../hooks/useDashboard';
import './RoutePerformance.css';

const RoutePerformance = () => {
    const { data, loading, error } = useRoutePerformance();

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading route performance data.</div>;

    const chartData = {
        labels: data.map(item => item.route),
        datasets: [
            {
                label: 'Performance',
                data: data.map(item => item.performance),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="route-performance">
            <h2>Route Performance</h2>
            <Line data={chartData} options={options} />
        </div>
    );
};

export default RoutePerformance;