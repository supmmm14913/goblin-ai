const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/portfolio/me — 自己的所有作品（需登入）
router.get('/me', authMiddleware, async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const query = { user_id: req.user.id, status: 'completed' };
  if (type) query.type = type;

  let records = await db.findSorted('generations', query, 'created_at', -1);
  const total = records.length;
  records = records.slice(offset, offset + limitNum);

  res.json({ records, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// GET /api/portfolio/explore — 所有公開作品（搜尋 + 分頁）
router.get('/explore', async (req, res) => {
  const { q = '', type = '', page = 1, limit = 24 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const query = { is_public: true, status: 'completed' };
  if (type) query.type = type;

  let records = await db.findSorted('generations', query, 'created_at', -1);

  // 關鍵字搜尋（prompt）
  if (q.trim()) {
    const kw = q.trim().toLowerCase();
    records = records.filter(r => (r.prompt || '').toLowerCase().includes(kw));
  }

  const total = records.length;
  const paged = records.slice(offset, offset + limitNum);

  // 取創作者 username
  const userIds = [...new Set(paged.map(r => r.user_id))];
  const users = await Promise.all(userIds.map(uid => db.findOne('users', { id: uid })));
  const userMap = {};
  users.forEach(u => { if (u) userMap[u.id] = u.username; });

  const enriched = paged.map(r => ({
    ...r,
    username: userMap[r.user_id] || 'anonymous',
  }));

  res.json({ records: enriched, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// GET /api/portfolio/user/:username — 某用戶的公開作品
router.get('/user/:username', async (req, res) => {
  const user = await db.findOne('users', { username: req.params.username });
  if (!user) return res.status(404).json({ error: '找不到此用戶' });

  const { page = 1, limit = 20, type } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const query = { user_id: user.id, is_public: true, status: 'completed' };
  if (type) query.type = type;

  let records = await db.findSorted('generations', query, 'created_at', -1);
  const total = records.length;
  records = records.slice(offset, offset + limitNum);

  res.json({
    user: { id: user.id, username: user.username, created_at: user.created_at },
    records,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// PUT /api/portfolio/:genId/visibility — 切換公開/私密（需登入）
router.put('/:genId/visibility', authMiddleware, async (req, res) => {
  const gen = await db.findOne('generations', { id: req.params.genId, user_id: req.user.id });
  if (!gen) return res.status(404).json({ error: '找不到此作品' });

  const newVisibility = !gen.is_public;
  await db.updateOne('generations', { id: req.params.genId }, { is_public: newVisibility });
  res.json({ is_public: newVisibility });
});

// DELETE /api/portfolio/:genId — 刪除自己的作品（需登入）
router.delete('/:genId', authMiddleware, async (req, res) => {
  const gen = await db.findOne('generations', { id: req.params.genId, user_id: req.user.id });
  if (!gen) return res.status(404).json({ error: '找不到此作品' });

  await db.deleteOne('generations', { id: req.params.genId });
  res.json({ success: true });
});

module.exports = router;
