const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

const seedSupport = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await User.deleteMany({ email: { $in: ['support@fdms.com', 'auditor@fdms.com'] } });

    const u1 = new User({
      name: 'Kavitha Sundaram',
      email: 'support@fdms.com',
      password: 'support123',
      role: 'Support Executive',
      city: 'Chennai',
      phone: '+91 98402 55667',
      status: 'Active',
    });
    await u1.save();

    const u2 = new User({
      name: 'Audit Officer Suresh',
      email: 'auditor@fdms.com',
      password: 'auditor123',
      role: 'Auditor',
      city: 'Chennai',
      phone: '+91 98403 99887',
      status: 'Active',
    });
    await u2.save();

    console.log('✓ Successfully created Support Executive & Auditor users in MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding support user:', err);
    process.exit(1);
  }
};

seedSupport();
