const http = require('http');

async function testEndpoint(name, url, method = 'GET', body = null, token = null) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await res.json();
    console.log(`[PASS] ${name}: status ${res.status}`, data?.message || data?.role || (data?.length !== undefined ? `${data.length} items` : 'OK'));
    return data;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    return null;
  }
}

async function runTests() {
  console.log('Testing FDMS APIs on http://localhost:5000...');
  
  // 1. Root
  await testEndpoint('Health Check', 'http://localhost:5000/');

  // 2. Admin Login
  const adminRes = await testEndpoint('Admin Login', 'http://localhost:5000/api/auth/login', 'POST', {
    email: 'admin@fdms.com',
    password: 'admin123'
  });

  // 3. Depot Manager Login
  await testEndpoint('Depot Manager Login', 'http://localhost:5000/api/auth/login', 'POST', {
    email: 'pravin@123',
    password: 'pravin123'
  });

  // 4. Customer Login
  const custRes = await testEndpoint('Customer Login', 'http://localhost:5000/api/auth/login', 'POST', {
    email: 'customer@fdms.com',
    password: 'customer123'
  });

  // 5. Driver Login
  const driverRes = await testEndpoint('Driver Login', 'http://localhost:5000/api/auth/login', 'POST', {
    email: 'driver@fdms.com',
    password: 'driver123'
  });

  const adminToken = adminRes?.token;
  if (adminToken) {
    // 6. Orders List
    await testEndpoint('Get Orders (Admin)', 'http://localhost:5000/api/orders', 'GET', null, adminToken);

    // 7. Notifications List
    await testEndpoint('Get Notifications (Admin)', 'http://localhost:5000/api/notifications', 'GET', null, adminToken);

    // 8. Reports Summary
    await testEndpoint('Get Reports Summary (Admin)', 'http://localhost:5000/api/reports/summary', 'GET', null, adminToken);

    // 9. Vehicles List
    await testEndpoint('Get Vehicles / Fleet (Admin)', 'http://localhost:5000/api/fleet', 'GET', null, adminToken);

    // 10. Drivers List
    await testEndpoint('Get Drivers (Admin)', 'http://localhost:5000/api/drivers', 'GET', null, adminToken);

    // 11. Tanks List
    await testEndpoint('Get Tanks (Admin)', 'http://localhost:5000/api/inventory', 'GET', null, adminToken);

    // 12. Fuel Pricing
    await testEndpoint('Get Fuel Pricing (Admin)', 'http://localhost:5000/api/pricing', 'GET', null, adminToken);

    // 13. Customer Registrations
    await testEndpoint('Get Registrations (Admin)', 'http://localhost:5000/api/registrations', 'GET', null, adminToken);

    // 14. Activity Logs
    await testEndpoint('Get Activity Logs (Admin)', 'http://localhost:5000/api/activities', 'GET', null, adminToken);

    // 15. Order Invoice
    await testEndpoint('Get Order Invoice (Admin)', 'http://localhost:5000/api/orders/FD-260801-001/invoice', 'GET', null, adminToken);
  }

  console.log('\nAll tests completed.');
  process.exit(0);
}

runTests();
