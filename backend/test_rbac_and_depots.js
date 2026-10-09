const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Order = require('./models/Order');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');
const Inventory = require('./models/Inventory');
const { scopeToDepot, DEPOT_REGISTRY } = require('./utils/depotScope');

const TEST_PORT = 5088;
process.env.PORT = String(TEST_PORT);

// Import server app
const app = require('./server');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runTests = async () => {
  let passedCount = 0;
  let totalCount = 0;

  const assert = (condition, message) => {
    totalCount++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(message);
    }
    passedCount++;
    console.log(`  ✓ PASSED: ${message}`);=-
  };

  console.log('====================================================');
  console.log('   ENTERPRISE RBAC & DEPOT SCOPE VERIFICATION SUITE ');
  console.log('====================================================\n');

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;
  console.log(`Waiting for backend server to connect to MongoDB and start on ${baseUrl}...`);
  let attempts = 0;
  while (mongoose.connection.readyState !== 1 && attempts < 40) {
    await sleep(1000);
    attempts++;
  }
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Failed to connect to MongoDB Atlas within 40 seconds.');
  }
  console.log(`✓ MongoDB connection established! Testing server on ${baseUrl}...\n`);
  await sleep(1000);

  const loginUser = async (email, password) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  try {
    // ----------------------------------------------------
    // SECTION 1: AUTHENTICATION FOR ALL 6 ROLES
    // ----------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & TOKEN ISSUANCE ---');

    // 1. Admin
    const adminAuth = await loginUser('admin@fdms.com', 'admin123');
    assert(adminAuth.status === 200, 'Admin authenticates with HTTP 200');
    assert(adminAuth.data.user?.role === 'Admin', 'Admin has role "Admin"');
    assert(adminAuth.data.user?.depot === 'ALL', 'Admin has global depot scope "ALL"');
    const adminToken = adminAuth.data.token;

    // 2. Depot Manager (Chennai)
    const chnManagerAuth = await loginUser('pravin@123', 'pravin123');
    assert(chnManagerAuth.status === 200, 'Chennai Depot Manager authenticates with HTTP 200');
    assert(chnManagerAuth.data.user?.role === 'Depot Manager', 'Role is "Depot Manager"');
    assert(chnManagerAuth.data.user?.depot === 'DEP-CHN-01', 'Depot scope is "DEP-CHN-01"');
    const chnManagerToken = chnManagerAuth.data.token;

    // 3. Depot Manager (Coimbatore)
    const cbeManagerAuth = await loginUser('coimbatore.mgr@fdms.com', 'manager123');
    assert(cbeManagerAuth.status === 200, 'Coimbatore Depot Manager authenticates with HTTP 200');
    assert(cbeManagerAuth.data.user?.depot === 'DEP-CBE-05', 'Depot scope is "DEP-CBE-05"');
    const cbeManagerToken = cbeManagerAuth.data.token;

    // 4. Support Executive
    const supportAuth = await loginUser('support@fdms.com', 'support123');
    assert(supportAuth.status === 200, 'Support Executive authenticates with HTTP 200');
    assert(supportAuth.data.user?.role === 'Support Executive', 'Role is "Support Executive"');
    const supportToken = supportAuth.data.token;

    // 5. Auditor
    const auditorAuth = await loginUser('auditor@fdms.com', 'auditor123');
    assert(auditorAuth.status === 200, 'Auditor authenticates with HTTP 200');
    assert(auditorAuth.data.user?.role === 'Auditor', 'Role is "Auditor"');
    const auditorToken = auditorAuth.data.token;

    // 6. Customer
    const customerAuth = await loginUser('customer@fdms.com', 'customer123');
    assert(customerAuth.status === 200, 'Customer authenticates with HTTP 200');
    assert(customerAuth.data.user?.role === 'Customer', 'Role is "Customer"');
    const customerToken = customerAuth.data.token;

    // 7. Driver
    const driverAuth = await loginUser('driver@fdms.com', 'driver123');
    assert(driverAuth.status === 200, 'Driver authenticates with HTTP 200');
    assert(driverAuth.data.user?.role === 'Driver', 'Role is "Driver"');
    const driverToken = driverAuth.data.token;

    console.log('\n--- SECTION 2: ADMIN PLATFORM GOVERNANCE PERMISSIONS ---');

    // 2.1 User Management (/api/auth/users) - ADMIN ONLY
    const usersAdminRes = await fetch(`${baseUrl}/api/auth/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(usersAdminRes.status === 200, 'Admin can access GET /api/auth/users (HTTP 200)');

    const usersManagerRes = await fetch(`${baseUrl}/api/auth/users`, {
      headers: { Authorization: `Bearer ${chnManagerToken}` },
    });
    assert(usersManagerRes.status === 403, 'Depot Manager is BLOCKED from GET /api/auth/users (HTTP 403)');

    const usersAuditorRes = await fetch(`${baseUrl}/api/auth/users`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(usersAuditorRes.status === 403, 'Auditor is BLOCKED from GET /api/auth/users (HTTP 403)');

    const usersCustomerRes = await fetch(`${baseUrl}/api/auth/users`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(usersCustomerRes.status === 403, 'Customer is BLOCKED from GET /api/auth/users (HTTP 403)');

    // 2.2 Fuel Tariffs (/api/pricing/:code) - ADMIN ONLY FOR UPDATES
    const pricingGetRes = await fetch(`${baseUrl}/api/pricing`, {
      headers: { Authorization: `Bearer ${chnManagerToken}` },
    });
    assert(pricingGetRes.status === 200, 'Depot Manager can VIEW fuel pricing (HTTP 200)');

    const pricingManagerPut = await fetch(`${baseUrl}/api/pricing/DSL`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${chnManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price: 91.50, basePrice: 91.50 }),
    });
    assert(pricingManagerPut.status === 403, 'Depot Manager CANNOT edit fuel pricing tariffs (HTTP 403)');

    const pricingAdminPut = await fetch(`${baseUrl}/api/pricing/DSL`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price: 89.20, basePrice: 89.20 }),
    });
    assert(pricingAdminPut.status === 200, 'Admin CAN edit official fuel pricing tariffs (HTTP 200)');

    // 2.3 Audit Logs (/api/activities) - ADMIN & AUDITOR ONLY
    const auditAdminRes = await fetch(`${baseUrl}/api/activities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditAdminRes.status === 200, 'Admin can view system audit logs (HTTP 200)');

    const auditAuditorRes = await fetch(`${baseUrl}/api/activities`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(auditAuditorRes.status === 200, 'Auditor can view system audit logs (HTTP 200)');

    const auditManagerRes = await fetch(`${baseUrl}/api/activities`, {
      headers: { Authorization: `Bearer ${chnManagerToken}` },
    });
    assert(auditManagerRes.status === 403, 'Depot Manager CANNOT access platform audit logs (HTTP 403)');

    // 2.4 Customer KYC Approval / Delete - ADMIN ONLY
    const deleteCustManager = await fetch(`${baseUrl}/api/customers/dummy_id_test`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${chnManagerToken}` },
    });
    assert(deleteCustManager.status === 403, 'Depot Manager CANNOT delete customer companies (HTTP 403)');

    console.log('\n--- SECTION 3: DEPOT MANAGER OPERATIONAL PERMISSIONS ---');

    // 3.1 Tank Inventory Refill (/api/inventory/refill) - DEPOT MANAGER ONLY
    const refillAdminRes = await fetch(`${baseUrl}/api/inventory/refill`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fuelCode: 'DSL', amount: 5000 }),
    });
    assert(refillAdminRes.status === 403, 'Admin CANNOT execute physical tank refills (HTTP 403)');

    const refillAuditorRes = await fetch(`${baseUrl}/api/inventory/refill`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auditorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fuelCode: 'DSL', amount: 5000 }),
    });
    assert(refillAuditorRes.status === 403, 'Auditor CANNOT execute physical tank refills (HTTP 403)');

    const refillManagerRes = await fetch(`${baseUrl}/api/inventory/refill`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chnManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fuelCode: 'DSL', amount: 5000 }),
    });
    assert(refillManagerRes.status === 200, 'Depot Manager CAN execute physical tank refills (HTTP 200)');

    // 3.2 Vehicle Creation (/api/vehicles) - DEPOT MANAGER ONLY
    const testVehNum = `TN-01-TST-${Math.floor(1000 + Math.random() * 9000)}`;
    const vehAdminRes = await fetch(`${baseUrl}/api/vehicles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vehicleNumber: testVehNum, type: 'Heavy Tanker', capacity: 16000 }),
    });
    assert(vehAdminRes.status === 403, 'Admin CANNOT create delivery tankers (HTTP 403)');

    const vehManagerRes = await fetch(`${baseUrl}/api/vehicles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chnManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vehicleNumber: testVehNum, type: 'Heavy Tanker', capacity: 16000 }),
    });
    assert(vehManagerRes.status === 201, 'Depot Manager CAN create delivery tankers (HTTP 201)');

    // 3.3 Driver Creation (/api/drivers) - DEPOT MANAGER ONLY
    const testDriverPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const drvAdminRes = await fetch(`${baseUrl}/api/drivers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test Operator', phone: testDriverPhone, licenseNumber: 'TN-LIC-9999' }),
    });
    assert(drvAdminRes.status === 403, 'Admin CANNOT onboard drivers (HTTP 403)');

    const drvManagerRes = await fetch(`${baseUrl}/api/drivers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chnManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test Operator', phone: testDriverPhone, licenseNumber: 'TN-LIC-9999' }),
    });
    assert(drvManagerRes.status === 201, 'Depot Manager CAN onboard drivers (HTTP 201)');

    // 3.4 Order Assignment (/api/orders/:id/assign) - DEPOT MANAGER ONLY
    const assignAdminRes = await fetch(`${baseUrl}/api/orders/ORD-0001/assign`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ driver: 'Test Driver', vehicle: testVehNum }),
    });
    assert(assignAdminRes.status === 403, 'Admin CANNOT assign/dispatch tankers (HTTP 403)');

    const assignAuditorRes = await fetch(`${baseUrl}/api/orders/ORD-0001/assign`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${auditorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ driver: 'Test Driver', vehicle: testVehNum }),
    });
    assert(assignAuditorRes.status === 403, 'Auditor CANNOT assign/dispatch tankers (HTTP 403)');

    const assignManagerRes = await fetch(`${baseUrl}/api/orders/ORD-0001/assign`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${chnManagerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ driver: 'Test Driver', vehicle: testVehNum }),
    });
    assert(assignManagerRes.status !== 403, 'Depot Manager is AUTHORIZED for order assignment (HTTP !== 403)');

    console.log('\n--- SECTION 4: DEPOT SCOPING & JURISDICTION ISOLATION ---');

    // 4.1 Test scopeToDepot unit logic
    const adminReq = { user: { role: 'Admin', depot: 'ALL' }, query: {} };
    const adminScope = scopeToDepot(adminReq, { status: 'Approved' });
    assert(!adminScope.depot, 'Admin with depot="ALL" has no forced depot filter');

    const adminFilteredReq = { user: { role: 'Admin', depot: 'ALL' }, query: { depot: 'DEP-MDU-03' } };
    const adminFilteredScope = scopeToDepot(adminFilteredReq, {});
    assert(adminFilteredScope.depot === 'DEP-MDU-03', 'Admin can explicitly filter by "DEP-MDU-03"');

    const managerReq = { user: { role: 'Depot Manager', depot: 'DEP-CHN-01' }, query: { depot: 'DEP-CBE-05' } };
    const managerScope = scopeToDepot(managerReq, {});
    assert(managerScope.depot === 'DEP-CHN-01', 'Depot Manager CANNOT tamper query to view Coimbatore depot; strictly locked to "DEP-CHN-01"');

    // 4.2 Test Inventory Scoping API
    const chnInvRes = await fetch(`${baseUrl}/api/inventory`, {
      headers: { Authorization: `Bearer ${chnManagerToken}` },
    });
    const chnInvData = await chnInvRes.json();
    assert(chnInvRes.status === 200, 'Depot Manager can fetch inventory (HTTP 200)');
    const allChnDepot = (chnInvData.data || []).every((item) => !item.depot || item.depot === 'DEP-CHN-01');
    assert(allChnDepot, 'All returned inventory items belong to Chennai depot (DEP-CHN-01)');

    console.log('\n--- SECTION 5: CUSTOMER & DRIVER FLOW INTEGRITY ---');

    // 5.1 Customer can view orders
    const custOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custOrdersRes.status === 200, 'Customer can access their orders (HTTP 200)');

    // 5.2 Driver can access delivery queue
    const driverQueueRes = await fetch(`${baseUrl}/api/orders/delivery-queue`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert(driverQueueRes.status === 200, 'Driver can access delivery queue (HTTP 200)');

    // Cleanup test records
    await Vehicle.deleteOne({ vehicleNumber: testVehNum });
    await Driver.deleteOne({ phone: testDriverPhone });

    console.log('\n====================================================');
    console.log(` ALL ${passedCount}/${totalCount} RBAC & DEPOT TESTS PASSED (100% SUCCESS)`);
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
  }
};

runTests();
