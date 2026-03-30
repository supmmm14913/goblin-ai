const express = require('express');
const router = express.Router();
const Replicate = require('replicate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// 點數費用（基本費用）
const CREDIT_COST = {
  'text-to-image': 1,
  'image-to-image': 1,
  'text-to-video': 5,
  'image-to-video': 5,
};

// 圖片品質等級對應點數消耗
const QUALITY_COST = {
  'standard': 1,  // 標準品質
  'fine':     2,  // 精細品質
  'ultra':    3,  // 超精細
  'premium':  5,  // 頂級品質
};

// 品質等級對應模型參數
const QUALITY_PARAMS = {
  'standard': { model: 'flux-schnell', steps: 4,  guidance: 3.5 },
  'fine':     { model: 'flux-dev',     steps: 28, guidance: 3.5 },
  'ultra':    { model: 'flux-dev',     steps: 50, guidance: 4.5 },
  'premium':  { model: 'flux-dev',     steps: 50, guidance: 5.0, num_outputs: 1 },
};

const upload = multer({
  dest: path.join(__dirname, '../../uploads/temp'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('只支援圖片/影片格式'));
  }
});

const MODELS = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-dev': 'black-forest-labs/flux-dev',
  'sdxl': 'stability-ai/sdxl:39ed52f2319f9c07e2c6ce3367fb4cb7203f4cd64a25d6927f7fa2d07fa7fba5',
};

// 偵測是否含有中文字元
function hasChinese(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/.test(text);
}

// 免費翻譯（MyMemory API，無需 Key，每天 1000 次）
async function translateToEnglish(text) {
  // 分段翻譯（避免超過 500 字元限制）
  const cleanText = text.replace(/\s*--\s*style:.*$/i, '').trim(); // 先移除 style 標記
  try {
    const encoded = encodeURIComponent(cleanText);
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=zh|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      if (hasChinese(translated)) return cleanText; // 仍有中文，翻譯失敗
      console.log(`[翻譯] "${cleanText}" → "${translated}"`);
      return translated;
    }
  } catch (e) {
    console.warn('[翻譯失敗，使用原始提示詞]', e.message);
  }
  return cleanText;
}

// 風格關鍵詞對照表（後端也維護一份，確保安全）
const STYLE_KEYWORDS = {
  realistic:  'photorealistic, hyperrealistic, DSLR photo, sharp focus, natural lighting, 8k resolution',
  anime:      'anime style, manga art, vibrant colors, cel shading, Japanese animation',
  '3d':       '3D render, octane render, cinema 4D, volumetric lighting, ray tracing, ultra detailed 3D',
  '2d':       '2D illustration, flat design, digital art, vector art, clean lines, colorful',
  western:    'western comic style, Marvel comic, bold lines, dynamic pose, American cartoon',
  watercolor: 'watercolor painting, soft brushstrokes, pastel colors, dreamy watercolor effect',
  oilpaint:   'oil painting, classical art, Renaissance style, rich textures, museum quality',
  pixel:      'pixel art, 16-bit style, retro game art, pixelated, nostalgic video game aesthetic',
  cyberpunk:  'cyberpunk, neon lights, futuristic city, dark atmosphere, rain reflections',
  fantasy:    'fantasy art, magical atmosphere, epic fantasy, mystical, detailed fantasy illustration',
  sketch:     'pencil sketch, black and white drawing, detailed linework, hand-drawn',
  chibi:      'chibi style, cute kawaii, super deformed, big eyes, adorable character design',
  cinematic:  'cinematic photography, movie still, dramatic lighting, shallow depth of field, golden hour',
  ukiyo:      'ukiyo-e style, Japanese woodblock print, traditional Japanese art, flat colors, bold outlines',
  slowmo:     'slow motion, smooth movement, high frame rate, fluid motion',
};

// 依風格決定負面提示詞補充
const STYLE_NEGATIVE = {
  realistic:  'cartoon, anime, drawing, painting, blurry, low quality',
  anime:      'photorealistic, 3D render, ugly, extra limbs, bad anatomy',
  '3d':       'flat, 2D, cartoon, sketch, low poly, blurry',
  pixel:      'smooth, photorealistic, blurry, anti-aliased',
  watercolor: 'sharp edges, photorealistic, digital, harsh lighting',
};

// 自動強化提示詞（加品質關鍵詞）
function enhancePrompt(prompt, style) {
  if (!prompt) return prompt;
  const qualityBase = 'masterpiece, best quality, highly detailed';
  const styleKw = style && STYLE_KEYWORDS[style] ? STYLE_KEYWORDS[style] : '';
  const combined = [prompt, styleKw, qualityBase].filter(Boolean).join(', ');
  return combined;
}

// 自動翻譯 + 強化提示詞（主流程）
async function preparePrompt(prompt, style) {
  if (!prompt) return prompt;
  // 提取純文字（去除 "-- style:..." 標記）
  let p = prompt.replace(/\s*--\s*style:.*$/i, '').trim();
  if (hasChinese(p)) {
    p = await translateToEnglish(p);
  }
  return enhancePrompt(p, style);
}

// 檢查並扣除點數的 middleware
function checkCredits(type) {
  return async (req, res, next) => {
    let cost = CREDIT_COST[type] || 1;
    // 圖片生成支援品質等級
    if (type === 'text-to-image' || type === 'image-to-image') {
      const quality = req.body.quality || 'standard';
      cost = QUALITY_COST[quality] || 1;
    }
    const user = await db.findOne('users', { id: req.user.id });
    if (!user || (user.credits || 0) < cost) {
      return res.status(402).json({
        error: `點數不足！此操作需要 ${cost} 點，你目前有 ${user?.credits || 0} 點`,
        credits: user?.credits || 0,
        required: cost
      });
    }
    req.creditCost = cost;
    next();
  };
}

// 文字生成圖片
router.post('/text-to-image', authMiddleware, checkCredits('text-to-image'), async (req, res) => {
  const { prompt, negative_prompt, width = 1024, height = 1024, style = 'none', quality = 'standard' } = req.body;
  // 根據品質等級決定模型和參數
  const qParams = QUALITY_PARAMS[quality] || QUALITY_PARAMS['standard'];
  const model = qParams.model;
  if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });

  const id = uuidv4();
  await db.insertOne('generations', {
    id, user_id: req.user.id, type: 'text-to-image',
    prompt, negative_prompt: negative_prompt || null, model,
    width, height, image_url: null, status: 'processing',
    credit_cost: req.creditCost,
    created_at: new Date().toISOString()
  });

  // 扣點
  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const finalPrompt = await preparePrompt(prompt, style);
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const modelId = MODELS[model] || MODELS['flux-schnell'];
    let input = { prompt: finalPrompt };
    // 合併負面提示詞
    const styleNeg = STYLE_NEGATIVE[style] || '';
    const fullNeg = [negative_prompt, styleNeg].filter(Boolean).join(', ');
    if (model === 'flux-schnell' || model === 'flux-dev') {
      input.aspect_ratio = getAspectRatio(width, height);
    } else {
      input.width = width; input.height = height;
      if (fullNeg) input.negative_prompt = fullNeg;
    }

    // 更新記錄儲存翻譯後的提示詞
    await db.updateOne('generations', { id }, { prompt_en: finalPrompt });

    const output = await replicate.run(modelId, { input });
    const imageUrl = Array.isArray(output) ? output[0] : String(output);

    await db.updateOne('generations', { id }, { image_url: imageUrl, status: 'completed' });
    const updatedUser = await db.findOne('users', { id: req.user.id });
    res.json({ id, image_url: imageUrl, status: 'completed', credits: updatedUser.credits });
  } catch (err) {
    // 生成失敗退還點數
    const u = await db.findOne('users', { id: req.user.id });
    await db.updateOne('users', { id: req.user.id }, { credits: u.credits + req.creditCost });
    await db.updateOne('generations', { id }, { status: 'failed' });
    console.error('生成錯誤:', err.message);
    let userMsg = '圖片生成失敗';
    if (err.message.includes('402') || err.message.includes('Insufficient credit')) {
      userMsg = 'Replicate 餘額不足，請至 https://replicate.com/account/billing 儲值（約 $5 即可生成 1600 張）';
    } else if (err.message.includes('429')) {
      userMsg = '請求過於頻繁，請稍等幾秒後再試';
    }
    res.status(500).json({ error: userMsg });
  }
});

// 圖片轉圖片
router.post('/image-to-image', authMiddleware, checkCredits('image-to-image'), upload.single('image'), async (req, res) => {
  const { prompt, strength = 0.7 } = req.body;
  if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });
  if (!req.file) return res.status(400).json({ error: '請上傳圖片' });

  const id = uuidv4();
  await db.insertOne('generations', {
    id, user_id: req.user.id, type: 'image-to-image',
    prompt, model: 'sdxl', image_url: null, status: 'processing',
    credit_cost: req.creditCost, created_at: new Date().toISOString()
  });

  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const finalPrompt = await preparePrompt(prompt);
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${imageData.toString('base64')}`;

    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2319f9c07e2c6ce3367fb4cb7203f4cd64a25d6927f7fa2d07fa7fba5',
      { input: { prompt: finalPrompt, image: base64Image, strength: parseFloat(strength) } }
    );

    fs.unlinkSync(req.file.path);
    const imageUrl = Array.isArray(output) ? output[0] : String(output);
    await db.updateOne('generations', { id }, { image_url: imageUrl, status: 'completed' });
    const updatedUser = await db.findOne('users', { id: req.user.id });
    res.json({ id, image_url: imageUrl, status: 'completed', credits: updatedUser.credits });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const u = await db.findOne('users', { id: req.user.id });
    await db.updateOne('users', { id: req.user.id }, { credits: u.credits + req.creditCost });
    await db.updateOne('generations', { id }, { status: 'failed' });
    res.status(500).json({ error: '圖片生成失敗: ' + err.message });
  }
});

// ── 輔助：以非同步方式提交 Replicate 任務，立即回傳 jobId ──────
async function createPrediction(modelId, input, apiToken) {
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version: modelId, input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || '建立任務失敗');
  return data; // { id, status, urls, ... }
}

async function createModelPrediction(modelPath, input, apiToken) {
  const res = await fetch(`https://api.replicate.com/v1/models/${modelPath}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || '建立任務失敗');
  return data;
}

// ── 查詢任務狀態 ────────────────────────────────────────────────
router.get('/job/:predictionId', authMiddleware, async (req, res) => {
  const { predictionId } = req.params;

  // 找到對應的 generation 記錄
  const gen = await db.findOne('generations', { prediction_id: predictionId, user_id: req.user.id });
  if (!gen) return res.status(404).json({ error: '找不到任務' });

  // 若已完成，直接回傳
  if (gen.status === 'completed' || gen.status === 'failed') {
    const currentUser = await db.findOne('users', { id: req.user.id });
    return res.json({ status: gen.status, video_url: gen.video_url, credits: currentUser?.credits });
  }

  // 向 Replicate 查詢最新狀態
  try {
    const result = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
    }).then(r => r.json());

    if (result.status === 'succeeded') {
      const videoUrl = Array.isArray(result.output) ? result.output[0] : String(result.output);
      await db.updateOne('generations', { prediction_id: predictionId }, { video_url: videoUrl, status: 'completed' });
      const currentUser = await db.findOne('users', { id: req.user.id });
      return res.json({ status: 'completed', video_url: videoUrl, credits: currentUser?.credits });
    }

    if (result.status === 'failed' || result.status === 'canceled') {
      // 退還點數
      const genRecord = await db.findOne('generations', { prediction_id: predictionId });
      if (genRecord && genRecord.status !== 'failed') {
        const u = await db.findOne('users', { id: req.user.id });
        await db.updateOne('users', { id: req.user.id }, { credits: u.credits + (genRecord.credit_cost || 5) });
        await db.updateOne('generations', { prediction_id: predictionId }, { status: 'failed' });
      }
      return res.json({ status: 'failed', error: result.error || '生成失敗' });
    }

    // 仍在處理中
    res.json({ status: result.status, progress: result.logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 文字生成影片（非同步）
router.post('/text-to-video', authMiddleware, checkCredits('text-to-video'), async (req, res) => {
  const { prompt, aspect_ratio = '16:9' } = req.body;
  if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });

  const id = uuidv4();
  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const finalPrompt = await preparePrompt(prompt);

    // 非同步提交（立即得到 predictionId，不等待結果）
    const prediction = await createModelPrediction(
      'wavespeedai/wan-2.1-t2v-480p',
      { prompt: finalPrompt, num_frames: 81, aspect_ratio, fast_mode: 'Balanced' },
      process.env.REPLICATE_API_TOKEN
    );

    await db.insertOne('generations', {
      id, user_id: req.user.id, type: 'text-to-video',
      prompt, prompt_en: finalPrompt, model: 'wan-t2v',
      prediction_id: prediction.id,
      video_url: null, status: 'processing',
      credit_cost: req.creditCost, created_at: new Date().toISOString()
    });

    // 立即回傳 jobId，前端輪詢
    res.json({ id, prediction_id: prediction.id, status: 'processing' });
  } catch (err) {
    const u = await db.findOne('users', { id: req.user.id });
    await db.updateOne('users', { id: req.user.id }, { credits: u.credits + req.creditCost });
    console.error('影片提交失敗:', err.message);
    res.status(500).json({ error: '影片任務提交失敗: ' + err.message });
  }
});

// 圖片生成影片（非同步，使用 Wan I2V 替換已廢棄的 SVD）
router.post('/image-to-video', authMiddleware, checkCredits('image-to-video'), upload.single('image'), async (req, res) => {
  const { prompt = '' } = req.body;
  if (!req.file) return res.status(400).json({ error: '請上傳圖片' });

  const id = uuidv4();
  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${imageData.toString('base64')}`;
    fs.unlinkSync(req.file.path);

    const finalPrompt = prompt ? await preparePrompt(prompt) : 'smooth camera motion, high quality video';

    // 使用 Wan 2.1 I2V（圖片轉影片，比 SVD 更穩定）
    const prediction = await createPrediction(
      'e2870aa4965fd9ddfd87c16a3c8ab952c18e745e63f3f3b123c2dc8b538ad2b5',
      { image: base64Image, prompt: finalPrompt, fast_mode: 'Balanced', num_frames: 81 },
      process.env.REPLICATE_API_TOKEN
    );

    await db.insertOne('generations', {
      id, user_id: req.user.id, type: 'image-to-video',
      prompt, model: 'wan-i2v',
      prediction_id: prediction.id,
      video_url: null, status: 'processing',
      credit_cost: req.creditCost, created_at: new Date().toISOString()
    });

    res.json({ id, prediction_id: prediction.id, status: 'processing' });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const u = await db.findOne('users', { id: req.user.id });
    await db.updateOne('users', { id: req.user.id }, { credits: u.credits + req.creditCost });
    console.error('影片提交失敗:', err.message);
    res.status(500).json({ error: '影片任務提交失敗: ' + err.message });
  }
});

router.get('/models', authMiddleware, (req, res) => {
  res.json({
    models: [
      { id: 'flux-schnell', name: 'FLUX Schnell', desc: '最快速', cost: 1, type: ['text-to-image'] },
      { id: 'flux-dev', name: 'FLUX Dev', desc: '高品質', cost: 1, type: ['text-to-image'] },
      { id: 'sdxl', name: 'SDXL', desc: '支援圖轉圖', cost: 2, type: ['text-to-image', 'image-to-image'] },
      { id: 'wan-t2v', name: 'Wan T2V', desc: '文字生成影片', cost: 5, type: ['text-to-video'] },
      { id: 'svd', name: 'SVD', desc: '圖片生成影片', cost: 5, type: ['image-to-video'] },
    ]
  });
});

function getAspectRatio(width, height) {
  const ratio = width / height;
  if (ratio >= 1.7) return '16:9';
  if (ratio >= 1.3) return '4:3';
  if (ratio >= 0.9) return '1:1';
  if (ratio >= 0.7) return '3:4';
  return '9:16';
}

module.exports = router;
