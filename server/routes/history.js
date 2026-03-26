const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// 取得歷史記錄
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, limit = 12, type } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let records = db.get('generations')
    .filter(g => g.user_id === req.user.id && (!type || g.type === type))
    .orderBy(['created_at'], ['desc'])
    .value();

  const total = records.length;
  records = records.slice(offset, offset + limitNum);

  res.json({ records, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// 刪除記錄
router.delete('/:id', authMiddleware, (req, res) => {
  const record = db.get('generations').find({ id: req.params.id, user_id: req.user.id }).value();
  if (!record) return res.status(404).json({ error: '找不到此記錄' });

  db.get('generations').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

module.exports = router;
