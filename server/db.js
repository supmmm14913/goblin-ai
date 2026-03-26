const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'database.json'));
const db = low(adapter);

db.defaults({
  users: [],
  generations: [],
  orders: []
}).write();

// 為舊有用戶補上 credits 欄位
const usersWithoutCredits = db.get('users').filter(u => u.credits === undefined).value();
usersWithoutCredits.forEach(u => {
  db.get('users').find({ id: u.id }).assign({ credits: 10, role: 'user' }).write();
});

module.exports = db;
