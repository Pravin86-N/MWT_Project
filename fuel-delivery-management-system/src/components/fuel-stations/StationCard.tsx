import React from 'react';
import './StationCard.css'; // Assuming you will create a CSS file for styling

interface StationCardProps {
    name: string;
    location: string;
    fuelTypes: string[];
    status: 'Open' | 'Closed';
}

const StationCard: React.FC<StationCardProps> = ({ name, location, fuelTypes, status }) => {
    return (
        <div className={`station-card ${status.toLowerCase()}`}>
            <h2 className="station-name">{name}</h2>
            <p className="station-location">{location}</p>
            <div className="fuel-types">
                {fuelTypes.map((fuel, index) => (
                    <span key={index} className="fuel-type">{fuel}</span>
                ))}
            </div>
            <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
        </div>
    );
};

export default StationCard;