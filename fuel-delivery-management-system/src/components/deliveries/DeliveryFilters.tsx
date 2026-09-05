import React from 'react';

const DeliveryFilters: React.FC = () => {
    const [filter, setFilter] = React.useState({
        status: '',
        dateRange: [null, null],
        driver: '',
    });

    const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter({ ...filter, status: event.target.value });
    };

    const handleDateChange = (dates: [Date | null, Date | null]) => {
        setFilter({ ...filter, dateRange: dates });
    };

    const handleDriverChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter({ ...filter, driver: event.target.value });
    };

    const applyFilters = () => {
        // Logic to apply filters to the delivery table
    };

    return (
        <div className="delivery-filters">
            <h2>Filter Deliveries</h2>
            <div className="filter-group">
                <label htmlFor="status">Status:</label>
                <select id="status" value={filter.status} onChange={handleStatusChange}>
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Canceled</option>
                </select>
            </div>
            <div className="filter-group">
                <label htmlFor="dateRange">Date Range:</label>
                <input
                    type="date"
                    value={filter.dateRange[0] || ''}
                    onChange={(e) => handleDateChange([new Date(e.target.value), filter.dateRange[1]])}
                />
                <input
                    type="date"
                    value={filter.dateRange[1] || ''}
                    onChange={(e) => handleDateChange([filter.dateRange[0], new Date(e.target.value)])}
                />
            </div>
            <div className="filter-group">
                <label htmlFor="driver">Driver:</label>
                <select id="driver" value={filter.driver} onChange={handleDriverChange}>
                    <option value="">All</option>
                    {/* Map through drivers to create options */}
                </select>
            </div>
            <button onClick={applyFilters}>Apply Filters</button>
        </div>
    );
};

export default DeliveryFilters;