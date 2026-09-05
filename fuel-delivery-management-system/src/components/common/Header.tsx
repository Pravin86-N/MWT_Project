import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css'; // Assuming you will create a CSS file for styling

const Header = () => {
    return (
        <header className="header">
            <div className="logo">
                <h1>Fuel Delivery Management System</h1>
            </div>
            <nav className="navigation">
                <ul>
                    <li>
                        <Link to="/">Dashboard</Link>
                    </li>
                    <li>
                        <Link to="/deliveries">Deliveries</Link>
                    </li>
                    <li>
                        <Link to="/fleet">Fleet</Link>
                    </li>
                    <li>
                        <Link to="/inventory">Inventory</Link>
                    </li>
                    <li>
                        <Link to="/reports">Reports</Link>
                    </li>
                    <li>
                        <Link to="/settings">Settings</Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;