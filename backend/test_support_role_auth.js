const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const { login, googleAuth } = require('./controllers/authController');

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

const runSupportRoleTests = async () => {
  console.log('\n======================================================');
  console.log('   SUPPORT EXECUTIVE & AUDITOR ROLE VERIFICATION TEST  ');
  console.log('======================================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB Atlas');

    // TEST 1: Support Executive Password Login
    console.log('\n--- TEST 1: Support Executive Login ---');
    const resSupport = createMockRes();
    await login(
      { body: { email: 'support@fdms.com', password: 'support123' } },
      resSupport,
      (err) => { throw err; }
    );
    console.log(`Status: ${resSupport.statusCode}, Role: ${resSupport.data?.user?.role}, Token: ${!!resSupport.data?.token}`);
    if (resSupport.statusCode !== 200 || resSupport.data?.user?.role !== 'Support Executive' || !resSupport.data?.token) {
      throw new Error('Test 1 failed: Support Executive could not authenticate');
    }
    console.log('✓ Test 1 Passed: Support Executive authenticated with real JWT token.');

    // TEST 2: Auditor Password Login
    console.log('\n--- TEST 2: Auditor Login ---');
    const resAuditor = createMockRes();
    await login(
      { body: { email: 'auditor@fdms.com', password: 'auditor123' } },
      resAuditor,
      (err) => { throw err; }
    );
    console.log(`Status: ${resAuditor.statusCode}, Role: ${resAuditor.data?.user?.role}, Token: ${!!resAuditor.data?.token}`);
    if (resAuditor.statusCode !== 200 || resAuditor.data?.user?.role !== 'Auditor' || !resAuditor.data?.token) {
      throw new Error('Test 2 failed: Auditor could not authenticate');
    }
    console.log('✓ Test 2 Passed: Auditor authenticated with real JWT token.');

    // TEST 3: Support Executive Google OAuth Login
    console.log('\n--- TEST 3: Support Executive Google OAuth Login ---');
    const resGoogleSupport = createMockRes();
    await googleAuth(
      { body: { email: 'support@fdms.com', name: 'Kavitha Sundaram' } },
      resGoogleSupport,
      (err) => { throw err; }
    );
    console.log(`Status: ${resGoogleSupport.statusCode}, Role: ${resGoogleSupport.data?.user?.role}, Token: ${!!resGoogleSupport.data?.token}`);
    if (resGoogleSupport.statusCode !== 200 || resGoogleSupport.data?.user?.role !== 'Support Executive') {
      throw new Error('Test 3 failed: Support Executive Google OAuth login failed');
    }
    console.log('✓ Test 3 Passed: Support Executive logged in via Google OAuth with Support Executive role.');

    // TEST 4: JWT Token Verification
    console.log('\n--- TEST 4: JWT Token Payload & Signature Verification ---');
    const decoded = jwt.verify(resSupport.data.token, process.env.JWT_SECRET || 'fuel_delivery_super_secret_jwt_key_2026');
    console.log(`Decoded JWT -> ID: ${decoded.id}, Role: ${decoded.role}`);
    if (decoded.role !== 'Support Executive') {
      throw new Error('Test 4 failed: JWT role claim mismatch');
    }
    console.log('✓ Test 4 Passed: JWT token signature and role payload verified successfully.');

    console.log('\n======================================================');
    console.log(' ALL SUPPORT EXECUTIVE & AUDITOR ROLE TESTS PASSED!   ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
};

runSupportRoleTests();
