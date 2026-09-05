import React from 'react';

interface StatusBadgeProps {
    status: 'active' | 'inactive' | 'pending' | 'completed';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const getStatusStyles = () => {
        switch (status) {
            case 'active':
                return 'bg-green-500 text-white';
            case 'inactive':
                return 'bg-red-500 text-white';
            case 'pending':
                return 'bg-yellow-500 text-black';
            case 'completed':
                return 'bg-blue-500 text-white';
            default:
                return '';
        }
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusStyles()}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

export default StatusBadge;