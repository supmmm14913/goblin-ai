const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// 取得歷史記錄
router.get('/', authMiddleware, async (req, res) => {
  const { page = 1, limit = 12, type } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const query = { user_id: req.user.id };
  if (type) query.type = type;

  let records = await db.findSorted('generations', query, 'created_at', -1);

  const total = records.length;
  records = records.slice(offset, offset + limitNum);

  res.json({ records, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// 刪除記錄
router.delete('/:id', authMiddleware, async (req, res) => {
  const record = await db.findOne('generations', { id: req.params.id, user_id: req.user.id });
  if (!record) return res.status(404).json({ error: '找不到此記錄' });

  await db.deleteOne('generations', { id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
