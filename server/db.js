const { MongoClient } = require('mongodb');

let _db = null;

async function getDb() {
  if (_db) return _db;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  _db = client.db('goblinai');
  console.log('[MongoDB] Connected');
  return _db;
}

module.exports = {
  async findOne(col, query) {
    const db = await getDb();
    return db.collection(col).findOne(query, { projection: { _id: 0 } });
  },
  async find(col, query = {}) {
    const db = await getDb();
    return db.collection(col).find(query, { projection: { _id: 0 } }).toArray();
  },
  async findSorted(col, query = {}, sortField, sortDir = -1) {
    const db = await getDb();
    return db.collection(col).find(query, { projection: { _id: 0 } }).sort({ [sortField]: sortDir }).toArray();
  },
  async insertOne(col, doc) {
    const db = await getDb();
    await db.collection(col).insertOne({ ...doc });
    return doc;
  },
  async updateOne(col, query, update) {
    const db = await getDb();
    await db.collection(col).updateOne(query, { $set: update });
  },
  async count(col, query = {}) {
    const db = await getDb();
    return db.collection(col).countDocuments(query);
  },
  async filter(col, filterFn) {
    const db = await getDb();
    const all = await db.collection(col).find({}, { projection: { _id: 0 } }).toArray();
    return all.filter(filterFn);
  },
  async deleteOne(col, query) {
    const db = await getDb();
    await db.collection(col).deleteOne(query);
  }
};
