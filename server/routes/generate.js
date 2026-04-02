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

// NovitaAI 圖片轉圖片（img2img）
async function novitaImageToImage(modelName, prompt, imageBase64, strength = 0.7, width = 768, height = 768) {
  const apiKey = process.env.NOVITA_API_KEY;
  if (!apiKey) throw new Error('NOVITA_API_KEY 未設定');

  // 去除 data URL 前綴，NovitaAI 只接受純 base64
  const base64Data = imageBase64.replace(/^data:image\/[a-z+]+;base64,/, '');
  const safePrompt = prompt.length > 1024 ? prompt.slice(0, 1024) : prompt;

  const isXL = modelName.includes('xl') || modelName.includes('XL');
  const maxRes = isXL ? 1024 : 768;
  const reqW = Math.min(Math.max(Math.round(width  / 64) * 64, 256), maxRes);
  const reqH = Math.min(Math.max(Math.round(height / 64) * 64, 256), maxRes);

  const body = {
    request: {
      model_name:       modelName,
      image_base64:     base64Data,
      prompt:           safePrompt,
      negative_prompt:  'ugly, blurry, low quality, watermark, text, logo, bad anatomy, deformed',
      strength:         Math.min(Math.max(parseFloat(strength), 0.1), 1.0),
      width:            reqW,
      height:           reqH,
      steps:            25,
      guidance_scale:   7,
      sampler_name:     'Euler a',
      image_num:        1,
      seed:             -1,
    }
  };
  console.log('[NovitaAI img2img] 提交:', { model_name: modelName, strength, width: reqW, height: reqH });

  const submitRes = await fetch('https://api.novita.ai/v3/async/img2img', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => '');
    console.error('[NovitaAI img2img] 提交失敗:', submitRes.status, errBody);
    throw new Error(`NovitaAI img2img 提交失敗 (${submitRes.status}): ${errBody}`);
  }
  const { task_id } = await submitRes.json();

  // 輪詢（每 3 秒，最多 2 分鐘）
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${task_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    const status = data.task?.status;
    if (status === 'TASK_STATUS_SUCCEED') {
      const urls = (data.images || []).map(img => img.image_url).filter(Boolean);
      if (!urls.length) throw new Error('NovitaAI img2img：未返回圖片 URL');
      console.log('[NovitaAI img2img] 完成:', urls[0].substring(0, 60));
      return urls[0];
    }
    if (status === 'TASK_STATUS_FAILED') {
      const reason = data.task?.reason || data.task?.err_detail || '未知錯誤';
      throw new Error(`NovitaAI img2img 生成失敗: ${reason}`);
    }
  }
  throw new Error('NovitaAI img2img 生成超時，點數已退還');
}

// NovitaAI 文字生成圖片（非同步輪詢，後端等待結果）
async function novitaTextToImage(modelName, prompt, negativePrompt, width, height, count = 1) {
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
      sampler_name: 'Euler a',
      image_num: Math.min(Math.max(count, 1), 8),
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

  // 輪詢結果（每 3 秒，最多 5 分鐘，批量圖片需要更長時間）
  const maxPolls = 20 + count * 10; // 1張=30次(90s)，8張=100次(300s)
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${task_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    const status = data.task?.status;
    if (status === 'TASK_STATUS_SUCCEED') {
      const urls = (data.images || []).map(img => img.image_url).filter(Boolean);
      if (!urls.length) throw new Error('NovitaAI：未返回圖片 URL');
      return urls; // 回傳 URL 陣列
    }
    if (status === 'TASK_STATUS_FAILED') {
      const reason = data.task?.reason || data.task?.err_detail || JSON.stringify(data.task) || '未知錯誤';
      console.error('[NovitaAI] 任務失敗:', reason);
      throw new Error(`NovitaAI 生成失敗: ${reason}`);
    }
  }
  throw new Error(`NovitaAI 生成超時，點數已退還`);
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

// ── 人名偵測 + 外觀描述注入（翻譯後直接注入，繞過翻譯損失）──────
// ── 公眾人物外觀資料庫（英文 SD 最佳化關鍵詞，直接注入翻譯後的提詞）
const CELEBRITY_DB_EN = {
  // ── 台灣政治人物 ─────────────────────────────────────────────
  '陳時中':  'portrait photo of Chen Shih-chung, 74-year-old Taiwanese male politician, very round fat chubby pudgy face full puffy cheeks deep nasolabial folds heavy age wrinkles, short dark salt-and-pepper hair with grey temples, warm gentle smile showing teeth, thin gold oval-framed eyeglasses, stocky heavyset overweight build, wearing dark midnight navy blue suit jacket dark blue formal business suit, white dress shirt, bright golden yellow tie, plain grey studio background, East Asian Taiwanese complexion, photorealistic portrait photography',
  '蔡英文':  'Tsai Ing-wen, Taiwanese female politician, 68 years old, short black bob haircut, petite slim figure, dark formal business suit, dignified composed expression, East Asian complexion',
  '賴清德':  'Lai Ching-te, Taiwanese male politician, 65 years old, short black hair, slender trim build, dark formal business suit with tie, confident expression, East Asian complexion',
  '柯文哲':  'Ko Wen-je, Taiwanese male, 56 years old, extremely short buzz-cut black hair, slim tall lanky build, polo shirt or casual suit jacket, sharp intense piercing gaze, prominent cheekbones, East Asian complexion',
  '韓國瑜':  'Han Kuo-yu, Taiwanese male politician, 67 years old, receding hairline bald forehead, overweight heavyset chubby build, round fleshy face, dark suit, East Asian complexion',
  '侯友宜':  'Hou Yu-ih, Taiwanese male politician, 67 years old, short grey-black hair, stocky muscular build, dark formal suit, serious stern expression, East Asian complexion',
  '朱立倫':  'Chu Li-luan, Taiwanese male politician, 63 years old, short black hair, medium build, dark formal business suit, friendly refined expression, East Asian complexion',
  '江啟臣':  'Chiang Chi-chen, Taiwanese male politician, 54 years old, short black hair, medium slim build, dark business suit, youthful handsome face, East Asian complexion',
  '鄭文燦':  'Cheng Wen-tsan, Taiwanese male politician, 57 years old, short black hair, slightly chubby round face, warm friendly smile, dark business suit, East Asian complexion',
  '陳其邁':  'Chen Chi-mai, Taiwanese male politician, 58 years old, short black hair, medium athletic build, dark suit, sharp capable expression, East Asian complexion',
  '盧秀燕':  'Lu Hsiu-yen, Taiwanese female politician, 62 years old, short black hair, medium build, formal pantsuit, round friendly face, East Asian complexion',
  '黃偉哲':  'Huang Wei-che, Taiwanese male politician, 60 years old, black hair, wears glasses, scholarly intellectual appearance, business suit, East Asian complexion',
  '鄭麗君':  'Cheng Li-chun, Taiwanese female politician, 52 years old, long black hair, elegant graceful figure, formal suit, artistic intellectual expression, East Asian complexion',
  '王世堅':  'Wang Shih-chien, Taiwanese male politician, 63 years old, salt-and-pepper short hair, overweight heavyset build, dark suit, East Asian complexion',
  '黃國昌':  'Huang Kuo-chang, Taiwanese male politician, 54 years old, short black hair, slim build, wears glasses, suit or casual dress, serious intellectual expression, East Asian complexion',
  '傅崐萁':  'Fu Kun-chi, Taiwanese male politician, 62 years old, short black hair, medium build, dark suit, East Asian complexion',
  '徐巧芯':  'Hsu Chiao-hsin, Taiwanese female politician, 39 years old, long black hair, youthful appearance, formal suit, East Asian complexion',
  '吳欣盈':  'Wu Hsin-ying, Taiwanese female politician, 41 years old, long black hair, tall slim figure, fashionable clothing, East Asian complexion',
  '林義雄':  'Lin Yi-hsiung, elderly Taiwanese male, 83 years old, white silver hair, kind benevolent face, simple modest clothing, East Asian complexion',
  // ── 台灣媒體人 / YouTuber ────────────────────────────────────
  '四叉貓':  'Sizhimao Liu Yu-xi, Taiwanese male internet commentator, 46 years old, short black hair, slim lean build, casual streetwear or casual shirt, friendly approachable expression, East Asian complexion',
  '蔡阿嘎':  'Tsai A-ga, Taiwanese male YouTuber, 38 years old, short black hair, energetic cheerful expression, colorful casual clothing, youthful appearance, East Asian complexion',
  '館長':    'Guanzhang Chen Chih-han, Taiwanese male fitness influencer, 45 years old, very muscular extremely buff physique, short hair, tank top or athletic wear, tall imposing figure, East Asian complexion',
  '陳之漢':  'Chen Chih-han Guanzhang, Taiwanese male fitness influencer, 45 years old, very muscular extremely buff physique, short hair, tank top or athletic wear, tall imposing figure, East Asian complexion',
  '呱吉':    'Gua Ji, Taiwanese male YouTuber, 46 years old, short black hair, wears glasses, humorous funny expression, casual clothing, East Asian complexion',
  '博恩':    'Born, Taiwanese male stand-up comedian, 34 years old, short black hair, wears glasses, witty expression, smart casual clothing, East Asian complexion',
  '理科太太': 'Likei Mrs, Taiwanese female YouTuber, 35 years old, straight long black hair, intellectual clean appearance, minimalist casual wear, East Asian complexion',
  '志祺七七': 'Shih Chi, Taiwanese male YouTuber, 34 years old, short black hair, friendly warm smile, casual clothing, East Asian complexion',
  '鄭弘儀':  'Zheng Hongyi, Taiwanese male TV host, 65 years old, white grey hair, medium build, business suit, experienced broadcaster appearance, East Asian complexion',
  '路怡珍':  'Lu Yi-zhen, Taiwanese female TV anchor, 43 years old, long black hair, professional elegant appearance, formal suit, East Asian complexion',
  '盧秀芳':  'Lu Hsiu-fang, Taiwanese female news anchor, 59 years old, short black hair, professional elegant appearance, formal suit, East Asian complexion',
  '小玉':    'Xiao Yu, Taiwanese male YouTuber, 30 years old, short black hair, youthful face, casual clothing, East Asian complexion',
  // ── 台灣歌手 / 演員 ──────────────────────────────────────────
  '周杰倫':  'Jay Chou, Taiwanese male singer, 46 years old, short stylish black hair, handsome face, fashionable trendy clothing, charismatic star quality, East Asian complexion',
  '蔡依林':  'Jolin Tsai, Taiwanese female singer, 48 years old, varied hairstyles, tall slim toned figure, glamorous fashionable outfits, East Asian complexion',
  '張惠妹':  'A-Mei Chang, Taiwanese Aboriginal female singer, 52 years old, full voluptuous figure, energetic vibrant expression, bold colorful fashion, East Asian complexion',
  '林俊傑':  'JJ Lin, Singaporean-Chinese male singer, 43 years old, short black hair, handsome boyish face, casual or stage wear, charming smile, East Asian complexion',
  '林志玲':  'Lin Chi-ling, Taiwanese female model actress, 49 years old, long black hair, 165cm tall elegant slim figure, graceful sophisticated appearance, East Asian complexion',
  '楊丞琳':  'Rainie Yang, Taiwanese female singer actress, 41 years old, long black hair, cute sweet face, fashionable trendy clothing, East Asian complexion',
  '陳柏霖':  'Chen Bo-lin, Taiwanese male actor, 43 years old, short black hair, handsome chiseled face, slim build, East Asian complexion',
  '盧廣仲':  'Crowd Lu, Taiwanese male singer, 37 years old, curly tousled hair, boyish charming face, casual musical style clothing, East Asian complexion',
  '謝金燕':  'Jess Shieh, Taiwanese female singer, 52 years old, bold provocative fashion, energetic sexy stage presence, colorful outfits, East Asian complexion',
  '五月天阿信': 'Ashin Mayday, Taiwanese male rock singer, 47 years old, black hair, rock music style clothing, energetic expressive face, East Asian complexion',
  '柯震東':  'Ko Chen-tung, Taiwanese male actor, 33 years old, short black hair, handsome youthful face, slim build, East Asian complexion',
  '盧廣仲':  'Crowd Lu, Taiwanese male singer-songwriter, 37 years old, curly black hair, boyish charming face, casual music style clothing, East Asian complexion',
  '周湯豪':  'Nick Chou, Taiwanese male singer actor, 34 years old, short black hair, handsome sunny appearance, casual clothing, East Asian complexion',
  // ── 香港 / 中國 ────────────────────────────────────────────
  '習近平':  'Xi Jinping, Chinese male politician, 71 years old, short black hair with grey, slightly overweight medium build, dark Mao suit or business suit, authoritative stern expression, East Asian complexion',
  '李克強':  'Li Keqiang, Chinese male politician, 70 years old, short black hair, medium build, dark business suit, composed scholarly expression, East Asian complexion',
  '李嘉誠':  'Li Ka-shing, elderly Hong Kong male billionaire, 96 years old, white hair, short slim elderly build, dark business suit, wise aged face, East Asian complexion',
  '劉德華':  'Andy Lau, Hong Kong male actor singer, 63 years old, short black hair with slight grey, handsome mature face, slim well-maintained build, East Asian complexion',
  '成龍':    'Jackie Chan, Hong Kong male actor, 70 years old, short salt-and-pepper hair, muscular stocky build, friendly charismatic smile, East Asian complexion',
  '梁朝偉':  'Tony Leung Chiu-wai, Hong Kong male actor, 62 years old, short black hair, deep brooding eyes, slim elegant build, sophisticated mature appearance, East Asian complexion',
  '張學友':  'Jacky Cheung, Hong Kong male singer, 63 years old, short black hair, medium build, warm charismatic expression, East Asian complexion',
  '王菲':    'Faye Wong, Chinese female singer, 55 years old, changeable hairstyles, ethereal cool beauty, avant-garde fashion, slim figure, East Asian complexion',
  '范冰冰':  'Fan Bingbing, Chinese female actress, 43 years old, long black hair, strikingly beautiful face, glamorous high-fashion outfits, slim figure, East Asian complexion',
  '趙麗穎':  'Zhao Liying, Chinese female actress, 37 years old, long black hair, sweet cute face, petite slim figure, East Asian complexion',
  // ── 國際知名 ────────────────────────────────────────────────
  '大谷翔平': 'Shohei Ohtani, Japanese male baseball player, 30 years old, 193cm very tall muscular athletic build, handsome East Asian face, baseball uniform or casual sportswear',
  '伊隆馬斯克': 'Elon Musk, American male tech entrepreneur, 53 years old, 188cm tall, short dark brown hair, medium build, casual or business casual clothing, confident expression, Western complexion',
  '馬斯克':   'Elon Musk, American male tech entrepreneur, 53 years old, 188cm tall, short dark brown hair, medium build, casual or business casual clothing, confident expression, Western complexion',
};

// 常見非人名詞彙（避免誤判）
const PERSON_STOP_WORDS = new Set([
  '生成','創作','描繪','繪製','畫出','製作','請幫','幫我','生圖',
  '圖片','照片','影像','圖像','場景','畫面','圖畫','插圖',
  '愛情','婚禮','約會','擁抱','接吻','戀愛','互動','親吻',
  '背景','日本','台灣','中國','美國','韓國','英國','法國',
  '台北','高雄','台中','新北','桃園','東京','首爾','北京',
  '男性','女性','男人','女人','男孩','女孩','小孩','老人',
  '帥氣','漂亮','可愛','美麗','英俊','性感','清純',
  '穿著','服裝','衣服','套裝','禮服','制服','裙子',
  '白色','黑色','紅色','藍色','綠色','黃色','粉色',
  '室內','室外','公園','海邊','山上','城市','街道',
  '一個','一位','一名','一對','兩個','兩位','多個',
  '正在','互相','彼此','共同','一起','同時',
  '動畫','漫畫','風格','質感','高畫質','寫實','唯美',
  '特寫','全身','半身','側臉','正面','背面',
]);

// 常見動詞前綴（避免「生成X」被誤判為5字整體）
const VERB_PREFIXES = ['生成','創作','描繪','繪製','畫出','製作','請幫','幫我','生圖','請畫','畫一','幫我畫'];

// 從 extract 中估算年齡
function extractAgeHint(extract) {
  const m = extract.match(/[（(](\d{4})年/);
  if (!m) return '';
  const age = new Date().getFullYear() - parseInt(m[1]);
  if (age < 10 || age > 120) return '';
  return `，約${age}歲`;
}

// 從 extract 中偵測性別（台灣中文 Wikipedia 常見寫法）
function detectGenderHint(extract) {
  if (/\b他\b|男性|男演員|男歌手|男藝人|男政治|男主持/.test(extract)) return '，男性';
  if (/\b她\b|女性|女演員|女歌手|女藝人|女政治|女主持/.test(extract)) return '，女性';
  return '';
}

// 查詢 Wikipedia，對資料庫之外的人名建構英文外觀描述
async function lookupPersonWikiEN(name) {
  try {
    const url = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === 'disambiguation' || !data.extract) return null;
    const combined = (data.description || '') + data.extract.slice(0, 200);
    const isPerson = /人物|演員|歌手|政治|運動員|YouTuber|youtuber|主持人|作家|導演|模特兒|明星|藝人|醫師|教授|選手|球員|律師|記者|創作者|網紅|網路紅人|評論|時事|主播|直播|媒體/.test(combined);
    if (!isPerson) return null;
    const firstSentence = data.extract.split(/[。！？\n]/)[0] || '';
    const ageHint = extractAgeHint(firstSentence);
    const age = ageHint ? ageHint.replace('，約', '').replace('歲', ' years old') : '';
    const genderHint = detectGenderHint(data.extract.slice(0, 300));
    const gender = genderHint.includes('男') ? 'male' : genderHint.includes('女') ? 'female' : '';
    const desc = (data.description || '').replace(/[\n\r]/g, ' ').trim();
    const parts = [name, gender, age ? age : '', desc, 'East Asian complexion'].filter(Boolean);
    const result = parts.join(', ');
    console.log(`[Wikipedia EN] "${name}" → ${result.slice(0, 80)}`);
    return result;
  } catch (e) { return null; }
}

// 偵測提詞中的人名，收集英文外觀描述（翻譯後注入，不修改原始中文提詞）
async function collectPersonDescriptionsEN(chineseText) {
  const descriptions = [];
  const usedNames = [];

  // ── 第一步：直接比對 CELEBRITY_DB_EN（最可靠）─────────────
  const sortedNames = Object.keys(CELEBRITY_DB_EN).sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    if (chineseText.includes(name) && !usedNames.some(n => name.includes(n) || n.includes(name))) {
      descriptions.push(CELEBRITY_DB_EN[name]);
      usedNames.push(name);
      console.log(`[人物資料庫] "${name}" 已收集英文描述`);
    }
  }

  // ── 第二步：分割法找資料庫之外的候選人名，Wikipedia 查詢 ────
  let cleaned = chineseText;
  for (const v of VERB_PREFIXES) cleaned = cleaned.replace(new RegExp(v, 'g'), ' ');
  const funcPattern = /[的了是在有與和之及也都你我他她它們這那哪什麼怎麼為什麼、，。！？「」【】《》\s]+/g;
  const parts = cleaned.split(funcPattern).filter(Boolean);
  const candidates = [...new Set(parts)].filter(w =>
    w.length >= 2 && w.length <= 4 &&
    /^[\u4e00-\u9fff]+$/.test(w) &&
    !PERSON_STOP_WORDS.has(w) &&
    !CELEBRITY_DB_EN[w] &&
    !usedNames.includes(w)
  );
  if (candidates.length > 0) {
    const lookupResults = await Promise.all(
      candidates.slice(0, 3).map(async name => ({ name, desc: await lookupPersonWikiEN(name) }))
    );
    for (const { name, desc } of lookupResults.filter(r => r.desc)) {
      descriptions.push(desc);
      console.log(`[Wikipedia] "${name}" 已收集描述`);
    }
  }

  return descriptions;
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
  let p = prompt.replace(/\s*--\s*style:.*$/i, '').trim();

  let personDescriptions = [];
  if (hasChinese(p)) {
    // ① 翻譯前：收集英文人物外觀描述（不修改中文提詞）
    personDescriptions = await collectPersonDescriptionsEN(p);
    // ② 翻譯提詞
    p = await translateToEnglish(p);
  }

  // ③ 翻譯後：把英文人物描述前置注入（繞過翻譯，確保關鍵詞精準）
  if (personDescriptions.length > 0) {
    p = personDescriptions.join(', ') + ', ' + p;
    console.log('[人物描述已注入翻譯後提詞]', p.slice(0, 120));
  }

  return enhancePrompt(p, style);
}

// 檢查並扣除點數的 middleware（支援批量生成）
function checkCredits(type) {
  return async (req, res, next) => {
    const base = CREDIT_COST[type] || 2;
    const count = Math.min(Math.max(parseInt(req.body.image_count) || 1, 1), 8);
    const cost = base * count;
    const user = await db.findOne('users', { id: req.user.id });
    if (!user || (user.credits || 0) < cost) {
      return res.status(402).json({
        error: `點數不足！此操作需要 ${cost} 點（${count} 張 × ${base} 點），你目前有 ${user?.credits || 0} 點`,
        credits: user?.credits || 0,
        required: cost
      });
    }
    req.creditCost = cost;
    req.imageCount = count;
    next();
  };
}

// 社群模型（直接使用用戶選擇的模型，不走 quality 對應）
const COMMUNITY_MODEL_IDS = new Set(['sdxl', 'dreamshaper-xl', 'realistic-vision', 'anything-v5', 'deliberate-v2']);

// 文字生成圖片
router.post('/text-to-image', authMiddleware, checkCredits('text-to-image'), async (req, res) => {
  const { prompt, negative_prompt, width = 1024, height = 1024, style = 'none', quality = 'standard', model: reqModel = '' } = req.body;
  const imageCount = req.imageCount || 1; // 批量數量（1~8）

  // NovitaAI / 社群模型直接使用；FLUX 系列走 quality 對應
  let model;
  if (reqModel in NOVITA_MODELS || COMMUNITY_MODEL_IDS.has(reqModel)) {
    model = reqModel;
  } else {
    const qParams = QUALITY_PARAMS[quality] || QUALITY_PARAMS['standard'];
    model = qParams.model;
  }
  if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });

  // 建立第一筆 processing 記錄
  const id = uuidv4();
  await db.insertOne('generations', {
    id, user_id: req.user.id, type: 'text-to-image',
    prompt, negative_prompt: negative_prompt || null, model,
    width, height, image_url: null, status: 'processing',
    is_public: false, credit_cost: req.creditCost,
    created_at: new Date().toISOString()
  });

  // 扣點（已在 checkCredits 計算 count × base）
  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const finalPrompt = await preparePrompt(prompt, style);
    const styleNeg = STYLE_NEGATIVE[style] || '';
    const fullNeg = [negative_prompt, styleNeg].filter(Boolean).join(', ');

    // ── NovitaAI 分支 ────────────────────────────────────────
    if (model in NOVITA_MODELS) {
      const imageUrls = await novitaTextToImage(NOVITA_MODELS[model], finalPrompt, fullNeg, width, height, imageCount);
      // 儲存第一張到原始 id，額外張各建一筆記錄
      await db.updateOne('generations', { id }, { image_url: imageUrls[0], status: 'completed', prompt_en: finalPrompt });
      for (let i = 1; i < imageUrls.length; i++) {
        await db.insertOne('generations', {
          id: uuidv4(), user_id: req.user.id, type: 'text-to-image',
          prompt, negative_prompt: negative_prompt || null, model,
          width, height, image_url: imageUrls[i], status: 'completed',
          is_public: false, credit_cost: 0, prompt_en: finalPrompt,
          created_at: new Date().toISOString()
        });
      }
      const updatedUser = await db.findOne('users', { id: req.user.id });
      return res.json({ id, image_url: imageUrls[0], image_urls: imageUrls, status: 'completed', credits: updatedUser.credits });
    }

    // ── Replicate 分支 ────────────────────────────────────────
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const modelId = MODELS[model] || MODELS['flux-schnell'];
    let input = { prompt: finalPrompt };
    if (FLUX_MODELS.has(model)) {
      input.aspect_ratio = getAspectRatio(width, height);
      input.num_outputs = imageCount;
    } else {
      const maxRes = SD15_MODELS.has(model) ? 768 : 1024;
      input.width  = Math.min(width,  maxRes);
      input.height = Math.min(height, maxRes);
      if (fullNeg) input.negative_prompt = fullNeg;
      input.guidance_scale      = 7.5;
      input.num_inference_steps = SD15_MODELS.has(model) ? 30 : 25;
      input.num_outputs         = imageCount;
    }

    await db.updateOne('generations', { id }, { prompt_en: finalPrompt });
    const output = await replicate.run(modelId, { input });
    const imageUrls = Array.isArray(output) ? output.map(String) : [String(output)];

    await db.updateOne('generations', { id }, { image_url: imageUrls[0], status: 'completed' });
    for (let i = 1; i < imageUrls.length; i++) {
      await db.insertOne('generations', {
        id: uuidv4(), user_id: req.user.id, type: 'text-to-image',
        prompt, model, width, height, image_url: imageUrls[i], status: 'completed',
        is_public: false, credit_cost: 0, created_at: new Date().toISOString()
      });
    }
    const updatedUser = await db.findOne('users', { id: req.user.id });
    res.json({ id, image_url: imageUrls[0], image_urls: imageUrls, status: 'completed', credits: updatedUser.credits });

  } catch (err) {
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
  const { prompt, strength = 0.7, model = 'novita-majicmix', width = 768, height = 768 } = req.body;
  if (!prompt) return res.status(400).json({ error: '請輸入提示詞' });
  if (!req.file) return res.status(400).json({ error: '請上傳圖片' });

  // 選擇 NovitaAI 模型名稱：若前端傳來的 model 是 novita 系列就用它，否則預設 majicmix
  const novitaModelKey = (model in NOVITA_MODELS) ? model : 'novita-majicmix';
  const novitaModelName = NOVITA_MODELS[novitaModelKey];

  const id = uuidv4();
  await db.insertOne('generations', {
    id, user_id: req.user.id, type: 'image-to-image',
    prompt, model: novitaModelKey, image_url: null, status: 'processing',
    is_public: false,
    credit_cost: req.creditCost, created_at: new Date().toISOString()
  });

  const user = await db.findOne('users', { id: req.user.id });
  await db.updateOne('users', { id: req.user.id }, { credits: user.credits - req.creditCost });

  try {
    const finalPrompt = await preparePrompt(prompt);
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${imageData.toString('base64')}`;

    const imageUrl = await novitaImageToImage(
      novitaModelName, finalPrompt, base64Image,
      parseFloat(strength), parseInt(width, 10) || 768, parseInt(height, 10) || 768
    );

    fs.unlinkSync(req.file.path);
    await db.updateOne('generations', { id }, { image_url: imageUrl, status: 'completed', prompt_en: finalPrompt });
    const updatedUser = await db.findOne('users', { id: req.user.id });
    res.json({ id, image_url: imageUrl, status: 'completed', credits: updatedUser.credits });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const u = await db.findOne('users', { id: req.user.id });
    await db.updateOne('users', { id: req.user.id }, { credits: u.credits + req.creditCost });
    await db.updateOne('generations', { id }, { status: 'failed' });
    console.error('[img2img] 失敗:', err.message);
    let userMsg = '圖片生成失敗：' + err.message;
    if (err.message.includes('NOVITA_API_KEY')) userMsg = 'NovitaAI API Key 未設定，請至 Railway 環境變數新增 NOVITA_API_KEY';
    res.status(500).json({ error: userMsg });
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
      is_public: false,
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
      is_public: false,
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
        is_public: false,
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

// ── 每日獎勵：公開作品獲得點數 ──────────────────────────────────
// GET /generate/daily-reward-status
router.get('/daily-reward-status', authMiddleware, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const allGens = await db.find('generations', { user_id: req.user.id }) || [];
  const todayCount = allGens.filter(g =>
    g.reward_given && g.published_at && g.published_at.slice(0, 10) === today
  ).length;
  res.json({ today_count: todayCount, daily_limit: 5 });
});

// POST /generate/publish/:id — 公開作品 + 領取獎勵
router.post('/publish/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const gen = await db.findOne('generations', { id, user_id: req.user.id });
  if (!gen) return res.status(404).json({ error: '找不到此作品' });
  if (gen.reward_given) return res.status(400).json({ error: '此作品已領取過獎勵' });
  if (!gen.image_url && !gen.video_url) return res.status(400).json({ error: '作品尚未生成完成' });

  const today = new Date().toISOString().slice(0, 10);
  const allGens = await db.find('generations', { user_id: req.user.id }) || [];
  const todayCount = allGens.filter(g =>
    g.reward_given && g.published_at && g.published_at.slice(0, 10) === today
  ).length;
  if (todayCount >= 5) {
    return res.status(400).json({ error: '今日已達每日獎勵上限（5 次）', today_count: 5, daily_limit: 5 });
  }

  const isVideo = gen.type === 'text-to-video' || gen.type === 'image-to-video';
  const reward = isVideo ? 2 : 1;

  await db.updateOne('generations', { id }, {
    is_public: true, reward_given: true, published_at: new Date().toISOString(),
  });

  const user = await db.findOne('users', { id: req.user.id });
  const newCredits = (user.credits || 0) + reward;
  await db.updateOne('users', { id: req.user.id }, { credits: newCredits });

  res.json({ success: true, reward, credits: newCredits, today_count: todayCount + 1, daily_limit: 5 });
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
