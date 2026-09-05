const mockData = {
  fuelStations: [
    {
      id: 1,
      name: "Station A",
      location: "123 Main St, Cityville",
      inventory: {
        gasoline: 5000,
        diesel: 3000,
        premium: 2000,
      },
      status: "Open",
    },
    {
      id: 2,
      name: "Station B",
      location: "456 Elm St, Townsville",
      inventory: {
        gasoline: 7000,
        diesel: 4000,
        premium: 2500,
      },
      status: "Open",
    },
    {
      id: 3,
      name: "Station C",
      location: "789 Oak St, Villagetown",
      inventory: {
        gasoline: 6000,
        diesel: 3500,
        premium: 1500,
      },
      status: "Closed",
    },
  ],
  deliveries: [
    {
      id: 1,
      stationId: 1,
      driverId: 1,
      fuelType: "Gasoline",
      quantity: 1000,
      status: "Completed",
      deliveryDate: "2023-10-01",
    },
    {
      id: 2,
      stationId: 2,
      driverId: 2,
      fuelType: "Diesel",
      quantity: 1500,
      status: "In Progress",
      deliveryDate: "2023-10-02",
    },
    {
      id: 3,
      stationId: 3,
      driverId: 3,
      fuelType: "Premium",
      quantity: 500,
      status: "Pending",
      deliveryDate: "2023-10-03",
    },
  ],
  drivers: [
    {
      id: 1,
      name: "John Doe",
      status: "Available",
      vehicle: "Truck A",
    },
    {
      id: 2,
      name: "Jane Smith",
      status: "On Delivery",
      vehicle: "Truck B",
    },
    {
      id: 3,
      name: "Mike Johnson",
      status: "Available",
      vehicle: "Truck C",
    },
  ],
};

export default mockData;