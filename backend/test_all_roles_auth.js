const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Registration = require('./models/Registration');
const { login } = require('./controllers/authController');

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

const runAllRolesAuthTest = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB Atlas\n');

    // Test 1: Missing credentials
    console.log('--- TEST 1: Missing credentials ---');
    const resEmpty = createMockRes();
    await login({ body: { email: '', password: '' } }, resEmpty, (err) => { throw err; });
    console.log(`Status: ${resEmpty.statusCode}, Message: "${resEmpty.data?.message}"`);
    if (resEmpty.statusCode !== 400 || !resEmpty.data?.message.includes('Please provide both email and password')) {
      throw new Error('Test 1 failed');
    }
    console.log('✓ Test 1 Passed: Missing credentials rejected.\n');

    // Test 2: Invalid password on valid user
    console.log('--- TEST 2: Invalid password validation against MongoDB ---');
    const resWrongPw = createMockRes();
    await login({ body: { email: 'admin@fdms.com', password: 'wrongpassword' } }, resWrongPw, (err) => { throw err; });
    console.log(`Status: ${resWrongPw.statusCode}, Message: "${resWrongPw.data?.message}"`);
    if (resWrongPw.statusCode !== 401 || resWrongPw.data?.message !== 'Invalid email or password') {
      throw new Error('Test 2 failed');
    }
    console.log('✓ Test 2 Passed: Invalid password rejected by bcrypt.\n');

    // Test 3: Admin Real MongoDB Authentication
    console.log('--- TEST 3: Admin Real MongoDB Authentication ---');
    const resAdmin = createMockRes();
    await login({ body: { email: 'admin@fdms.com', password: 'admin123' } }, resAdmin, (err) => { throw err; });
    console.log(`Status: ${resAdmin.statusCode}, Role: ${resAdmin.data?.user?.role}, Token: ${!!resAdmin.data?.token}`);
    if (resAdmin.statusCode !== 200 || resAdmin.data?.user?.role !== 'Admin' || !resAdmin.data?.token) {
      throw new Error('Test 3 failed');
    }
    console.log('✓ Test 3 Passed: Admin authenticated through MongoDB with real JWT.\n');

    // Test 4: Depot Manager Real MongoDB Authentication
    console.log('--- TEST 4: Depot Manager Real MongoDB Authentication ---');
    const resManager = createMockRes();
    await login({ body: { email: 'pravin@123', password: 'pravin123' } }, resManager, (err) => { throw err; });
    console.log(`Status: ${resManager.statusCode}, Role: ${resManager.data?.user?.role}, Token: ${!!resManager.data?.token}`);
    if (resManager.statusCode !== 200 || resManager.data?.user?.role !== 'Depot Manager' || !resManager.data?.token) {
      throw new Error('Test 4 failed');
    }
    console.log('✓ Test 4 Passed: Depot Manager authenticated through MongoDB with real JWT.\n');

    // Test 5: Customer Real MongoDB Authentication
    console.log('--- TEST 5: Customer Real MongoDB Authentication ---');
    const resCustomer = createMockRes();
    await login({ body: { email: 'customer@fdms.com', password: 'customer123' } }, resCustomer, (err) => { throw err; });
    console.log(`Status: ${resCustomer.statusCode}, Role: ${resCustomer.data?.user?.role}, Token: ${!!resCustomer.data?.token}`);
    if (resCustomer.statusCode !== 200 || resCustomer.data?.user?.role !== 'Customer' || !resCustomer.data?.token) {
      throw new Error('Test 5 failed');
    }
    console.log('✓ Test 5 Passed: Customer authenticated through MongoDB with real JWT.\n');

    // Test 6: Driver Real MongoDB Authentication
    console.log('--- TEST 6: Driver Real MongoDB Authentication ---');
    const resDriver = createMockRes();
    await login({ body: { email: 'driver@fdms.com', password: 'driver123' } }, resDriver, (err) => { throw err; });
    console.log(`Status: ${resDriver.statusCode}, Role: ${resDriver.data?.user?.role}, Token: ${!!resDriver.data?.token}`);
    if (resDriver.statusCode !== 200 || resDriver.data?.user?.role !== 'Driver' || !resDriver.data?.token) {
      throw new Error('Test 6 failed');
    }
    console.log('✓ Test 6 Passed: Driver authenticated through MongoDB with real JWT.\n');

    // Test 7: Pending Registration Login Status
    console.log('--- TEST 7: Pending Account Status Enforcement ---');
    await Registration.deleteOne({ email: 'verify_pending@example.com' });
    await Registration.create({
      regId: 'REG-PENDING-001',
      companyName: 'Pending Testing Corp',
      email: 'verify_pending@example.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789',
      authorizedPerson: 'John Doe',
      mobile: '9840112233',
      gstNumber: '33ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      address: '123 Harbor Road',
      status: 'Pending',
    });
    const resPending = createMockRes();
    await login({ body: { email: 'verify_pending@example.com', password: 'anyPassword123' } }, resPending, (err) => { throw err; });
    console.log(`Status: ${resPending.statusCode}, Message: "${resPending.data?.message}"`);
    if (resPending.statusCode !== 403 || resPending.data?.message !== 'Your account is awaiting approval.') {
      throw new Error('Test 7 failed');
    }
    console.log('✓ Test 7 Passed: Pending account receives "Your account is awaiting approval."\n');

    // Test 8: Rejected Registration Login Status
    console.log('--- TEST 8: Rejected Account Status Enforcement ---');
    await Registration.deleteOne({ email: 'verify_rejected@example.com' });
    await Registration.create({
      regId: 'REG-REJECTED-001',
      companyName: 'Rejected Testing Corp',
      email: 'verify_rejected@example.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789',
      authorizedPerson: 'Jane Smith',
      mobile: '9840112244',
      gstNumber: '33ABCDE1234F2Z6',
      panNumber: 'ABCDE1234G',
      address: '456 Industrial Way',
      status: 'Rejected',
    });
    const resRejected = createMockRes();
    await login({ body: { email: 'verify_rejected@example.com', password: 'anyPassword123' } }, resRejected, (err) => { throw err; });
    console.log(`Status: ${resRejected.statusCode}, Message: "${resRejected.data?.message}"`);
    if (resRejected.statusCode !== 403 || resRejected.data?.message !== 'Your registration request was rejected.') {
      throw new Error('Test 8 failed');
    }
    console.log('✓ Test 8 Passed: Rejected account receives "Your registration request was rejected."\n');

    // Clean up temporary test registrations
    await Registration.deleteMany({ email: { $in: ['verify_pending@example.com', 'verify_rejected@example.com'] } });

    console.log('===========================================================');
    console.log(' ALL 8 REAL DATABASE AUTHENTICATION TESTS PASSED (100%)');
    console.log('===========================================================');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runAllRolesAuthTest();
