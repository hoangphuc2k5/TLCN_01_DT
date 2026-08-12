require('dotenv').config();
const mongoose = require('mongoose');

const connection = async () => {
  const uri = process.env.MONGO_DB_URL;
  if (!uri) throw new Error('MONGO_DB_URL is missing');

  // Singleton: reuse existing connection if present
  if (mongoose.connection.readyState === 1) {
    console.log('Reusing existing MongoDB connection (Singleton)');
    return mongoose.connection;
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  return mongoose.connection;
};

module.exports = connection;
