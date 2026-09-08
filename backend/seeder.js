const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Order = require('./models/Order');
const Tank = require('./models/Tank');
const Driver = require('./models/Driver');
const Vehicle = require('./models/Vehicle');
const CustomerRegistration = require('./models/CustomerRegistration');
const FuelPricing = require('./models/FuelPricing');
const Notification = require('./models/Notification');

const users = [
  {
    name: 'Pravin Raman',
    email: 'pravin@123',
    password: 'pravin123',
    role: 'Depot Manager',
    city: 'Chennai',
  },
  {
    name: 'Arun Ventures',
    email: 'admin@fdms.com',
    password: 'admin123',
    role: 'Admin',
    city: 'Chennai',
  },
  {
    name: 'Chennai Steel Works',
    email: 'customer@fdms.com',
    password: 'customer123',
    role: 'Customer',
    site: 'Factory Site #1',
    city: 'Chennai',
    creditLimit: 500000,
    creditUsed: 146200,
    phone: '+91 98401 23456',
  },
  {
    name: 'Om Sri Hospital',
    email: 'hospital@fdms.com',
    password: 'hospital123',
    role: 'Customer',
    site: 'Hospital Generator Vault',
    city: 'Madurai',
    creditLimit: 300000,
    creditUsed: 52400,
    phone: '+91 94431 87654',
  },
  {
    name: 'R. Rangarajan',
    email: 'driver@fdms.com',
    password: 'driver123',
    role: 'Driver',
    city: 'Chennai',
    phone: '+91 98400 11223',
  },
];

const fuelPricing = [
  { code: 'DSL', name: 'Diesel', price: 92.4, color: '#f59e0b', taxRate: 0.18, deliveryCharge: 250 },
  { code: 'PTL', name: 'Petrol', price: 104.8, color: '#3b82f6', taxRate: 0.18, deliveryCharge: 250 },
  { code: 'LPG', name: 'LPG', price: 61.2, color: '#10b981', taxRate: 0.18, deliveryCharge: 250 },
  { code: 'KRS', name: 'Kerosene', price: 74.6, color: '#6b7280', taxRate: 0.18, deliveryCharge: 250 },
];

const tanks = [
  {
    tankId: 'tank-dsl',
    fuelCode: 'DSL',
    name: 'Diesel Main Vault #1',
    capacity: 50000,
    current: 38400,
    threshold: 10000,
    temp: 24.2,
    pressure: 1.02,
    lastRefill: '2026-08-16',
  },
  {
    tankId: 'tank-ptl',
    fuelCode: 'PTL',
    name: 'Super Petrol Vault #2',
    capacity: 40000,
    current: 29150,
    threshold: 8000,
    temp: 22.8,
    pressure: 1.01,
    lastRefill: '2026-08-17',
  },
  {
    tankId: 'tank-lpg',
    fuelCode: 'LPG',
    name: 'LPG High-Pressure Sphere #3',
    capacity: 25000,
    current: 18900,
    threshold: 5000,
    temp: 18.5,
    pressure: 4.85,
    lastRefill: '2026-08-14',
  },
  {
    tankId: 'tank-krs',
    fuelCode: 'KRS',
    name: 'Kerosene Auxiliary Vault #4',
    capacity: 15000,
    current: 4200,
    threshold: 3000,
    temp: 25.1,
    pressure: 0.99,
    lastRefill: '2026-08-10',
  },
];

const drivers = [
  { name: 'R. Rangarajan', phone: '+91 98400 11223', vehicle: 'TN-01-AB-1234', onDuty: true, deliveries: 142 },
  { name: 'V. Vasanth', phone: '+91 98410 22334', vehicle: 'TN-07-CD-4321', onDuty: true, deliveries: 98 },
  { name: 'K. Elango', phone: '+91 98420 33445', vehicle: 'TN-09-EF-5678', onDuty: false, deliveries: 76 },
  { name: 'M. Saravanan', phone: '+91 98430 44556', vehicle: 'TN-11-GH-9012', onDuty: true, deliveries: 61 },
];

const vehicles = [
  {
    vehicle: 'TN-01-AB-1234',
    driver: 'R. Rangarajan',
    phone: '+91 98400 11223',
    status: 'Delivering',
    fuelCargo: 'DSL',
    cargoL: 3000,
    speed: 54,
    fuelLevel: 82,
    tirePressure: 108,
    engineTemp: 87,
    x: 42,
    y: 35,
    dest: 'Chennai Steel Works',
    lat: 13.0827,
    lng: 80.2707,
    eta: '14 mins',
  },
  {
    vehicle: 'TN-07-CD-4321',
    driver: 'V. Vasanth',
    phone: '+91 98410 22334',
    status: 'InTransit',
    fuelCargo: 'DSL',
    cargoL: 1800,
    speed: 68,
    fuelLevel: 64,
    tirePressure: 112,
    engineTemp: 89,
    x: 65,
    y: 58,
    dest: 'Om Sri Hospital (Madurai)',
    lat: 9.9252,
    lng: 78.1198,
    eta: '28 mins',
  },
  {
    vehicle: 'TN-09-EF-5678',
    driver: 'K. Elango',
    phone: '+91 98420 33445',
    status: 'Idle',
    fuelCargo: 'DSL',
    cargoL: 0,
    speed: 0,
    fuelLevel: 95,
    tirePressure: 110,
    engineTemp: 45,
    x: 25,
    y: 72,
    dest: 'Coimbatore Depot Base',
    lat: 11.0168,
    lng: 76.9558,
    eta: 'Stationary',
  },
  {
    vehicle: 'TN-11-GH-9012',
    driver: 'M. Saravanan',
    phone: '+91 98430 44556',
    status: 'Dispatched',
    fuelCargo: 'PTL',
    cargoL: 2200,
    speed: 61,
    fuelLevel: 78,
    tirePressure: 109,
    engineTemp: 86,
    x: 78,
    y: 28,
    dest: 'Suresh Transports (Trichy)',
    lat: 10.7905,
    lng: 78.7047,
    eta: '45 mins',
  },
];

const orders = [
  {
    orderNumber: 'FD-260801-001',
    customer: 'Chennai Steel Works',
    site: 'Factory',
    fuelCode: 'DSL',
    qty: 500,
    driver: 'R. Rangarajan',
    vehicle: 'TN-01-AB-1234',
    city: 'Chennai',
    status: 'Delivered',
    slot: '06:00-08:00',
    subtotal: 46200,
    tax: 8316,
    deliveryCharge: 250,
    total: 54766,
  },
  {
    orderNumber: 'FD-260802-014',
    customer: 'Om Sri Hospital',
    site: 'Hospital',
    fuelCode: 'DSL',
    qty: 200,
    driver: 'V. Vasanth',
    vehicle: 'TN-07-CD-4321',
    city: 'Madurai',
    status: 'InTransit',
    slot: '10:00-12:00',
    subtotal: 18480,
    tax: 3326.4,
    deliveryCharge: 250,
    total: 22056.4,
  },
  {
    orderNumber: 'FD-260803-027',
    customer: 'Anand Apartments',
    site: 'Apartment Generator',
    fuelCode: 'DSL',
    qty: 150,
    driver: 'K. Elango',
    vehicle: 'TN-09-EF-5678',
    city: 'Coimbatore',
    status: 'Dispatched',
    slot: '14:00-16:00',
    subtotal: 13860,
    tax: 2494.8,
    deliveryCharge: 250,
    total: 16604.8,
  },
  {
    orderNumber: 'FD-260803-031',
    customer: 'Suresh Transports',
    site: 'Warehouse',
    fuelCode: 'PTL',
    qty: 320,
    driver: 'M. Saravanan',
    vehicle: 'TN-11-GH-9012',
    city: 'Trichy',
    status: 'Approved',
    slot: '08:00-10:00',
    subtotal: 33536,
    tax: 6036.48,
    deliveryCharge: 250,
    total: 39822.48,
  },
  {
    orderNumber: 'FD-260804-002',
    customer: 'Green Valley Farms',
    site: 'Farm',
    fuelCode: 'KRS',
    qty: 90,
    driver: 'R. Rangarajan',
    vehicle: 'TN-01-AB-1234',
    city: 'Thanjavur',
    status: 'Pending',
    slot: '12:00-14:00',
    subtotal: 6714,
    tax: 1208.52,
    deliveryCharge: 250,
    total: 8172.52,
  },
  {
    orderNumber: 'FD-260804-009',
    customer: 'Sunrise Construction',
    site: 'Construction Site',
    fuelCode: 'DSL',
    qty: 650,
    driver: 'V. Vasanth',
    vehicle: 'TN-07-CD-4321',
    city: 'Chennai',
    status: 'Pending',
    slot: '06:00-08:00',
    subtotal: 60060,
    tax: 10810.8,
    deliveryCharge: 250,
    total: 71120.8,
  },
  {
    orderNumber: 'FD-260804-011',
    customer: 'Kavin LPG Retail',
    site: 'Warehouse',
    fuelCode: 'LPG',
    qty: 210,
    driver: 'K. Elango',
    vehicle: 'TN-09-EF-5678',
    city: 'Salem',
    status: 'Cancelled',
    slot: '16:00-18:00',
    subtotal: 12852,
    tax: 2313.36,
    deliveryCharge: 250,
    total: 15415.36,
  },
  {
    orderNumber: 'FD-260805-004',
    customer: 'Nila Textiles',
    site: 'Factory',
    fuelCode: 'PTL',
    qty: 180,
    driver: 'M. Saravanan',
    vehicle: 'TN-11-GH-9012',
    city: 'Erode',
    status: 'Delivered',
    slot: '08:00-10:00',
    subtotal: 18864,
    tax: 3395.52,
    deliveryCharge: 250,
    total: 22509.52,
  },
];

const registrations = [
  {
    regId: 'REG-2026-901',
    companyName: 'Southern Logistics & Freight Solutions Pvt Ltd',
    businessType: 'Logistics',
    contactPerson: 'K. Vijaykumar',
    designation: 'Fleet Operations Director',
    mobile: '9840192834',
    email: 'vijay@southernfreight.in',
    address1: 'Plot 104, Transport Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600045',
    gstNumber: '33AABCS8891A1Z8',
    panNumber: 'AABCS8891A',
    companyRegNo: 'U60231TN2016PTC099881',
    fuelType: 'DSL',
    monthlyConsumption: 45000,
    status: 'Pending Review',
    documents: [
      { type: 'GST Certificate', fileName: 'GST_SouthernFreight.pdf' },
      { type: 'PAN Card', fileName: 'PAN_SouthernFreight.pdf' },
      { type: 'Incorporation Cert', fileName: 'Inc_Cert_2016.pdf' },
    ],
  },
  {
    regId: 'REG-2026-902',
    companyName: 'Madurai Textile Mills Ltd',
    businessType: 'Manufacturing',
    contactPerson: 'M. Ramanathan',
    designation: 'Plant Head',
    mobile: '9443187654',
    email: 'ramanathan@maduraitextiles.com',
    address1: 'Industrial Area Phase II',
    city: 'Madurai',
    state: 'Tamil Nadu',
    postalCode: '625001',
    gstNumber: '33AABCM1234B1Z2',
    panNumber: 'AABCM1234B',
    companyRegNo: 'U17111TN1998PLC041234',
    fuelType: 'DSL',
    monthlyConsumption: 28000,
    status: 'Approved',
    documents: [
      { type: 'GST Certificate', fileName: 'GST_MaduraiTextiles.pdf' },
      { type: 'PAN Card', fileName: 'PAN_MaduraiTextiles.pdf' },
    ],
  },
];

const notifications = [
  {
    title: 'New Fuel Request',
    message: 'New bulk fuel request #FD-260804-009 from Sunrise Construction awaiting manager approval.',
    category: 'request',
    role: 'Depot Manager',
    type: 'info',
    orderId: 'FD-260804-009',
    read: false,
  },
  {
    title: 'Fuel Dispatched',
    message: 'Order #FD-260802-014 for Om Sri Hospital is DISPATCHED. Driver V. Vasanth en-route.',
    category: 'dispatch',
    role: 'Customer',
    type: 'success',
    orderId: 'FD-260802-014',
    read: false,
  },
  {
    title: 'Driver Assigned',
    message: 'Driver R. Rangarajan and Tanker TN-01-AB-1234 assigned to deliver Order #FD-260801-001.',
    category: 'dispatch',
    role: 'Driver',
    type: 'info',
    orderId: 'FD-260801-001',
    read: true,
  },
  {
    title: 'Low Inventory Alert',
    message: 'Depot Tank Kerosene Auxiliary Vault #4 current stock level is below safety threshold (4,200 L).',
    category: 'inventory',
    role: 'Depot Manager',
    type: 'warning',
    read: false,
  },
  {
    title: 'Registration Approved',
    message: 'Your corporate account for Madurai Textile Mills Ltd has been approved! You can now place fuel orders.',
    category: 'registration',
    role: 'Customer',
    type: 'success',
    read: true,
  },
];

const importData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seeder] Connected to MongoDB');

    // Clear existing collections
    await User.deleteMany();
    await Order.deleteMany();
    await Tank.deleteMany();
    await Driver.deleteMany();
    await Vehicle.deleteMany();
    await CustomerRegistration.deleteMany();
    await FuelPricing.deleteMany();
    await Notification.deleteMany();

    // Insert seeds
    for (const u of users) {
      await User.create(u); // Triggers bcrypt pre-save hook
    }
    await FuelPricing.insertMany(fuelPricing);
    await Tank.insertMany(tanks);
    await Driver.insertMany(drivers);
    await Vehicle.insertMany(vehicles);
    await Order.insertMany(orders);
    await CustomerRegistration.insertMany(registrations);
    await Notification.insertMany(notifications);

    console.log('[Seeder] Data Imported Successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder] Error importing data: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seeder] Connected to MongoDB');

    await User.deleteMany();
    await Order.deleteMany();
    await Tank.deleteMany();
    await Driver.deleteMany();
    await Vehicle.deleteMany();
    await CustomerRegistration.deleteMany();
    await FuelPricing.deleteMany();
    await Notification.deleteMany();

    console.log('[Seeder] Data Destroyed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder] Error destroying data: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d' || process.argv[2] === '--destroy') {
  destroyData();
} else {
  importData();
}
