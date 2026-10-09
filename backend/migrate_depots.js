/**
 * Migration Script: Assign depot codes to existing records
 * Run via: node migrate_depots.js
 */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Order = require('./models/Order');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');
const Inventory = require('./models/Inventory');
const { getDepotForCity } = require('./utils/depotScope');

const migrate = async () => {
  try {
    console.log('[Migration] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Migration] Connected to database.');

    // 1. Migrate Users
    const users = await User.find({ $or: [{ depot: { $exists: false } }, { depot: '' }, { depot: null }] });
    let usersUpdated = 0;
    for (const u of users) {
      if (u.role === 'Depot Manager') {
        u.depot = getDepotForCity(u.city || 'Chennai');
        u.isActive = true;
        await u.save();
        usersUpdated++;
      } else if (u.role === 'Driver') {
        u.depot = getDepotForCity(u.city || 'Chennai');
        u.isActive = true;
        await u.save();
        usersUpdated++;
      } else if (u.role === 'Admin') {
        u.depot = 'ALL';
        u.isActive = true;
        await u.save();
        usersUpdated++;
      } else {
        u.isActive = true;
        await u.save();
      }
    }
    console.log(`[Migration] Updated ${usersUpdated} users with depot assignments.`);

    // 2. Migrate Orders
    const orders = await Order.find({ $or: [{ depot: { $exists: false } }, { depot: '' }, { depot: null }] });
    let ordersUpdated = 0;
    for (const o of orders) {
      o.depot = getDepotForCity(o.city || 'Chennai');
      await o.save();
      ordersUpdated++;
    }
    console.log(`[Migration] Updated ${ordersUpdated} orders with depot assignments.`);

    // 3. Migrate Vehicles
    const vehicles = await Vehicle.find({ $or: [{ depot: { $exists: false } }, { depot: '' }, { depot: null }] });
    let vehiclesUpdated = 0;
    for (const v of vehicles) {
      v.depot = 'DEP-CHN-01';
      await v.save();
      vehiclesUpdated++;
    }
    console.log(`[Migration] Updated ${vehiclesUpdated} vehicles with depot assignments.`);

    // 4. Migrate Drivers
    const drivers = await Driver.find({ $or: [{ depot: { $exists: false } }, { depot: '' }, { depot: null }] });
    let driversUpdated = 0;
    for (const d of drivers) {
      d.depot = 'DEP-CHN-01';
      await d.save();
      driversUpdated++;
    }
    console.log(`[Migration] Updated ${driversUpdated} drivers with depot assignments.`);

    // 5. Migrate Tanks (Inventory)
    const tanks = await Inventory.find({ $or: [{ depot: { $exists: false } }, { depot: '' }, { depot: null }] });
    let tanksUpdated = 0;
    for (const t of tanks) {
      t.depot = 'DEP-CHN-01';
      await t.save();
      tanksUpdated++;
    }
    console.log(`[Migration] Updated ${tanksUpdated} tanks with depot assignments.`);

    console.log('[Migration] Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Migration failed:', err);
    process.exit(1);
  }
};

migrate();
