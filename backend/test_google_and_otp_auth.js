const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Registration = require('./models/Registration');
const Otp = require('./models/Otp');
const { googleAuth, sendMobileOtp, verifyMobileOtp } = require('./controllers/authController');

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

const runTestSuite = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB Atlas\n');

    // Setup pending and rejected registrations for testing approval rules
    await Registration.deleteMany({
      email: { $in: ['google_pending@test.com', 'google_rejected@test.com'] },
    });
    await User.deleteMany({
      email: { $in: ['google_pending@test.com', 'google_rejected@test.com', 'google_new_account@test.com'] },
    });

    await Registration.create({
      regId: 'REG-GTEST-001',
      companyName: 'Pending Google Ltd',
      email: 'google_pending@test.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789',
      authorizedPerson: 'Sam Pending',
      mobile: '9840112301',
      gstNumber: '33AAAAA1111A1Z1',
      panNumber: 'AAAAA1111A',
      address: 'Plot 1, Test Industrial Estate',
      status: 'Pending',
    });

    await Registration.create({
      regId: 'REG-GTEST-002',
      companyName: 'Rejected Google Ltd',
      email: 'google_rejected@test.com',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789',
      authorizedPerson: 'Max Rejected',
      mobile: '9840112302',
      gstNumber: '33BBBBB2222B1Z2',
      panNumber: 'BBBBB2222B',
      address: 'Plot 2, Test Industrial Estate',
      status: 'Rejected',
    });

    // =========================================================================
    // 1. GOOGLE OAUTH AUTHENTICATION TESTS
    // =========================================================================
    console.log('===========================================================');
    console.log('             PART 1: GOOGLE OAUTH LOGIN TESTS              ');
    console.log('===========================================================');

    // 1.1 Admin Google Login
    console.log('\n--- TEST 1.1: Admin Google Login -> Admin Dashboard ---');
    const resGoogleAdmin = createMockRes();
    await googleAuth({ body: { email: 'admin@fdms.com', name: 'Admin Google User' } }, resGoogleAdmin, (err) => { throw err; });
    console.log(`Status: ${resGoogleAdmin.statusCode}, Role: ${resGoogleAdmin.data?.user?.role}, Token: ${!!resGoogleAdmin.data?.token}`);
    if (resGoogleAdmin.statusCode !== 200 || resGoogleAdmin.data?.user?.role !== 'Admin') {
      throw new Error('Test 1.1 failed: Expected Admin role');
    }
    console.log('✓ Test 1.1 Passed: Existing Admin logged in via Google with Admin role.\n');

    // 1.2 Depot Manager Google Login
    console.log('--- TEST 1.2: Depot Manager Google Login -> Depot Manager Dashboard ---');
    const resGoogleMgr = createMockRes();
    await googleAuth({ body: { email: 'pravin@123', name: 'Pravin Manager' } }, resGoogleMgr, (err) => { throw err; });
    console.log(`Status: ${resGoogleMgr.statusCode}, Role: ${resGoogleMgr.data?.user?.role}, Token: ${!!resGoogleMgr.data?.token}`);
    if (resGoogleMgr.statusCode !== 200 || resGoogleMgr.data?.user?.role !== 'Depot Manager') {
      throw new Error('Test 1.2 failed: Expected Depot Manager role');
    }
    console.log('✓ Test 1.2 Passed: Existing Depot Manager logged in via Google.\n');

    // 1.3 Driver Google Login
    console.log('--- TEST 1.3: Driver Google Login -> Driver Dashboard ---');
    const resGoogleDriver = createMockRes();
    await googleAuth({ body: { email: 'driver@fdms.com', name: 'Rangarajan Driver' } }, resGoogleDriver, (err) => { throw err; });
    console.log(`Status: ${resGoogleDriver.statusCode}, Role: ${resGoogleDriver.data?.user?.role}, Token: ${!!resGoogleDriver.data?.token}`);
    if (resGoogleDriver.statusCode !== 200 || resGoogleDriver.data?.user?.role !== 'Driver') {
      throw new Error('Test 1.3 failed: Expected Driver role');
    }
    console.log('✓ Test 1.3 Passed: Existing Driver logged in via Google.\n');

    // 1.4 Customer Google Login
    console.log('--- TEST 1.4: Customer Google Login -> Customer Dashboard ---');
    const resGoogleCust = createMockRes();
    await googleAuth({ body: { email: 'customer@fdms.com', name: 'Chennai Steel' } }, resGoogleCust, (err) => { throw err; });
    console.log(`Status: ${resGoogleCust.statusCode}, Role: ${resGoogleCust.data?.user?.role}, Token: ${!!resGoogleCust.data?.token}`);
    if (resGoogleCust.statusCode !== 200 || resGoogleCust.data?.user?.role !== 'Customer') {
      throw new Error('Test 1.4 failed: Expected Customer role');
    }
    console.log('✓ Test 1.4 Passed: Existing Customer logged in via Google.\n');

    // 1.5 Create Account If Not Exists
    console.log('--- TEST 1.5: Google Login: Create Account If Not Exists ---');
    const resGoogleNew = createMockRes();
    await googleAuth(
      { body: { email: 'google_new_account@test.com', name: 'Fresh Google User' } },
      resGoogleNew,
      (err) => { throw err; }
    );
    console.log(`Status: ${resGoogleNew.statusCode}, Role: ${resGoogleNew.data?.user?.role}, Name: ${resGoogleNew.data?.user?.name}`);
    if (resGoogleNew.statusCode !== 200 || resGoogleNew.data?.user?.role !== 'Customer') {
      throw new Error('Test 1.5 failed: Account was not created with Customer role');
    }
    const createdUser = await User.findOne({ email: 'google_new_account@test.com' });
    if (!createdUser) throw new Error('User was not persisted to MongoDB');
    console.log('✓ Test 1.5 Passed: New user automatically created in MongoDB with Customer role.\n');

    // 1.6 Google Approval Rule: Pending
    console.log('--- TEST 1.6: Google Login: Pending Account Blocked ---');
    const resGooglePending = createMockRes();
    await googleAuth({ body: { email: 'google_pending@test.com' } }, resGooglePending, (err) => { throw err; });
    console.log(`Status: ${resGooglePending.statusCode}, Message: "${resGooglePending.data?.message}"`);
    if (resGooglePending.statusCode !== 403 || resGooglePending.data?.message !== 'Your account is awaiting approval.') {
      throw new Error('Test 1.6 failed: Expected 403 with "Your account is awaiting approval."');
    }
    console.log('✓ Test 1.6 Passed: Pending Google login blocked.\n');

    // 1.7 Google Approval Rule: Rejected
    console.log('--- TEST 1.7: Google Login: Rejected Account Blocked ---');
    const resGoogleRejected = createMockRes();
    await googleAuth({ body: { email: 'google_rejected@test.com' } }, resGoogleRejected, (err) => { throw err; });
    console.log(`Status: ${resGoogleRejected.statusCode}, Message: "${resGoogleRejected.data?.message}"`);
    if (resGoogleRejected.statusCode !== 403 || resGoogleRejected.data?.message !== 'Your registration request was rejected.') {
      throw new Error('Test 1.7 failed: Expected 403 with "Your registration request was rejected."');
    }
    console.log('✓ Test 1.7 Passed: Rejected Google login blocked.\n');

    // =========================================================================
    // 2. MOBILE OTP AUTHENTICATION TESTS
    // =========================================================================
    console.log('===========================================================');
    console.log('             PART 2: MOBILE OTP LOGIN TESTS                ');
    console.log('===========================================================');

    // 2.1 Send OTP for Registered Mobile (Customer: +91 98401 23456)
    console.log('\n--- TEST 2.1: Send OTP to Registered Mobile ---');
    const resSendOtp = createMockRes();
    await sendMobileOtp({ body: { mobile: '9840123456' } }, resSendOtp, (err) => { throw err; });
    console.log(`Status: ${resSendOtp.statusCode}, Message: "${resSendOtp.data?.message}", OTP: ${resSendOtp.data?.otpPreview}`);
    if (resSendOtp.statusCode !== 200 || !resSendOtp.data?.otpPreview) {
      throw new Error('Test 2.1 failed: Expected successful OTP send');
    }
    const generatedOtp = resSendOtp.data.otpPreview;
    console.log('✓ Test 2.1 Passed: OTP generated with 5-minute expiry.\n');

    // 2.2 Verify OTP with Invalid Code
    console.log('--- TEST 2.2: Verify OTP with Incorrect Code ---');
    const resWrongOtp = createMockRes();
    await verifyMobileOtp({ body: { mobile: '9840123456', otp: '000000' } }, resWrongOtp, (err) => { throw err; });
    console.log(`Status: ${resWrongOtp.statusCode}, Message: "${resWrongOtp.data?.message}"`);
    if (resWrongOtp.statusCode !== 400 || !resWrongOtp.data?.message.includes('Invalid OTP code')) {
      throw new Error('Test 2.2 failed: Expected 400 for incorrect OTP');
    }
    console.log('✓ Test 2.2 Passed: Incorrect OTP correctly rejected.\n');

    // 2.3 Verify OTP with Valid Code -> Customer Login & JWT
    console.log('--- TEST 2.3: Verify OTP with Valid Code -> Customer Login ---');
    const resValidOtp = createMockRes();
    await verifyMobileOtp({ body: { mobile: '9840123456', otp: generatedOtp } }, resValidOtp, (err) => { throw err; });
    console.log(`Status: ${resValidOtp.statusCode}, Role: ${resValidOtp.data?.user?.role}, Token: ${!!resValidOtp.data?.token}`);
    if (resValidOtp.statusCode !== 200 || resValidOtp.data?.user?.role !== 'Customer' || !resValidOtp.data?.token) {
      throw new Error('Test 2.3 failed: Expected 200 with JWT for Customer');
    }
    console.log('✓ Test 2.3 Passed: Customer logged in via Mobile OTP with verified JWT.\n');

    // 2.4 Expired OTP Validation (5 Minutes Expiry)
    console.log('--- TEST 2.4: Expired OTP Enforcement ---');
    await Otp.create({
      mobile: '9840123456',
      otp: '112233',
      expiresAt: new Date(Date.now() - 10000), // Expired in past
    });
    const resExpiredOtp = createMockRes();
    await verifyMobileOtp({ body: { mobile: '9840123456', otp: '112233' } }, resExpiredOtp, (err) => { throw err; });
    console.log(`Status: ${resExpiredOtp.statusCode}, Message: "${resExpiredOtp.data?.message}"`);
    if (resExpiredOtp.statusCode !== 400 || !resExpiredOtp.data?.message.includes('expired')) {
      throw new Error('Test 2.4 failed: Expired OTP was not rejected');
    }
    console.log('✓ Test 2.4 Passed: Expired OTP rejected with 5-minute expiry notice.\n');

    // 2.5 Send OTP to Pending User
    console.log('--- TEST 2.5: Mobile OTP to Pending User Blocked ---');
    const resOtpPending = createMockRes();
    await sendMobileOtp({ body: { mobile: '9840112301' } }, resOtpPending, (err) => { throw err; });
    console.log(`Status: ${resOtpPending.statusCode}, Message: "${resOtpPending.data?.message}"`);
    if (resOtpPending.statusCode !== 403 || resOtpPending.data?.message !== 'Your account is awaiting approval.') {
      throw new Error('Test 2.5 failed: Expected 403 with "Your account is awaiting approval."');
    }
    console.log('✓ Test 2.5 Passed: Pending account blocked from Mobile OTP.\n');

    // 2.6 Send OTP to Rejected User
    console.log('--- TEST 2.6: Mobile OTP to Rejected User Blocked ---');
    const resOtpRejected = createMockRes();
    await sendMobileOtp({ body: { mobile: '9840112302' } }, resOtpRejected, (err) => { throw err; });
    console.log(`Status: ${resOtpRejected.statusCode}, Message: "${resOtpRejected.data?.message}"`);
    if (resOtpRejected.statusCode !== 403 || resOtpRejected.data?.message !== 'Your registration request was rejected.') {
      throw new Error('Test 2.6 failed: Expected 403 with "Your registration request was rejected."');
    }
    console.log('✓ Test 2.6 Passed: Rejected account blocked from Mobile OTP.\n');

    // 2.7 Driver Mobile OTP Login (+91 98400 11223)
    console.log('--- TEST 2.7: Driver Mobile OTP Login -> Driver Dashboard ---');
    const resSendDriverOtp = createMockRes();
    await sendMobileOtp({ body: { mobile: '9840011223' } }, resSendDriverOtp, (err) => { throw err; });
    const driverOtp = resSendDriverOtp.data.otpPreview;
    const resVerifyDriverOtp = createMockRes();
    await verifyMobileOtp({ body: { mobile: '9840011223', otp: driverOtp } }, resVerifyDriverOtp, (err) => { throw err; });
    console.log(`Status: ${resVerifyDriverOtp.statusCode}, Role: ${resVerifyDriverOtp.data?.user?.role}, Token: ${!!resVerifyDriverOtp.data?.token}`);
    if (resVerifyDriverOtp.statusCode !== 200 || resVerifyDriverOtp.data?.user?.role !== 'Driver') {
      throw new Error('Test 2.7 failed: Expected Driver role');
    }
    console.log('✓ Test 2.7 Passed: Driver logged in via Mobile OTP with Driver role.\n');

    // Clean up test records
    await Registration.deleteMany({
      email: { $in: ['google_pending@test.com', 'google_rejected@test.com'] },
    });
    await User.deleteMany({
      email: { $in: ['google_pending@test.com', 'google_rejected@test.com', 'google_new_account@test.com'] },
    });
    await Otp.deleteMany({ mobile: { $in: ['9840123456', '9840011223'] } });

    console.log('===========================================================');
    console.log('  ALL GOOGLE OAUTH & MOBILE OTP TESTS PASSED (100%)       ');
    console.log('===========================================================');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runTestSuite();
