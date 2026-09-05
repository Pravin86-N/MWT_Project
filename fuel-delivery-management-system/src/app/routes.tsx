import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import DeliveriesPage from '../pages/DeliveriesPage';
import FleetPage from '../pages/FleetPage';
import InventoryPage from '../pages/InventoryPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';

const Routes = () => {
    return (
        <Router>
            <Switch>
                <Route path="/" exact component={DashboardPage} />
                <Route path="/deliveries" component={DeliveriesPage} />
                <Route path="/fleet" component={FleetPage} />
                <Route path="/inventory" component={InventoryPage} />
                <Route path="/reports" component={ReportsPage} />
                <Route path="/settings" component={SettingsPage} />
            </Switch>
        </Router>
    );
};

export default Routes;