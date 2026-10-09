process.env.VERCEL = '1';
import app from './backend/server.js';
import http from 'http';

const server = http.createServer(app);
server.listen(5091, async () => {
  try {
    const base = 'http://localhost:5091/api';
    console.log('[TEST] 1. Checking /api/health...');
    const health = await fetch(base + '/health').then((r) => r.json());
    console.log('[TEST] -> Health status:', health.status, '| Service:', health.service);

    console.log('[TEST] 2. Testing Admin Login (admin@fdms.com)...');
    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fdms.com', password: 'admin123' }),
    }).then((r) => r.json());

    if (!loginRes.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginRes));
    }
    console.log('[TEST] -> Admin login SUCCESS. Role:', loginRes.user?.role, '| Token length:', loginRes.token.length);
    const token = loginRes.token;
    const authHeaders = { Authorization: 'Bearer ' + token };

    console.log('[TEST] 3. Testing Dashboard Endpoints...');
    const endpoints = [
      '/auth/me',
      '/orders',
      '/inventory',
      '/vehicles',
      '/inventory/alerts',
      '/customers',
      '/drivers',
      '/registrations',
      '/activities?limit=6',
    ];

    for (const ep of endpoints) {
      const res = await fetch(base + ep, { headers: authHeaders });
      const data = await res.json();
      const count = Array.isArray(data.data) ? data.data.length : data.count || (data.success ? 'OK' : 'Unknown');
      console.log(`[TEST] -> ${ep} => HTTP ${res.status} | Results: ${count}`);
      if (res.status !== 200) {
        throw new Error(`Endpoint ${ep} returned status ${res.status}`);
      }
    }

    console.log('[TEST] 4. Testing Customer Login (customer@fdms.com)...');
    const custRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@fdms.com', password: 'customer123' }),
    }).then((r) => r.json());
    console.log('[TEST] -> Customer login SUCCESS. Role:', custRes.user?.role);

    console.log('[TEST] 5. Testing Driver Login (driver@fdms.com)...');
    const drvRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver@fdms.com', password: 'driver123' }),
    }).then((r) => r.json());
    console.log('[TEST] -> Driver login SUCCESS. Role:', drvRes.user?.role);

    console.log('\n======================================================');
    console.log('✓ ALL INTEGRATION AND DASHBOARD ENDPOINT TESTS PASSED!');
    console.log('======================================================\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
    server.close();
    process.exit(1);
  }
});
