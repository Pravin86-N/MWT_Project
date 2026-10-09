const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

const seedSecondManager = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    let manager = await User.findOne({ email: 'coimbatore.mgr@fdms.com' });
    if (!manager) {
      manager = await User.create({
        name: 'Suresh Babu',
        email: 'coimbatore.mgr@fdms.com',
        password: 'manager123',
        role: 'Depot Manager',
        city: 'Coimbatore',
        depot: 'DEP-CBE-05',
        isActive: true,
      });
      console.log('✓ Created second Depot Manager (Coimbatore): coimbatore.mgr@fdms.com / manager123');
    } else {
      manager.depot = 'DEP-CBE-05';
      manager.role = 'Depot Manager';
      manager.isActive = true;
      await manager.save();
      console.log('✓ Updated second Depot Manager (Coimbatore)');
    }

    // Ensure Pravin is Depot Manager of Chennai
    const pravin = await User.findOne({ email: 'pravin@123' });
    if (pravin) {
      pravin.depot = 'DEP-CHN-01';
      pravin.role = 'Depot Manager';
      pravin.isActive = true;
      await pravin.save();
      console.log('✓ Ensured Pravin is Depot Manager for DEP-CHN-01');
    }

    // Ensure Admin has all depots
    const admin = await User.findOne({ email: 'admin@fdms.com' });
    if (admin) {
      admin.depot = 'ALL';
      admin.isActive = true;
      await admin.save();
      console.log('✓ Ensured Admin is set up');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedSecondManager();
