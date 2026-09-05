import React from 'react';
import { useReports } from '../features/reports';
import { Card } from '../components/common/Card';
import { SalesChart } from '../components/analytics/SalesChart';
import { CostBreakdown } from '../components/analytics/CostBreakdown';
import { RoutePerformance } from '../components/analytics/RoutePerformance';

const ReportsPage: React.FC = () => {
    const { reportsData } = useReports();

    return (
        <div className="reports-page">
            <h1 className="page-title">Fuel Delivery Reports</h1>
            <div className="reports-grid">
                <Card title="Sales Overview">
                    <SalesChart data={reportsData.sales} />
                </Card>
                <Card title="Cost Breakdown">
                    <CostBreakdown data={reportsData.costs} />
                </Card>
                <Card title="Route Performance">
                    <RoutePerformance data={reportsData.routes} />
                </Card>
            </div>
        </div>
    );
};

export default ReportsPage;