import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { useSalesData } from '../../hooks/useDashboard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SalesChart: React.FC = () => {
    const { salesData, loading, error } = useSalesData();

    const data = {
        labels: salesData.map(item => item.date),
        datasets: [
            {
                label: 'Sales',
                data: salesData.map(item => item.amount),
                fill: false,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Sales Over Time',
            },
        },
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading sales data</div>;

    return <Line data={data} options={options} />;
};

export default SalesChart;