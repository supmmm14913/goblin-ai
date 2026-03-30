const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// 管理員驗證
async function adminOnly(req, res, next) {
  const user = await db.findOne('users', { id: req.user.id });
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理員權限' });
  }
  next();
}

// 統計數據
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  const users = await db.find('users');
  const generations = await db.find('generations');
  const orders = await db.find('orders');

  const totalRevenue = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + (o.amount || 0), 0) / 100;

  const today = new Date().toISOString().split('T')[0];
  const todayGens = generations.filter(g => g.created_at.startsWith(today)).length;
  const todayRevenue = orders
    .filter(o => o.status === 'paid' && o.created_at.startsWith(today))
    .reduce((sum, o) => sum + (o.amount || 0), 0) / 100;

  const imageGens = await db.filter('generations', g => g.type.includes('image'));
  const videoGens = await db.filter('generations', g => g.type.includes('video'));

  res.json({
    totalUsers: users.length,
    totalGenerations: generations.length,
    totalOrders: orders.filter(o => o.status === 'paid').length,
    totalRevenue,
    todayGenerations: todayGens,
    todayRevenue,
    imageGenerations: imageGens.length,
    videoGenerations: videoGens.length,
  });
});

// 用戶列表
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const gens = await db.find('generations');
  const spentMap = {};
  gens.forEach(g => {
    if (g.credit_cost) spentMap[g.user_id] = (spentMap[g.user_id] || 0) + g.credit_cost;
  });

  const allUsers = await db.findSorted('users', {}, 'created_at', -1);
  const users = allUsers.map(u => ({ id: u.id, username: u.username, email: u.email, credits: u.credits, totalSpent: spentMap[u.id] || 0, role: u.role, created_at: u.created_at }));

  res.json({
    users: users.slice(offset, offset + parseInt(limit)),
    total: users.length
  });
});

// 手動調整用戶點數
router.patch('/users/:id/credits', authMiddleware, adminOnly, async (req, res) => {
  const { credits } = req.body;
  const user = await db.findOne('users', { id: req.params.id });
  if (!user) return res.status(404).json({ error: '用戶不存在' });
  await db.updateOne('users', { id: req.params.id }, { credits: parseInt(credits) });
  res.json({ success: true, credits: parseInt(credits) });
});

// 訂單列表
router.get('/orders', authMiddleware, adminOnly, async (req, res) => {
  const orders = await db.findSorted('orders', {}, 'created_at', -1);
  const enriched = await Promise.all(orders.map(async o => {
    const user = await db.findOne('users', { id: o.user_id });
    return { ...o, username: user?.username, email: user?.email };
  }));
  res.json({ orders: enriched });
});

// 測試 SMTP 寄信
router.post('/test-smtp', authMiddleware, adminOnly, async (req, res) => {
  const { to } = req.body;
  if (!process.env.SMTP_USER || process.env.SMTP_USER.startsWith('請填入')) {
    return res.status(400).json({ error: 'SMTP 尚未設定，請在 .env 填入 SMTP_USER 和 SMTP_PASS' });
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: `"Goblin AI" <${process.env.SMTP_USER}>`,
      to: to || process.env.SMTP_USER,
      subject: '【Goblin AI】SMTP 測試信',
      html: '<div style="font-family:sans-serif;padding:20px;background:#111;color:#fff;border-radius:12px;"><h2 style="color:#c8ff3e;">👺 SMTP 測試成功！</h2><p>你的寄信功能已正常運作。</p></div>',
    });
    res.json({ success: true, message: `測試信已發送至 ${to || process.env.SMTP_USER}` });
  } catch (err) {
    res.status(500).json({ error: '寄信失敗: ' + err.message });
  }
});

module.exports = router;
