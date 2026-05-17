require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://goblin-ai.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // 允許無 origin 的請求（Postman / curl 測試）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: 不允許的來源 ' + origin));
  },
  credentials: true,
}));

// Stripe webhook 需要 raw body，必須在 express.json() 之前
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/generate', require('./routes/generate'));
app.use('/api/history', require('./routes/history'));
app.use('/api/payment', require('./routes/payment').router);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/portfolio', require('./routes/portfolio'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
});
