const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Registration = require('./models/Registration');
const User = require('./models/User');
const {
  createRegistration,
  approveRegistration,
  rejectRegistration,
  getRegistrations,
} = require('./controllers/registrationController');
const { login } = require('./controllers/authController');
const { getCustomers } = require('./controllers/customerController');

// Mock Express req/res
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

const runVerification = async () => {
  console.log('\n======================================================');
  console.log('   FDMS CUSTOMER APPROVAL WORKFLOW VERIFICATION TEST   ');
  console.log('======================================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[1/7] Connected to MongoDB Atlas successfully.');

    // Cleanup previous test data
    await Registration.deleteMany({
      email: { $in: ['test_corp_flow@example.com', 'test_reject_flow@example.com'] },
    });
    await User.deleteMany({
      email: { $in: ['test_corp_flow@example.com', 'test_reject_flow@example.com'] },
    });

    // -----------------------------------------------------------------
    // TEST 1: Customer Registration Submission
    // -----------------------------------------------------------------
    console.log('\n--- TEST 1: Submit Customer Registration ---');
    const regReq = {
      body: {
        email: 'test_corp_flow@example.com',
        password: 'CorpPassword123!',
        confirmPassword: 'CorpPassword123!',
        companyName: 'Apex Industrial Steel Works',
        authorizedPerson: 'Rajesh V. Sharma',
        mobile: '9840198401',
        gstNumber: '33AABCA1234A1Z5',
        panNumber: 'AABCA1234A',
        address: 'Plot 104, Industrial Corridor, Guindy',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600032',
      },
      files: [
        {
          fieldname: 'panDocument',
          filename: 'pan_doc_test.pdf',
          originalname: 'PAN_ApexSteel.pdf',
          mimetype: 'application/pdf',
          size: 102400,
        },
        {
          fieldname: 'gstCertificate',
          filename: 'gst_cert_test.pdf',
          originalname: 'GSTIN_ApexSteel.pdf',
          mimetype: 'application/pdf',
          size: 154200,
        },
        {
          fieldname: 'companyRegistrationCertificate',
          filename: 'inc_cert_test.pdf',
          originalname: 'Incorporation_Apex.pdf',
          mimetype: 'application/pdf',
          size: 210000,
        },
        {
          fieldname: 'addressProof',
          filename: 'addr_proof_test.pdf',
          originalname: 'EB_Bill_Address.pdf',
          mimetype: 'application/pdf',
          size: 89000,
        },
      ],
    };
    const regRes = createMockRes();
    await createRegistration(regReq, regRes, (err) => {
      throw err;
    });

    console.log(`Response status: ${regRes.statusCode}`);
    console.log(`Response message: "${regRes.data?.message}"`);

    const expectedSubmissionMsg =
      'Your registration request has been submitted successfully and is awaiting approval.';
    if (regRes.data?.message !== expectedSubmissionMsg) {
      throw new Error(`Unexpected message: got "${regRes.data?.message}"`);
    }

    // Verify registration saved in Registration collection
    const savedReg = await Registration.findOne({ email: 'test_corp_flow@example.com' });
    if (!savedReg) throw new Error('Registration document was not saved in Registration collection!');
    if (savedReg.status !== 'Pending') throw new Error(`Expected status 'Pending', got '${savedReg.status}'`);
    if (!savedReg.password.startsWith('$2')) throw new Error('Password was not hashed with bcrypt!');

    // Verify Customer account was NOT created in Users collection yet
    const pendingUser = await User.findOne({ email: 'test_corp_flow@example.com' });
    if (pendingUser) throw new Error('Customer account must NOT be created in Users collection yet!');

    console.log('✓ Registration saved in Registration collection with status = Pending');
    console.log('✓ Password stored hashed via bcrypt');
    console.log('✓ Customer account NOT created in Users collection yet');
    console.log('✓ Exact submission message verified');

    // -----------------------------------------------------------------
    // TEST 2: Enforce Login Rule for Pending Registration
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Verify Login Restriction for Pending Registration ---');
    const loginPendingReq = {
      body: {
        email: 'test_corp_flow@example.com',
        password: 'CorpPassword123!',
      },
    };
    const loginPendingRes = createMockRes();
    await login(loginPendingReq, loginPendingRes, (err) => {
      throw err;
    });

    console.log(`Pending Login status: ${loginPendingRes.statusCode}`);
    console.log(`Pending Login message: "${loginPendingRes.data?.message}"`);

    if (loginPendingRes.statusCode !== 403) {
      throw new Error(`Expected 403 status, got ${loginPendingRes.statusCode}`);
    }
    if (loginPendingRes.data?.message !== 'Your account is awaiting approval.') {
      throw new Error(`Expected "Your account is awaiting approval.", got "${loginPendingRes.data?.message}"`);
    }
    console.log('✓ Pending registration is blocked from login with: "Your account is awaiting approval."');

    // -----------------------------------------------------------------
    // TEST 3: Customer List Rule - Exclude Pending Registrations
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Customer List Excludes Pending Registrations ---');
    const custListReq = { query: {} };
    const custListRes = createMockRes();
    await getCustomers(custListReq, custListRes, (err) => {
      throw err;
    });

    const pendingInCustList = (custListRes.data?.data || []).find(
      (c) => c.email === 'test_corp_flow@example.com' || c.name === 'Apex Industrial Steel Works'
    );
    if (pendingInCustList) {
      throw new Error('Pending registration appeared in Customer List! Customer List must show ONLY Approved customers.');
    }
    console.log('✓ Pending registration does NOT appear in Customer List');

    // -----------------------------------------------------------------
    // TEST 4: Approval Process
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Approve Registration ---');
    const approveReq = {
      params: { id: savedReg._id.toString() },
      user: { name: 'Pravin Raman', role: 'Depot Manager' },
      body: {},
    };
    const approveRes = createMockRes();
    await approveRegistration(approveReq, approveRes, (err) => {
      throw err;
    });

    console.log(`Approve status: ${approveRes.statusCode}`);
    console.log(`Approve message: "${approveRes.data?.message}"`);

    // Verify registration updated
    const approvedReg = await Registration.findById(savedReg._id);
    if (approvedReg.status !== 'Approved') {
      throw new Error(`Expected registration status 'Approved', got '${approvedReg.status}'`);
    }
    if (!approvedReg.approvedBy) throw new Error('approvedBy was not saved!');
    if (!approvedReg.approvedAt) throw new Error('approvedAt was not saved!');

    // Verify User created in User collection
    const createdUser = await User.findOne({ email: 'test_corp_flow@example.com' });
    if (!createdUser) throw new Error('User account was not created in User collection upon approval!');
    if (createdUser.role !== 'Customer') throw new Error(`Expected role 'Customer', got '${createdUser.role}'`);
    if (createdUser.password !== savedReg.password) {
      throw new Error('Hashed password was not preserved correctly in User collection!');
    }

    console.log('✓ Registration status updated to Approved');
    console.log(`✓ approvedBy: ${approvedReg.approvedBy}, approvedAt: ${approvedReg.approvedAt}`);
    console.log('✓ User account created in Users collection with role = Customer and pre-hashed password');

    // -----------------------------------------------------------------
    // TEST 5: Approved Customer Login
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Verify Login for Approved Customer ---');
    const loginApprovedReq = {
      body: {
        email: 'test_corp_flow@example.com',
        password: 'CorpPassword123!',
      },
    };
    const loginApprovedRes = createMockRes();
    await login(loginApprovedReq, loginApprovedRes, (err) => {
      throw err;
    });

    console.log(`Approved Login status: ${loginApprovedRes.statusCode}`);
    console.log(`Approved Login token present: ${Boolean(loginApprovedRes.data?.token)}`);

    if (loginApprovedRes.statusCode !== 200 || !loginApprovedRes.data?.token) {
      throw new Error(`Approved customer login failed: ${loginApprovedRes.data?.message}`);
    }
    console.log('✓ Approved customer successfully logged in and received JWT token');

    // -----------------------------------------------------------------
    // TEST 6: Customer List Rule - Includes Approved Customer
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Customer List Includes Approved Customer ---');
    const custListRes2 = createMockRes();
    await getCustomers(custListReq, custListRes2, (err) => {
      throw err;
    });

    const approvedInCustList = (custListRes2.data?.data || []).find(
      (c) => c.email === 'test_corp_flow@example.com' || c.name === 'Apex Industrial Steel Works'
    );
    if (!approvedInCustList) {
      throw new Error('Approved customer was NOT found in Customer List!');
    }
    console.log(`✓ Approved customer '${approvedInCustList.name}' now appears in Customer List`);

    // -----------------------------------------------------------------
    // TEST 7: Rejection Workflow & Login Enforcement
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Reject Registration Workflow & Login Enforcement ---');
    // Create second registration to reject
    const rejectRegReq = {
      body: {
        email: 'test_reject_flow@example.com',
        password: 'RejectPassword123!',
        confirmPassword: 'RejectPassword123!',
        companyName: 'Suspicious Shell Logistics Ltd',
        authorizedPerson: 'Anon Trader',
        mobile: '9840111222',
        gstNumber: '33ABCDE9999Z1Z0',
        panNumber: 'ABCDE9999Z',
        address: 'Unverified Port Warehouse',
        city: 'Madurai',
        state: 'Tamil Nadu',
        pincode: '625001',
      },
      files: [],
    };
    const rejectRegRes = createMockRes();
    await createRegistration(rejectRegReq, rejectRegRes, (err) => {
      throw err;
    });

    const savedRejectReg = await Registration.findOne({ email: 'test_reject_flow@example.com' });
    if (!savedRejectReg) throw new Error('Failed to create second registration for rejection test');

    // Call rejectRegistration
    const rejectActionReq = {
      params: { id: savedRejectReg._id.toString() },
      body: {
        rejectionReason: 'Invalid GST number and unverified registered address.',
      },
    };
    const rejectActionRes = createMockRes();
    await rejectRegistration(rejectActionReq, rejectActionRes, (err) => {
      throw err;
    });

    const rejectedRegDoc = await Registration.findById(savedRejectReg._id);
    if (rejectedRegDoc.status !== 'Rejected') {
      throw new Error(`Expected status 'Rejected', got '${rejectedRegDoc.status}'`);
    }
    if (!rejectedRegDoc.rejectionReason) throw new Error('rejectionReason was not saved!');

    console.log('✓ Registration status set to Rejected');
    console.log(`✓ Rejection Reason: "${rejectedRegDoc.rejectionReason}"`);

    // Attempt login with rejected account
    const loginRejectReq = {
      body: {
        email: 'test_reject_flow@example.com',
        password: 'RejectPassword123!',
      },
    };
    const loginRejectRes = createMockRes();
    await login(loginRejectReq, loginRejectRes, (err) => {
      throw err;
    });

    console.log(`Rejected Login status: ${loginRejectRes.statusCode}`);
    console.log(`Rejected Login message: "${loginRejectRes.data?.message}"`);

    if (loginRejectRes.statusCode !== 403) {
      throw new Error(`Expected 403 for rejected user, got ${loginRejectRes.statusCode}`);
    }
    if (loginRejectRes.data?.message !== 'Your registration request was rejected.') {
      throw new Error(
        `Expected "Your registration request was rejected.", got "${loginRejectRes.data?.message}"`
      );
    }
    console.log('✓ Rejected registration is blocked from login with: "Your registration request was rejected."');

    // Verify Customer List does NOT contain rejected customer
    const custListRes3 = createMockRes();
    await getCustomers(custListReq, custListRes3, (err) => {
      throw err;
    });
    const rejectedInCustList = (custListRes3.data?.data || []).find(
      (c) => c.email === 'test_reject_flow@example.com'
    );
    if (rejectedInCustList) {
      throw new Error('Rejected registration appeared in Customer List!');
    }
    console.log('✓ Rejected registration does NOT appear in Customer List');

    // Cleanup test records
    await Registration.deleteMany({
      email: { $in: ['test_corp_flow@example.com', 'test_reject_flow@example.com'] },
    });
    await User.deleteMany({
      email: { $in: ['test_corp_flow@example.com', 'test_reject_flow@example.com'] },
    });

    console.log('\n======================================================');
    console.log('       ALL 7 VERIFICATION TESTS PASSED (100%)         ');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runVerification();
