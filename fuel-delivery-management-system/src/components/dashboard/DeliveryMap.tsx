import React from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useDashboard } from '../../hooks/useDashboard';
import './DeliveryMap.css';

const DeliveryMap = () => {
    const { deliveryLocations } = useDashboard();

    const mapContainerStyle = {
        height: "400px",
        width: "100%"
    };

    const center = {
        lat: 37.7749, // Default latitude
        lng: -122.4194 // Default longitude
    };

    return (
        <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={10}
            >
                {deliveryLocations.map((location, index) => (
                    <Marker
                        key={index}
                        position={{ lat: location.lat, lng: location.lng }}
                        title={location.title}
                    />
                ))}
            </GoogleMap>
        </LoadScript>
    );
};

export default DeliveryMap;