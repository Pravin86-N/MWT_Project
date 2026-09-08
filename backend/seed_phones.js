const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

async function updatePhones() {
  await mongoose.connect(process.env.MONGO_URI);
  await User.updateOne({ email: 'admin@fdms.com' }, { $set: { phone: '+91 98401 88888' } });
  await User.updateOne({ email: 'pravin@123' }, { $set: { phone: '+91 98401 99999' } });
  console.log('✓ Admin and Depot Manager phone numbers populated in MongoDB.');
  await mongoose.disconnect();
}
updatePhones();
