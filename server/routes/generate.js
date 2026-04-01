const express = require('express');
const router = express.Router();
const Replicate = require('replicate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// 點數費用
const CREDIT_COST = {
  'text-to-image': 2,
  'image-to-image': 3,
  'text-to-video': 5,
  'image-to-video': 5,
  'inpaint': 3,
};

// 品質等級對應模型參數
const QUALITY_PARAMS = {
  'standard': { model: 'flux-schnell',  steps: 4,  guidance: 3.5 },
  'fine':     { model: 'flux-dev',      steps: 28, guidance: 3.5 },
  'ultra':    { model: 'flux-dev',      steps: 50, guidance: 4.5 },
  'premium':  { model: 'flux-1.1-pro',  steps: 28, guidance: 3.5 },
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
  'flux-schnell':     'black-forest-labs/flux-schnell',
  'flux-dev':         'black-forest-labs/flux-dev',
  'flux-1.1-pro':     'black-forest-labs/flux-1.1-pro',
  'sdxl':             'stability-ai/sdxl:39ed52f2319f9c07e2c6ce3367fb4cb7203f4cd64a25d6927f7fa2d07fa7fba5',
  'dreamshaper-xl':   'lucataco/dreamshaper-xl-turbo',
  'realistic-vision': 'lucataco/realistic-vision-v5',
  'anything-v5':      'cjwbw/anything-v5',
  'deliberate-v2':    'lucataco/deliberate-v2',
};

// SD 1.5 models (max 768px resolution, 30 steps)
const SD15_MODELS = new Set(['realistic-vision', 'anything-v5', 'deliberate-v2']);
// FLUX models (use aspect_ratio instead of width/height)
const FLUX_MODELS  = new Set(['flux-schnell', 'flux-dev', 'flux-1.1-pro']);

// ── NovitaAI 模型（已逐一實測 txt2img 可用）────────────────────────
// ❌ 排除：inpainting 模型（無法用於 txt2img）、LoRA（非 checkpoint）
const NOVITA_MODELS = {
  // 寫實 / 通用
  'novita-epic-realism':       'epicrealism_naturalSinRC1VAE_106430.safetensors',
  'novita-realistic-afmix':    'realisticAfmix_realisticAfmix_75178.safetensors',
  'novita-epic-photo-xpp':     'epicphotogasm_xPlusPlus_135412.safetensors',
  'novita-epic-photo-x':       'epicphotogasm_x_131265.safetensors',
  'novita-majicmix':           'majicmixRealistic_v6_65516.safetensors',
  // 動漫
  'novita-meina-hentai':       'meinahentai_v4_70340.safetensors',
  'novita-rev-animated':       'revAnimated_v122.safetensors',
  // Furry / NSFW
  'novita-furry':              'lawlassYiffymix20Furry_lawlasmixWithBakedIn_13264.safetensors',
  // SDXL
  'novita-sdxl':               'sd_xl_base_1.0.safetensors',
};

// NovitaAI 文字生成圖片（非同步輪詢，後端等待結果）
async function novitaTextToImage(modelName, prompt, negativePrompt, width, height) {
  const apiKey = process.env.NOVITA_API_KEY;
  if (!apiKey) throw new Error('NOVITA_API_KEY 未設定，請至 Railway 環境變數新增');

  // SD1.5 系列最佳尺寸限制（SDXL 可到 1024）
  const isXL = modelName.includes('xl') || modelName.includes('XL') || modelName === 'sd_xl_base_1.0.safetensors';
  const maxRes = isXL ? 1024 : 768;
  const reqW = Math.min(Math.max(Math.round((width  || 512) / 64) * 64, 256), maxRes);
  const reqH = Math.min(Math.max(Math.round((height || 768) / 64) * 64, 256), maxRes);

  // NovitaAI 限制 prompt ≤ 1024 字元
  const safePrompt = prompt.length > 1024 ? prompt.slice(0, 1024) : prompt;
  if (prompt.length > 1024) console.warn(`[NovitaAI] 提詞過長 (${prompt.length})，已截斷至 1024`);

  const body = {
    request: {
      model_name: modelName,
      prompt: safePrompt,
      negative_prompt: (negativePrompt || 'ugly, blurry, low quality, watermark, text, logo, bad anatomy').slice(0, 512),
      width:  reqW,
      height: reqH,
      steps: 25,
      guidance_scale: 7,
      sampler_name: 'DPM++ 2M Karras',
      image_num: 1,
      seed: -1,
    }
  };
  console.log('[NovitaAI] 提交:', { model_name: modelName, width: reqW, height: reqH });

  // 提交任務
  const submitRes = await fetch('https://api.novita.ai/v3/async/txt2img', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => '');
    console.error('[NovitaAI] 提交失敗:', submitRes.status, errBody);
    throw new Error(`NovitaAI 提交失敗 (${submitRes.status}): ${errBody}`);
  }
  const { task_id } = await submitRes.json();

  // 輪詢結果（每 3 秒，最多 3 分鐘）
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${task_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    const status = data.task?.status;
    if (status === 'TASK_STATUS_SUCCEED') {
      const url = data.images?.[0]?.image_url;
      if (!url) throw new Error('NovitaAI：未返回圖片 URL');
      return url;
    }
    if (status === 'TASK_STATUS_FAILED') {
      const reason = data.task?.reason || data.task?.err_detail || JSON.stringify(data.task) || '未知錯誤';
      console.error('[NovitaAI] 任務失敗:', reason);
      throw new Error(`NovitaAI 生成失敗: ${reason}`);
    }
  }
  throw new Error('NovitaAI 生成超時（3 分鐘），點數已退還');
}

// 偵測是否含有中文字元
function hasChinese(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/.test(text);
}

// 翻譯單一短句（< 400 字元）
async function translateChunk(chunk) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=zh|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const t = data.responseData.translatedText;
      if (!hasChinese(t)) return t;
    }
  } catch (e) { /* ignore */ }
  return chunk; // 翻譯失敗就保留原文
}

// 智慧翻譯：只翻譯中文片段，SD 語法 / 英文 Tags 保留不動
async function translateToEnglish(text) {
  const cleanText = text.replace(/\s*--\s*style:.*$/i, '').trim();

  // 若不含中文，直接返回
  if (!hasChinese(cleanText)) return cleanText;

  // 若提詞含有 SD 語法標記（BREAK / weight syntax），只替換中文片段
  const hasSDSyntax = /BREAK|:\d+\.\d+\)|score_\d|source_real/i.test(cleanText);
  if (hasSDSyntax) {
    // 抽取所有連續中文片段，逐一翻譯後替換
    const chinesePattern = /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]+/g;
    const segments = [...new Set(cleanText.match(chinesePattern) || [])];
    let result = cleanText;
    for (const seg of segments) {
      if (seg.length > 100) continue; // 超長中文段落跳過
      const translated = await translateChunk(seg);
      result = result.replace(new RegExp(seg, 'g'), translated);
    }
    console.log('[翻譯] SD 提詞模式：只替換中文片段');
    return result;
  }

  // 純中文提詞：整段翻譯（限 400 字元）
  const chunk = cleanText.slice(0, 400);
  const translated = await translateChunk(chunk);
  console.log(`[翻譯] "${chunk.slice(0,50)}..." → "${translated.slice(0,50)}..."`);
  return translated + (cleanText.length > 400 ? ' ' + cleanText.slice(400) : '');
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
    const cost = CREDIT_COST[type] || 2;
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

// 社群模型（直接使用用戶選擇的模型，不走 quality 對應）
const COMMUNITY_MODEL_IDS = new Set(['sdxl', 'dreamshaper-xl', 'realistic-vision', 'anything-v5', 'deliberate-v2']);

// 文字生成圖片
router.post('/text-to-image', authMiddleware, checkCredits('text-to-image'), async (req, res) => {
  const { prompt, negative_prompt, width = 1024, height = 1024, style = 'none', quality = 'standard', model: reqModel = '' } = req.body;
  // NovitaAI / 社群模型直接使用；FLUX 系列走 quality 對應
  let model;
  if (reqModel in NOVITA_MODELS || COMMUNITY_MODEL_IDS.has(reqModel)) {
    model = reqModel;
  } else {
    const qParams = QUALITY_PARAMS[quality] || QUALITY_PARAMS['standard'];
    model = qParams.model;
  }
  if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });

  const id = uuidv4();
  await db.insertOne('generations', {
    id, user_id: req.user.id, type: 'text-to-image',
    prompt, negative_prompt: negative_prompt || null, model,
    width, height, image_url: null, status: 'processing',
    is_public: true,
    credit_cost: req.creditCost,
    created_at: new Date().toISOString()
  });

  // 扣點
  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const finalPrompt = await preparePrompt(prompt, style);
    // 合併負面提示詞
    const styleNeg = STYLE_NEGATIVE[style] || '';
    const fullNeg = [negative_prompt, styleNeg].filter(Boolean).join(', ');

    // ── NovitaAI 分支（69 個 SEXY.AI 同款模型）────────────────
    if (model in NOVITA_MODELS) {
      const imageUrl = await novitaTextToImage(NOVITA_MODELS[model], finalPrompt, fullNeg, width, height);
      await db.updateOne('generations', { id }, { image_url: imageUrl, status: 'completed', prompt_en: finalPrompt });
      const updatedUser = await db.findOne('users', { id: req.user.id });
      return res.json({ id, image_url: imageUrl, status: 'completed', credits: updatedUser.credits });
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const modelId = MODELS[model] || MODELS['flux-schnell'];
    let input = { prompt: finalPrompt };
    if (FLUX_MODELS.has(model)) {
      input.aspect_ratio = getAspectRatio(width, height);
    } else {
      const maxRes = SD15_MODELS.has(model) ? 768 : 1024;
      input.width  = Math.min(width,  maxRes);
      input.height = Math.min(height, maxRes);
      if (fullNeg) input.negative_prompt = fullNeg;
      input.guidance_scale       = 7.5;
      input.num_inference_steps  = SD15_MODELS.has(model) ? 30 : 25;
      input.num_outputs           = 1;
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
    let userMsg = `圖片生成失敗：${err.message}`;
    if (err.message.includes('402') || err.message.includes('Insufficient credit')) {
      userMsg = 'Replicate 餘額不足，請至 https://replicate.com/account/billing 儲值';
    } else if (err.message.includes('429')) {
      userMsg = '請求過於頻繁，請稍等幾秒後再試';
    } else if (err.message.includes('NOVITA_API_KEY')) {
      userMsg = 'NovitaAI API Key 未設定，請至 Railway 環境變數新增 NOVITA_API_KEY';
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
    is_public: true,
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
  const { prompt, aspect_ratio = '16:9', style = 'none', video_model = 'kling-v3' } = req.body;
  if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });

  const id = uuidv4();
  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const finalPrompt = await preparePrompt(prompt, style);

    let predModel, predInput, modelName;
    if (video_model === 'hunyuan') {
      predModel = 'tencent/hunyuan-video';
      predInput = { prompt: finalPrompt, aspect_ratio, num_frames: 61, fps: 24 };
      modelName = 'hunyuan-video';
    } else {
      predModel = 'kwaivgi/kling-v3-video';
      predInput = { prompt: finalPrompt, duration: 5, aspect_ratio, mode: 'standard' };
      modelName = 'kling-v3';
    }

    const prediction = await createModelPrediction(predModel, predInput, process.env.REPLICATE_API_TOKEN);

    await db.insertOne('generations', {
      id, user_id: req.user.id, type: 'text-to-video',
      prompt, prompt_en: finalPrompt, model: modelName,
      prediction_id: prediction.id,
      video_url: null, status: 'processing',
      is_public: true,
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
  const { prompt = '', style = 'none', video_model = 'kling-omni' } = req.body;
  if (!req.file) return res.status(400).json({ error: '請上傳圖片' });

  const id = uuidv4();
  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${imageData.toString('base64')}`;
    fs.unlinkSync(req.file.path);

    const finalPrompt = prompt ? await preparePrompt(prompt, style) : 'smooth cinematic motion, high quality video';

    let predModel, predInput, modelName;
    if (video_model === 'svd') {
      predModel = 'stability-ai/stable-video-diffusion';
      predInput = { input_image: base64Image, video_length: '25_frames_with_svd_xt', sizing_strategy: 'crop_resize_center', motion_bucket_id: 127, fps_id: 6 };
      modelName = 'svd';
    } else {
      predModel = 'kwaivgi/kling-v3-omni-video';
      predInput = { start_image: base64Image, prompt: finalPrompt, duration: 5, mode: 'standard' };
      modelName = 'kling-v3-omni';
    }

    const prediction = await createModelPrediction(predModel, predInput, process.env.REPLICATE_API_TOKEN);

    await db.insertOne('generations', {
      id, user_id: req.user.id, type: 'image-to-video',
      prompt, model: modelName,
      prediction_id: prediction.id,
      video_url: null, status: 'processing',
      is_public: true,
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

// ── 局部重繪 (Inpainting) ──────────────────────────────────────────
router.post('/inpaint', authMiddleware, checkCredits('inpaint'),
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mask', maxCount: 1 }]),
  async (req, res) => {
    const { prompt, style = 'none' } = req.body;
    if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });
    if (!req.files?.image?.[0]) return res.status(400).json({ error: '請上傳原始圖片' });
    if (!req.files?.mask?.[0])  return res.status(400).json({ error: '請上傳遮罩圖片（白色 = 重繪區域）' });

    const imagePath = req.files.image[0].path;
    const maskPath  = req.files.mask[0].path;
    const id = uuidv4();

    const user = await db.findOne('users', { id: req.user.id });
    await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

    try {
      const imageData = fs.readFileSync(imagePath);
      const maskData  = fs.readFileSync(maskPath);
      const base64Image = `data:${req.files.image[0].mimetype};base64,${imageData.toString('base64')}`;
      const base64Mask  = `data:${req.files.mask[0].mimetype};base64,${maskData.toString('base64')}`;
      fs.unlinkSync(imagePath);
      fs.unlinkSync(maskPath);

      const finalPrompt = await preparePrompt(prompt, style);
      const replicate   = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

      const output = await replicate.run('stability-ai/stable-diffusion-inpainting', {
        input: {
          prompt: finalPrompt,
          image:  base64Image,
          mask:   base64Mask,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          num_outputs: 1,
        }
      });

      const imageUrl = Array.isArray(output) ? output[0] : String(output);
      await db.insertOne('generations', {
        id, user_id: req.user.id, type: 'inpaint',
        prompt, model: 'sdxl-inpaint',
        image_url: imageUrl, status: 'completed',
        is_public: true,
        credit_cost: req.creditCost, created_at: new Date().toISOString()
      });

      const updatedUser = await db.findOne('users', { id: req.user.id });
      res.json({ id, image_url: imageUrl, status: 'completed', credits: updatedUser.credits });
    } catch (err) {
      [imagePath, maskPath].forEach(p => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {} });
      const u = await db.findOne('users', { id: req.user.id });
      await db.updateOne('users', { id: req.user.id }, { credits: u.credits + req.creditCost });
      await db.insertOne('generations', { id, user_id: req.user.id, type: 'inpaint', prompt, model: 'sdxl-inpaint', image_url: null, status: 'failed', credit_cost: req.creditCost, created_at: new Date().toISOString() });
      console.error('局部重繪失敗:', err.message);
      res.status(500).json({ error: '局部重繪失敗: ' + err.message });
    }
  }
);

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
