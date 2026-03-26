const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// 點數方案
const PLANS = [
  { id: 'starter',  name: '入門方案', credits: 50,  priceUSD: 5,  desc: '適合初次體驗' },
  { id: 'popular',  name: '熱門方案', credits: 200, priceUSD: 15, desc: '最受歡迎', badge: '最熱門' },
  { id: 'pro',      name: '專業方案', credits: 600, priceUSD: 30, desc: '專業創作者首選', badge: '最超值' },
];

// 取得方案列表
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// 取得用戶點數
router.get('/credits', authMiddleware, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ error: '用戶不存在' });
  res.json({ credits: user.credits });
});

// ─── Paddle 結帳 ───────────────────────────────────────────────
router.post('/checkout', authMiddleware, async (req, res) => {
  const { planId } = req.body;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: '無效的方案' });

  const paddleApiKey = process.env.PADDLE_API_KEY;
  const priceId = process.env[`PADDLE_PRICE_${planId.toUpperCase()}`];

  if (!paddleApiKey || paddleApiKey.startsWith('請填入') || !priceId || priceId.startsWith('請填入')) {
    return res.status(503).json({
      error: 'PAYMENT_NOT_CONFIGURED',
      message: '付款系統尚未設定',
      plan
    });
  }

  try {
    // Paddle Billing - 建立 checkout session
    const response = await fetch('https://api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paddleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email: req.user.email },
        custom_data: { userId: req.user.id, planId: plan.id, credits: String(plan.credits) },
        checkout: {
          url: `${process.env.CLIENT_URL}/payment/success`,
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.detail || 'Paddle 錯誤');

    const checkoutUrl = data.data?.checkout?.url;
    if (!checkoutUrl) throw new Error('無法取得付款連結');

    res.json({ url: checkoutUrl });
  } catch (err) {
    console.error('Paddle 錯誤:', err.message);
    res.status(500).json({ error: '建立付款失敗: ' + err.message });
  }
});

// ─── Paddle Webhook（付款成功自動加點）────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['paddle-signature'];
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) return res.sendStatus(400);

  try {
    // 驗證 Paddle webhook 簽名
    const crypto = require('crypto');
    const body = req.body.toString();
    const ts = signature.split(';').find(s => s.startsWith('ts=')).split('=')[1];
    const h1 = signature.split(';').find(s => s.startsWith('h1=')).split('=')[1];
    const expectedHash = crypto.createHmac('sha256', webhookSecret).update(`${ts}:${body}`).digest('hex');

    if (expectedHash !== h1) return res.status(403).json({ error: '簽名無效' });

    const event = JSON.parse(body);

    if (event.event_type === 'transaction.completed') {
      const customData = event.data.custom_data || {};
      const { userId, credits } = customData;
      if (!userId || !credits) return res.sendStatus(200);

      const user = db.get('users').find({ id: userId }).value();
      if (user) {
        const newCredits = (user.credits || 0) + parseInt(credits);
        db.get('users').find({ id: userId }).assign({ credits: newCredits }).write();
        db.get('orders').push({
          id: uuidv4(), user_id: userId,
          transaction_id: event.data.id,
          credits: parseInt(credits),
          amount: event.data.details?.totals?.total,
          status: 'paid',
          created_at: new Date().toISOString()
        }).write();
        console.log(`✅ 用戶 ${userId} 已加入 ${credits} 點數`);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook 錯誤:', err);
    res.sendStatus(500);
  }
});

// ─── 管理員手動給點（用戶付款後手動核發）──────────────────────
router.post('/manual-grant', authMiddleware, async (req, res) => {
  const admin = db.get('users').find({ id: req.user.id }).value();
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: '需要管理員權限' });

  const { targetEmail, credits, note } = req.body;
  const target = db.get('users').find({ email: targetEmail }).value();
  if (!target) return res.status(404).json({ error: '找不到該用戶' });

  const newCredits = (target.credits || 0) + parseInt(credits);
  db.get('users').find({ email: targetEmail }).assign({ credits: newCredits }).write();
  db.get('orders').push({
    id: uuidv4(), user_id: target.id,
    transaction_id: `manual_${Date.now()}`,
    credits: parseInt(credits),
    amount: 0, status: 'manual',
    note: note || '管理員手動發放',
    created_at: new Date().toISOString()
  }).write();

  res.json({ success: true, credits: newCredits, username: target.username });
});

module.exports = { router, PLANS };
