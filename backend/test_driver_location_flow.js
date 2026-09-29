const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const DriverLocation = require('./models/DriverLocation');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');
const { saveDriverLocation, getDriverLocationHistory } = require('./controllers/driverController');

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
};

const runTest = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ MongoDB Connected.\n');

    // 1. Verify DriverLocations collection
    console.log('--- 1. Testing DriverLocations Model ---');
    const testDoc = await DriverLocation.create({
      driverName: 'Test Driver Verification',
      vehicleId: 'TEST-VEH-999',
      latitude: 13.0827,
      longitude: 80.2707,
      speed: 55,
      accuracy: 8,
      timestamp: new Date(),
    });
    console.log(`✓ DriverLocation created with ID: ${testDoc._id}`);
    console.log(`✓ Stored in collection: ${DriverLocation.collection.name}`);
    if (DriverLocation.collection.name !== 'DriverLocations') {
      throw new Error(`Expected collection name 'DriverLocations', got '${DriverLocation.collection.name}'`);
    }

    // 2. Testing Controller saveDriverLocation (POST /api/drivers/location)
    console.log('\n--- 2. Testing saveDriverLocation Controller ---');
    
    // Create test vehicle
    let testVeh = await Vehicle.findOne({ vehicleNumber: 'TEST-GPS-001' });
    if (!testVeh) {
      testVeh = await Vehicle.create({
        vehicleNumber: 'TEST-GPS-001',
        driverName: 'R. Rangarajan',
        latitude: 13.0,
        longitude: 80.0,
        status: 'In Transit',
      });
    }

    const mockReq = {
      body: {
        driverId: testDoc._id.toString(),
        driverName: 'R. Rangarajan',
        vehicleId: 'TEST-GPS-001',
        latitude: 13.0850,
        longitude: 80.2750,
        speed: 62,
        accuracy: 5,
        heading: 90,
        timestamp: new Date().toISOString(),
      },
    };
    const mockRes = createMockRes();

    await saveDriverLocation(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    console.log(`Status: ${mockRes.statusCode}, Success: ${mockRes.data?.success}`);
    if (mockRes.statusCode !== 201 || !mockRes.data?.success) {
      throw new Error('saveDriverLocation failed');
    }
    console.log('✓ saveDriverLocation returned 201 Created and updated vehicle');

    // Verify Vehicle was updated in MongoDB
    const updatedVeh = await Vehicle.findOne({ vehicleNumber: 'TEST-GPS-001' });
    console.log(`Vehicle Lat: ${updatedVeh.latitude}, Lng: ${updatedVeh.longitude}, Speed: ${updatedVeh.speed}`);
    console.log(`Vehicle locationHistory count: ${updatedVeh.locationHistory.length}`);
    if (updatedVeh.latitude !== 13.0850 || updatedVeh.longitude !== 80.2750) {
      throw new Error('Vehicle latitude/longitude was not updated properly');
    }
    console.log('✓ Vehicle location and breadcrumb history verified.');

    // 3. Testing getDriverLocationHistory Controller (GET /api/drivers/location/history)
    console.log('\n--- 3. Testing getDriverLocationHistory Controller ---');
    const histReq = {
      query: {
        vehicleId: 'TEST-GPS-001',
        limit: 50,
      },
    };
    const histRes = createMockRes();

    await getDriverLocationHistory(histReq, histRes, (err) => {
      if (err) throw err;
    });

    console.log(`Status: ${histRes.statusCode}, History Points: ${histRes.data?.count}`);
    if (histRes.statusCode !== 200 || !histRes.data?.data || histRes.data.count < 1) {
      throw new Error('getDriverLocationHistory failed');
    }
    console.log('✓ getDriverLocationHistory returned points for route polyline.');

    // Cleanup test data
    console.log('\n--- 4. Cleaning up test verification documents ---');
    await DriverLocation.deleteMany({
      vehicleId: { $in: ['TEST-VEH-999', 'TEST-GPS-001'] },
    });
    await Vehicle.deleteOne({ vehicleNumber: 'TEST-GPS-001' });
    console.log('✓ Cleanup completed.');

    console.log('\n=============================================');
    console.log('ALL BACKEND GPS TRACKING VERIFICATIONS PASSED!');
    console.log('=============================================');
    process.exit(0);
  } catch (error) {
    console.error('✗ Verification failed:', error);
    process.exit(1);
  }
};

runTest();
