const { MongoClient } = require('mongodb');

let client = null;
let db = null;
let clientPromise = null;

// Get MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pair-picker';

async function connect() {
  if (db) {
    return db;
  }

  try {
    console.log('[DB] Connecting to MongoDB...');
    console.log('[DB] MongoDB URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')); // Log URI without credentials

    // MongoDB client options for Node.js compatibility
    const options = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    };

    client = new MongoClient(MONGODB_URI, options);
    await client.connect();

    // Extract database name from URI or use default
    const dbName = new URL(MONGODB_URI).pathname.slice(1) || 'pair-picker';
    db = client.db(dbName);

    console.log('[DB] Connected to MongoDB successfully');
    console.log('[DB] Database name:', dbName);

    // Create indexes for better performance
    await db.collection('teams').createIndex({ team: 1 }, { unique: true });

    return db;
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error);
    throw error;
  }
}

function getClientPromise() {
  if (!clientPromise) {
    clientPromise = (async () => {
      await connect();
      console.log('[DB] clientPromise resolved, client exists:', !!client);
      if (!client) {
        throw new Error('MongoDB client is null after connection');
      }
      return client;
    })();
  }
  return clientPromise;
}

async function getDb() {
  if (!db) {
    await connect();
  }
  return db;
}

async function getClient() {
  if (!client) {
    await connect();
  }
  return client;
}

async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[DB] MongoDB connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connect,
  getDb,
  getClient,
  getClientPromise,
  closeConnection
};
