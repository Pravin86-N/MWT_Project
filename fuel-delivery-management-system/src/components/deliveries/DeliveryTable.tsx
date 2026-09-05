import React from 'react';
import { useDeliveries } from '../../features/deliveries';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { Delivery } from '../../types/delivery';
import './DeliveryTable.css';

const DeliveryTable: React.FC = () => {
    const { deliveries, sortDeliveries, sortDirection } = useDeliveries();

    return (
        <TableContainer className="delivery-table-container">
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <TableSortLabel
                                active={sortDirection === 'asc'}
                                direction={sortDirection}
                                onClick={() => sortDeliveries('date')}
                            >
                                Date
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>Delivery ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Fuel Type</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {deliveries.map((delivery: Delivery) => (
                        <TableRow key={delivery.id}>
                            <TableCell>{new Date(delivery.date).toLocaleDateString()}</TableCell>
                            <TableCell>{delivery.id}</TableCell>
                            <TableCell>{delivery.customer}</TableCell>
                            <TableCell>{delivery.fuelType}</TableCell>
                            <TableCell>{delivery.quantity} liters</TableCell>
                            <TableCell>{delivery.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default DeliveryTable;