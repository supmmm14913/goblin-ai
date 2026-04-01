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

// ── NovitaAI 模型（69 個 SEXY.AI 同款）────────────────────────────
const NOVITA_MODELS = {
  // 通用 / 寫實
  'novita-dreamshaper':             'dreamshaper_8.safetensors',
  'novita-chillout-mix':            'chilloutmix_NiPrunedFp32Fix.safetensors',
  'novita-deliberate':              'deliberate_v2.safetensors',
  'novita-cyber-realistic':         'cyberrealistic_v33.safetensors',
  'novita-cyber-realistic-revamp':  'cyberRealisticRevamp_v30VAE.safetensors',
  'novita-epic-photo':              'epicphotogasm_xPlusPlus.safetensors',
  'novita-epic-photo-v3':           'epicphotogasm_v3.safetensors',
  'novita-epic-natural':            'epicNaturalBeautiful_v2.safetensors',
  'novita-epic-realism':            'epicrealism_naturalSinRC1VAE.safetensors',
  'novita-photography':             'photography_v1.safetensors',
  'novita-photon':                  'photon_v1.safetensors',
  'novita-ghost-mix':               'ghostmix_v20Bakedvae.safetensors',
  'novita-grounded-realistic':      'groundedRealisticMix_v11.safetensors',
  'novita-realistic-vision-v4':     'realisticVisionV40_v40VAE.safetensors',
  'novita-realistic-vision-v5':     'realisticVisionV51_v51VAE.safetensors',
  'novita-real-dream':              'realDream_10.safetensors',
  'novita-reliberate':              'reliberate_v24.safetensors',
  'novita-rev-animated':            'revAnimated_v122EOL.safetensors',
  'novita-urpm':                    'URPM_v1.3.safetensors',
  'novita-uhd':                     'uhd23_unifiedHighDetail.safetensors',
  'novita-sd15':                    'v1-5-pruned-emaonly.safetensors',
  'novita-lazymix':                 'lazymixRealAmateur_v1.safetensors',
  'novita-babes-v2':                'babes_20.safetensors',
  'novita-experience':              'experience_v2.safetensors',
  'novita-bom':                     'bom_v10.safetensors',
  'novita-art-universe':            'artUniverse_v5.safetensors',
  // 動漫 / 卡通
  'novita-anime':                   'meinamix_meinaV11.safetensors',
  'novita-anime-characters':        'animecharacters_v1.safetensors',
  'novita-anything-v5':             'anything-v5-PrtRE.safetensors',
  'novita-hassaku-hentai':          'hassakuHentai_v12.safetensors',
  'novita-hentai-v2':               'hentaiDiffusion_v21.safetensors',
  'novita-hardcore-hentai':         'hardcoreHentai_v13.safetensors',
  'novita-pony-diffusion':          'ponyDiffusionXLV6_v6StartWithThisOne.safetensors',
  'novita-dreamshaper-pixel':       'dreamshaperXL_lightningDPMSDE.safetensors',
  'novita-real-cartoon-3d':         'realcartoon3d_v8.safetensors',
  'novita-toon-universe':           'toonuniverse_v5.safetensors',
  'novita-fantasy-mix':             'fantasymix_v1.safetensors',
  'novita-porn-cartoon':            'pornCartoon_v1.safetensors',
  // Furry
  'novita-furry':                   'yiffymix_v34.safetensors',
  'novita-anime-furry':             'animefurry_v1.safetensors',
  'novita-coconut-furry':           'coconutfurrymix_v1.safetensors',
  'novita-pina-colada-furry':       'pinacoladafurrymix_v1.safetensors',
  'novita-persika-furry':           'persikafurryrealism_v1.safetensors',
  'novita-yiffy-mix':               'yiffymix_v34.safetensors',
  'novita-seel-real-furry':         'seelrealFurry_v493.safetensors',
  // 成人 / 特殊
  'novita-abyss-orange-mix':        'abyssorangemix2SFW_sfw.safetensors',
  'novita-porn-merge':              'pornMasterPro_v00.safetensors',
  'novita-porn-ultimate':           'pornultimate_v3.safetensors',
  'novita-buxom-brits':             'buxombrits_v1.safetensors',
  'novita-clear-bondage':           'clearBondage_v1.safetensors',
  'novita-latex-vision':            'latexvision_v1.safetensors',
  'novita-vr-porn':                 'vrPorn_v3.safetensors',
  'novita-blowjob-safe':            'blowjobSafe_v1.safetensors',
  'novita-blowbang-ultimate':       'blowbangUltimate_v1.safetensors',
  'novita-doggystyle-safe':         'doggystyleSafe_v1.safetensors',
  'novita-missionary-safe':         'missionarySafe_v1.safetensors',
  'novita-titfuck':                 'titfuck_v1.safetensors',
  'novita-futanari-diffusion':      'futanariDiffusion_v1.safetensors',
  'novita-gay-diffusion':           'gayDiffusion_v1.safetensors',
  'novita-homoerotic':              'homoerotic_v1.safetensors',
  'novita-homoerotic-unstable':     'homoerotixUnstable_v1.safetensors',
  'novita-manly-nudes':             'manlyNudes_v1.safetensors',
  'novita-virile-reality':          'virileReality_v3.safetensors',
  'novita-transformix':             'transformix_v1.safetensors',
  // Inpainting
  'novita-anything-inpainting':     'anything-v5-PrtRE.safetensors',
  'novita-chillout-inpainting':     'chilloutmix_NiPrunedFp32Fix.safetensors',
  'novita-men-inpainting':          'men_inpainting_v1.safetensors',
  'novita-photography-inpainting':  'photography_v1.safetensors',
  'novita-sd15-inpainting':         'v1-5-pruned-emaonly.safetensors',
  'novita-urpm-inpainting':         'URPM_v1.3.safetensors',
};

// NovitaAI 文字生成圖片（非同步輪詢，後端等待結果）
async function novitaTextToImage(modelName, prompt, negativePrompt, width, height) {
  const apiKey = process.env.NOVITA_API_KEY;
  if (!apiKey) throw new Error('NOVITA_API_KEY 未設定，請至 Railway 環境變數新增');

  // 提交任務
  const submitRes = await fetch('https://api.novita.ai/v3/async/txt2img', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_name: modelName,
      prompt,
      negative_prompt: negativePrompt || 'ugly, blurry, low quality, watermark, text, logo, bad anatomy',
      width:  Math.min(Math.max(width  || 512, 256), 1024),
      height: Math.min(Math.max(height || 768, 256), 1024),
      steps: 20,
      cfg_scale: 7,
      sampler_name: 'DPM++ 2M Karras',
      image_num: 1,
      seed: -1,
    }),
  });
  if (!submitRes.ok) {
    const err = await submitRes.json().catch(() => ({}));
    throw new Error(`NovitaAI 提交失敗: ${err.message || err.reason || submitRes.status}`);
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
      throw new Error(`NovitaAI 生成失敗: ${data.task?.reason || '未知錯誤'}`);
    }
  }
  throw new Error('NovitaAI 生成超時（3 分鐘），點數已退還');
}

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
