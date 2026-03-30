const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');

// ─── 重設密碼 Email HTML 模板
function buildResetHtml(username, resetUrl) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#111;color:#fff;padding:32px;border-radius:16px;">
      <h2 style="color:#c8ff3e;">👺 Goblin AI</h2>
      <p>嗨 ${username}，</p>
      <p>你申請了密碼重設，點擊下方按鈕在 1 小時內完成重設：</p>
      <a href="${resetUrl}" style="display:inline-block;background:#c8ff3e;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">重設密碼</a>
      <p style="color:#666;font-size:12px;">若不是你申請的，忽略此信即可。連結 1 小時後失效。</p>
    </div>
  `;
}

// ─── 寄送重設密碼信
// 優先順序：Resend API → Gmail SMTP → 開發模式（顯示連結）
async function sendResetEmail(email, username, token) {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const html = buildResetHtml(username, resetUrl);

  // ── 方案 1：Resend API（最簡單，免費每月 3000 封）
  if (process.env.RESEND_API_KEY) {
    const fromAddr = process.env.RESEND_FROM || 'onboarding@resend.dev';
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Goblin AI <${fromAddr}>`,
        to: [email],
        subject: '【Goblin AI】重設你的密碼',
        html,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Resend 寄信失敗: ${err.message || resp.status}`);
    }
    return { sent: true, method: 'resend' };
  }

  // ── 方案 2：Gmail SMTP（需設定 SMTP_USER / SMTP_PASS）
  if (process.env.SMTP_USER && !process.env.SMTP_USER.startsWith('你的')) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"Goblin AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '【Goblin AI】重設你的密碼',
      html,
    });
    return { sent: true, method: 'smtp' };
  }

  // ── 方案 3：未設定任何寄信服務 → 開發模式顯示連結
  console.log(`[密碼重設] ${email} 的重設連結: ${resetUrl}`);
  return { sent: false, resetUrl };
}

// 註冊
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: '請填寫所有欄位' });
  if (password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });

  try {
    const existingEmail    = db.get('users').find({ email }).value();
    const existingUsername = db.get('users').find({ username }).value();
    if (existingEmail || existingUsername) return res.status(400).json({ error: '用戶名或信箱已被使用' });

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const isFirstUser = db.get('users').size().value() === 0;
    const newUser = {
      id, username, email, password: hashed,
      credits: 10,
      role: isFirstUser ? 'admin' : 'user',
      created_at: new Date().toISOString()
    };
    db.get('users').push(newUser).write();

    const token = jwt.sign({ id, username, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, email, credits: newUser.credits, role: newUser.role } });
  } catch {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 登入
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '請填寫所有欄位' });

  try {
    const user = db.get('users').find({ email }).value();
    if (!user) return res.status(400).json({ error: '信箱或密碼錯誤' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: '信箱或密碼錯誤' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, credits: user.credits, role: user.role } });
  } catch {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 忘記密碼 - 發送重設信
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '請輸入信箱' });

  const user = db.get('users').find({ email }).value();
  // 不管有沒有找到都回 ok（避免枚舉攻擊）
  if (!user) return res.json({ success: true, message: '若此信箱已註冊，重設連結已送出' });

  // 產生 token（1 小時有效）
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.get('users').find({ email }).assign({
    reset_token: token,
    reset_expires: expires
  }).write();

  try {
    const result = await sendResetEmail(email, user.username, token);
    if (result.sent) {
      res.json({ success: true, message: '重設連結已寄送到你的信箱！' });
    } else {
      // 開發模式：直接回傳連結
      res.json({ success: true, message: '重設連結已產生（開發模式）', resetUrl: result.resetUrl });
    }
  } catch (err) {
    console.error('寄信失敗:', err.message);
    res.status(500).json({ error: '寄信失敗，請稍後再試' });
  }
});

// 重設密碼 - 驗證 token 並更新密碼
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: '缺少必要參數' });
  if (password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });

  const user = db.get('users').find({ reset_token: token }).value();
  if (!user) return res.status(400).json({ error: '重設連結無效或已使用' });
  if (new Date(user.reset_expires) < new Date()) return res.status(400).json({ error: '重設連結已過期，請重新申請' });

  const hashed = await bcrypt.hash(password, 10);
  db.get('users').find({ reset_token: token }).assign({
    password: hashed,
    reset_token: null,
    reset_expires: null
  }).write();

  res.json({ success: true, message: '密碼重設成功！請重新登入' });
});

// 取得當前用戶
router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ error: '用戶不存在' });
  res.json({ user: { id: user.id, username: user.username, email: user.email, credits: user.credits, role: user.role } });
});

module.exports = router;
