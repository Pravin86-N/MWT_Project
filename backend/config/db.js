const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

let connectPromise = null;

const connectDB = async () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    let retries = 5;
    while (retries > 0) {
      try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 8000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        connectPromise = null;
        return conn;
      } catch (error) {
        retries--;
        console.error(`MongoDB Connection Attempt Failed (${error.message}). Retries left: ${retries}`);
        if (retries === 0) {
          connectPromise = null;
          throw error;
        }
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  })();

  return connectPromise;
};

module.exports = connectDB;

