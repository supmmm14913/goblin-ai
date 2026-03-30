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
    console.log(`[SMTP] 嘗試寄信給 ${email}，使用帳號 ${process.env.SMTP_USER}`);
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    const info = await transporter.sendMail({
      from: `"Goblin AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '【Goblin AI】重設你的密碼',
      html,
    });
    console.log(`[SMTP] 寄信成功，messageId: ${info.messageId}`);
    return { sent: true, method: 'smtp' };
  }

  // ── 方案 3：未設定任何寄信服務 → 開發模式顯示連結
  console.log(`[密碼重設] ${email} 的重設連結: ${resetUrl}`);
  return { sent: false, resetUrl };
}

// 產生推薦碼
function genReferralCode(username) {
  const base = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'user';
  return base + Math.random().toString(36).slice(2, 6);
}

// 註冊
router.post('/register', async (req, res) => {
  const { username, email, password, referralCode } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: '請填寫所有欄位' });
  if (password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });

  try {
    const existingEmail    = await db.findOne('users', { email });
    const existingUsername = await db.findOne('users', { username });
    if (existingEmail || existingUsername) return res.status(400).json({ error: '用戶名或信箱已被使用' });

    // 驗證推薦碼
    let referrer = null;
    if (referralCode) {
      referrer = await db.findOne('users', { referral_code: referralCode.trim() });
    }

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const userCount = await db.count('users');
    const isFirstUser = userCount === 0;
    const credits = referrer ? 30 : 10;
    const myReferralCode = genReferralCode(username);
    const newUser = {
      id, username, email, password: hashed,
      credits,
      referral_code: myReferralCode,
      referred_by: referrer ? referrer.id : null,
      role: isFirstUser ? 'admin' : 'user',
      created_at: new Date().toISOString()
    };
    await db.insertOne('users', newUser);

    // 推薦人也獲得 30 點
    if (referrer) {
      await db.updateOne('users', { id: referrer.id }, { credits: (referrer.credits || 0) + 30 });
    }

    const token = jwt.sign({ id, username, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, email, credits, role: newUser.role }, referralBonus: !!referrer });
  } catch {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 登入
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '請填寫所有欄位' });

  try {
    const user = await db.findOne('users', { email });
    if (!user) return res.status(400).json({ error: '此信箱尚未註冊' });

    // 大小寫不敏感：先試原始密碼，再試小寫
    const valid = await bcrypt.compare(password, user.password)
      || await bcrypt.compare(password.toLowerCase(), user.password);
    if (!valid) return res.status(400).json({ error: '密碼錯誤，請確認後再試' });

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

  const user = await db.findOne('users', { email });
  if (!user) return res.status(404).json({ error: '此信箱尚未註冊' });

  // 產生 token（1 小時有效）
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.updateOne('users', { email }, {
    reset_token: token,
    reset_expires: expires
  });

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
    // 根據錯誤類型給出具體原因
    let errorMsg = '寄信失敗，請稍後再試';
    const msg = err.message || '';
    if (msg.includes('not verified') || msg.includes('domain') || msg.includes('testing emails')) {
      errorMsg = '寄信服務尚未完整設定（寄件網域未驗證），請聯絡管理員';
    } else if (msg.includes('Invalid API') || msg.includes('Unauthorized') || msg.includes('401')) {
      errorMsg = '寄信服務金鑰無效，請聯絡管理員';
    } else if (msg.includes('rate limit') || msg.includes('429')) {
      errorMsg = '寄信次數已達上限，請稍後再試';
    } else if (msg.includes('Invalid email') || msg.includes('invalid_to')) {
      errorMsg = '信箱格式不正確，請確認後再試';
    } else if (msg.length > 0) {
      errorMsg = `寄信失敗：${msg}`;
    }
    res.status(500).json({ error: errorMsg });
  }
});

// 重設密碼 - 驗證 token 並更新密碼
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: '缺少必要參數' });
  if (password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });

  const user = await db.findOne('users', { reset_token: token });
  if (!user) return res.status(400).json({ error: '重設連結無效或已使用' });
  if (new Date(user.reset_expires) < new Date()) return res.status(400).json({ error: '重設連結已過期，請重新申請' });

  const hashed = await bcrypt.hash(password, 10);
  await db.updateOne('users', { reset_token: token }, {
    password: hashed,
    reset_token: null,
    reset_expires: null
  });

  res.json({ success: true, message: '密碼重設成功！請重新登入' });
});

// ⚠️ 臨時端點：重設管理員密碼（用完即刪）
router.post('/emergency-reset', async (req, res) => {
  const { secret } = req.body;
  if (secret !== 'goblin-emergency-2024') return res.status(403).json({ error: '禁止' });
  const newHash = '$2a$10$rENqsLdCELLSd3QdWemSIeMS6xoucDFwOWIvUBZ0.oXioZ6pCwyr.';
  const admin = await db.findOne('users', { role: 'admin' });
  if (!admin) return res.status(404).json({ error: '找不到管理員' });
  await db.updateOne('users', { role: 'admin' }, { password: newHash });
  res.json({ success: true, message: '密碼已重設為 GoblinAdmin2024', email: admin.email });
});

// 取得當前用戶
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const user = await db.findOne('users', { id: req.user.id });
  if (!user) return res.status(404).json({ error: '用戶不存在' });
  // 計算推薦人數
  const referralCount = await db.count('users', { referred_by: user.id });
  res.json({ user: { id: user.id, username: user.username, email: user.email, credits: user.credits, role: user.role, referral_code: user.referral_code, referralCount, created_at: user.created_at } });
});

// 修改密碼
router.patch('/change-password', require('../middleware/auth'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: '請填寫所有欄位' });
  if (newPassword.length < 6) return res.status(400).json({ error: '新密碼至少需要 6 個字元' });

  const user = await db.findOne('users', { id: req.user.id });
  const valid = await bcrypt.compare(currentPassword, user.password)
    || await bcrypt.compare(currentPassword.toLowerCase(), user.password);
  if (!valid) return res.status(400).json({ error: '目前密碼錯誤' });

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.updateOne('users', { id: req.user.id }, { password: hashed });
  res.json({ success: true, message: '密碼已更新' });
});

// 修改信箱
router.patch('/change-email', require('../middleware/auth'), async (req, res) => {
  const { newEmail, password } = req.body;
  if (!newEmail || !password) return res.status(400).json({ error: '請填寫所有欄位' });

  const existing = await db.findOne('users', { email: newEmail });
  if (existing) return res.status(400).json({ error: '此信箱已被使用' });

  const user = await db.findOne('users', { id: req.user.id });
  const valid = await bcrypt.compare(password, user.password)
    || await bcrypt.compare(password.toLowerCase(), user.password);
  if (!valid) return res.status(400).json({ error: '密碼錯誤' });

  await db.updateOne('users', { id: req.user.id }, { email: newEmail });
  res.json({ success: true, message: '信箱已更新' });
});

module.exports = router;
