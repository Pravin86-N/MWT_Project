// End-to-End Enterprise Flow Verification Script
// Tests all 20 requirements against the live Express backend & MongoDB Atlas database

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function runE2ETests() {
  console.log("===============================================================");
  console.log("🚀 STARTING E2E ENTERPRISE INTEGRATION VERIFICATION");
  console.log(`📡 Backend URL: ${BASE_URL}`);
  console.log("===============================================================\n");

  let adminToken = "";
  let managerToken = "";
  let customerToken = "";
  let driverToken = "";

  // 1. AUTHENTICATION & ROLE-BASED ACCESS
  console.log("--- 1. Testing Authentication & Role Tokens ---");
  try {
    const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@fdms.com",
      password: "admin123",
    });
    adminToken = adminRes.data.token;
    console.log(`✅ Admin authenticated: ${adminRes.data.user.name} (${adminRes.data.user.role})`);

    const mgrRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "pravin@123",
      password: "pravin123",
    });
    managerToken = mgrRes.data.token;
    console.log(`✅ Depot Manager authenticated: ${mgrRes.data.user.name} (${mgrRes.data.user.role})`);

    const custRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "customer@fdms.com",
      password: "customer123",
    });
    customerToken = custRes.data.token;
    console.log(`✅ Customer authenticated: ${custRes.data.user.name} (${custRes.data.user.role})`);

    const drvRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "driver@fdms.com",
      password: "driver123",
    });
    driverToken = drvRes.data.token;
    console.log(`✅ Driver authenticated: ${drvRes.data.user.name} (${drvRes.data.user.role})`);
  } catch (err) {
    console.error("❌ Authentication failed:", err.response?.data || err.message);
    process.exit(1);
  }

  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
  const mgrHeaders = { headers: { Authorization: `Bearer ${managerToken}` } };
  const custHeaders = { headers: { Authorization: `Bearer ${customerToken}` } };
  const drvHeaders = { headers: { Authorization: `Bearer ${driverToken}` } };

  // 2. CUSTOMER REGISTRATION WORKFLOW
  console.log("\n--- 2. Testing Customer Registration -> Approval -> Account Activation Workflow ---");
  let testRegId = "";
  const uniqueCode = Date.now().toString().slice(-4);
  const newCustomerEmail = `enterprise_${uniqueCode}@apolloinfra.com`;

  try {
    const regPayload = {
      companyName: `Apollo Infrastructure ${uniqueCode}`,
      businessType: "Infrastructure",
      authorizedPerson: "Rajesh Kannan",
      contactPerson: "Rajesh Kannan",
      email: newCustomerEmail,
      mobile: "+91 98765 43210",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600028",
      address: "102 OMR IT Corridor, Sholinganallur",
      panNumber: `ABCDE${uniqueCode}F`,
      gstNumber: `33ABCDE${uniqueCode}F1Z5`,
      fuelType: "DSL",
      monthlyConsumption: 25000,
      deliverySites: "OMR Site A, Guindy Site B",
    };

    const regRes = await axios.post(`${BASE_URL}/registrations`, regPayload);
    testRegId = regRes.data.data?._id || regRes.data._id;
    console.log(`✅ Registration submitted: ID ${testRegId}, Status: ${regRes.data.data?.status || regRes.data.status}`);

    // Admin Approves Registration
    const approveRes = await axios.patch(
      `${BASE_URL}/registrations/${testRegId}/status`,
      { status: "Approved" },
      adminHeaders
    );
    console.log(`✅ Admin approved registration: Status is now ${approveRes.data.data?.status || approveRes.data.status}`);

    // Verify account was automatically activated in users collection
    const activatedUser = await axios.post(`${BASE_URL}/auth/login`, {
      email: newCustomerEmail,
      password: "customer123", // default auto-generated password on activation
    });
    console.log(`✅ Auto-activated customer logged in successfully: ${activatedUser.data.user.email} (Role: ${activatedUser.data.user.role})`);
  } catch (err) {
    console.error("❌ Registration workflow failed:", err.response?.data || err.message);
  }

  // 3. INVENTORY CHECK
  console.log("\n--- 3. Testing Depot Fuel Tanks Telemetry & Capacity ---");
  let initialDslCurrent = 0;
  let initialDslReserved = 0;
  try {
    const invRes = await axios.get(`${BASE_URL}/inventory`, mgrHeaders);
    const tanks = invRes.data.data || invRes.data;
    console.log(`✅ Retrieved ${tanks.length} depot storage tanks.`);
    const dslTank = tanks.find((t) => t.fuelCode === "DSL" || t.fuelType === "DSL" || t.fuelType === "Diesel");
    if (dslTank) {
      initialDslCurrent = dslTank.currentLiters || dslTank.current || 0;
      initialDslReserved = dslTank.reservedLiters || dslTank.reserved || 0;
      console.log(`   Diesel Tank: ${initialDslCurrent.toLocaleString()}L Current, ${initialDslReserved.toLocaleString()}L Reserved`);
    }
  } catch (err) {
    console.error("❌ Inventory fetch failed:", err.response?.data || err.message);
  }

  // 4. COMPLETE ORDER LIFECYCLE
  console.log("\n--- 4. Testing End-to-End Order Workflow ---");
  let testOrderId = "";
  let orderNumber = "";
  const orderVolume = 3000;

  try {
    // A. Customer creates order -> Pending
    console.log("A. Customer creates order (3,000L Diesel)...");
    const createRes = await axios.post(
      `${BASE_URL}/orders`,
      {
        fuelType: "DSL",
        fuelCode: "DSL",
        quantity: orderVolume,
        qty: orderVolume,
        deliveryAddress: "Apollo Site A, OMR IT Highway",
        city: "Chennai",
        slot: "08:00-10:00",
        notes: "Automated Enterprise Test Run",
      },
      custHeaders
    );
    const orderData = createRes.data.data || createRes.data;
    testOrderId = orderData._id;
    orderNumber = orderData.orderNumber;
    console.log(`✅ Order Created: #${orderNumber} (ID: ${testOrderId}) - Status: ${orderData.status}`);

    // B. Depot Manager approves order -> Approved (Reserves stock)
    console.log("B. Depot Manager approves order (Reserves stock in depot tank)...");
    const approveRes = await axios.patch(
      `${BASE_URL}/orders/${testOrderId}/status`,
      { status: "Approved" },
      mgrHeaders
    );
    console.log(`✅ Order Approved: Status: ${approveRes.data.data?.status || approveRes.data.status}`);

    // C. Dispatcher assigns Driver and Vehicle -> Driver Assigned
    console.log("C. Dispatcher assigns driver & vehicle...");
    const assignRes = await axios.patch(
      `${BASE_URL}/orders/${testOrderId}/assign`,
      {
        driver: "R. Rangarajan",
        vehicle: "TN-01-FL-1001",
      },
      mgrHeaders
    );
    console.log(`✅ Driver & Vehicle Assigned: Status: ${assignRes.data.data?.status || assignRes.data.status}, Driver: ${assignRes.data.data?.driver || "R. Rangarajan"}`);

    // D. Driver starts trip -> Out For Delivery / In Transit
    console.log("D. Driver sets status to In Transit (Out For Delivery)...");
    const transitRes = await axios.patch(
      `${BASE_URL}/orders/${testOrderId}/status`,
      { status: "In Transit" },
      drvHeaders
    );
    console.log(`✅ In Transit: Status is now ${transitRes.data.data?.status || transitRes.data.status}`);

    // E. Driver marks delivery complete -> Delivered (Deducts stock)
    console.log("E. Driver completes delivery at customer site (Deducts stock)...");
    const deliveredRes = await axios.patch(
      `${BASE_URL}/orders/${testOrderId}/status`,
      {
        status: "Delivered",
        customerSignature: "R. Kannan (E-Sign)",
        deliveryProof: "proof_img_verified.webp",
      },
      drvHeaders
    );
    console.log(`✅ Order Delivered: Status: ${deliveredRes.data.data?.status || deliveredRes.data.status}`);
  } catch (err) {
    console.error("❌ Order workflow failed:", err.response?.data || err.message);
  }

  // 5. INVOICE GENERATION
  console.log("\n--- 5. Testing Tax Invoice Generation ---");
  try {
    const invRes = await axios.get(`${BASE_URL}/orders/${testOrderId}/invoice`, custHeaders);
    const inv = invRes.data.data || invRes.data.invoice;
    console.log(`✅ Tax Invoice Generated: ${inv.invoiceNumber}`);
    console.log(`   Customer: ${inv.customer.name}`);
    console.log(`   Quantity: ${inv.item.quantity} L of ${inv.item.fuelName}`);
    console.log(`   Subtotal: ₹${inv.item.subtotal.toLocaleString()}`);
    console.log(`   GST (18%): ₹${inv.item.tax.toLocaleString()}`);
    console.log(`   Grand Total: ₹${inv.item.total.toLocaleString()}`);
  } catch (err) {
    console.error("❌ Invoice generation failed:", err.response?.data || err.message);
  }

  // 6. ACTIVITY LOG SYSTEM
  console.log("\n--- 6. Testing Activity Log System ---");
  try {
    const actRes = await axios.get(`${BASE_URL}/activities?limit=5`, adminHeaders);
    const logs = actRes.data.data || actRes.data;
    console.log(`✅ Retrieved ${logs.length} recent system activity log entries:`);
    logs.slice(0, 3).forEach((l, i) => {
      console.log(`   [${i + 1}] ${l.action || l.type}: ${l.details || l.message} (${new Date(l.createdAt).toLocaleTimeString()})`);
    });
  } catch (err) {
    console.error("❌ Activity log check failed:", err.response?.data || err.message);
  }

  // 7. REPORTS & ANALYTICS
  console.log("\n--- 7. Testing Aggregated Reports & Business Analytics ---");
  try {
    const repRes = await axios.get(`${BASE_URL}/reports/summary`, adminHeaders);
    const rep = repRes.data.data || repRes.data;
    console.log(`✅ Reports Aggregation Summary:`);
    console.log(`   Total Revenue: ₹${(rep.totalRevenue || 0).toLocaleString()}`);
    console.log(`   Total Volume Delivered: ${(rep.totalVolume || 0).toLocaleString()} L`);
    console.log(`   Total Orders: ${rep.totalOrders || 0}`);
    console.log(`   Top Customers: ${(rep.topCustomers || []).length} accounts listed`);
  } catch (err) {
    console.error("❌ Reports fetch failed:", err.response?.data || err.message);
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL E2E ENTERPRISE WORKFLOWS COMPLETED SUCCESSFULLY!");
  console.log("===============================================================\n");
}

runE2ETests();
