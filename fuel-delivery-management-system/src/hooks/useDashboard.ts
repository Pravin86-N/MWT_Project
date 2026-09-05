import { useEffect, useState } from 'react';
import { fetchDashboardData } from '../lib/api';

const useDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchDashboardData();
                setDashboardData(data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return { dashboardData, loading, error };
};

export default useDashboard;