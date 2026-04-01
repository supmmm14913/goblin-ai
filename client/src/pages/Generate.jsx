import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Upload, X, Download, Settings, ChevronDown, ChevronUp, Coins, Wand2, Shuffle } from 'lucide-react'

// ── 風格預設 ──────────────────────────────────────────────────────
const STYLES = [
  { id: 'none',       label: '無風格',    emoji: '✨', keywords: '' },
  { id: 'realistic',  label: '寫實',      emoji: '📸', keywords: 'photorealistic, hyperrealistic, DSLR photo, sharp focus, natural lighting, 8k resolution' },
  { id: 'anime',      label: '動漫',      emoji: '🎌', keywords: 'anime style, manga art, Studio Ghibli, vibrant colors, cel shading, Japanese animation' },
  { id: '3d',         label: '3D 渲染',   emoji: '🎲', keywords: '3D render, octane render, cinema 4D, blender, volumetric lighting, ray tracing, ultra detailed 3D' },
  { id: '2d',         label: '2D 插畫',   emoji: '🎨', keywords: '2D illustration, flat design, digital art, vector art, clean lines, colorful' },
  { id: 'western',    label: '歐美風',    emoji: '🦅', keywords: 'western comic style, Marvel comic, DC comic, bold lines, dynamic pose, American cartoon' },
  { id: 'watercolor', label: '水彩',      emoji: '🖌️', keywords: 'watercolor painting, soft brushstrokes, pastel colors, artistic, dreamy watercolor effect' },
  { id: 'oilpaint',   label: '油畫',      emoji: '🖼️', keywords: 'oil painting, classical art, Renaissance style, rich textures, impasto technique, museum quality' },
  { id: 'pixel',      label: '像素',      emoji: '👾', keywords: 'pixel art, 16-bit style, retro game art, pixelated, nostalgic video game aesthetic' },
  { id: 'cyberpunk',  label: '賽博朋克',  emoji: '🌃', keywords: 'cyberpunk, neon lights, futuristic city, dark atmosphere, rain reflections, blade runner aesthetic' },
  { id: 'fantasy',    label: '奇幻',      emoji: '🧙', keywords: 'fantasy art, magical atmosphere, epic fantasy, mystical, enchanted, detailed fantasy illustration' },
  { id: 'sketch',     label: '素描',      emoji: '✏️', keywords: 'pencil sketch, black and white drawing, detailed linework, concept art sketch, hand-drawn' },
  { id: 'chibi',      label: 'Q版',       emoji: '🐱', keywords: 'chibi style, cute kawaii, super deformed, big eyes, adorable character design, SD style' },
  { id: 'cinematic',  label: '電影感',    emoji: '🎬', keywords: 'cinematic photography, movie still, dramatic lighting, shallow depth of field, golden hour, lens flare' },
  { id: 'ukiyo',      label: '浮世繪',    emoji: '🌸', keywords: 'ukiyo-e style, Japanese woodblock print, traditional Japanese art, Hokusai style, flat colors, bold outlines' },
]

const VIDEO_STYLES = [
  { id: 'none',      label: '無風格',   emoji: '✨', keywords: '' },
  { id: 'cinematic', label: '電影感',   emoji: '🎬', keywords: 'cinematic quality, film grain, dramatic lighting, movie-like' },
  { id: 'anime',     label: '動漫',     emoji: '🎌', keywords: 'anime style, smooth animation, vibrant colors, Japanese animation quality' },
  { id: 'realistic', label: '寫實',     emoji: '📸', keywords: 'photorealistic, hyperrealistic, natural lighting, high quality footage' },
  { id: 'slowmo',    label: '慢動作',   emoji: '⏱️', keywords: 'slow motion, time lapse, smooth movement, ultra high frame rate' },
  { id: 'fantasy',   label: '奇幻',     emoji: '🧙', keywords: 'fantasy visual effects, magical atmosphere, epic fantasy cinematography' },
]

const TABS = [
  { id: 'text-image',  label: '文字→圖片', icon: '🖼️', cost: 2 },
  { id: 'image-image', label: '圖→圖',     icon: '🔄', cost: 3 },
  { id: 'inpaint',     label: '局部重繪',   icon: '🎭', cost: 3, badge: 'NEW' },
  { id: 'text-video',  label: '文字→影片', icon: '🎬', cost: 5, badge: 'Kling 3.0' },
  { id: 'image-video', label: '圖→影片',   icon: '✨', cost: 5, badge: 'Kling 3.0' },
]

// 品質等級（圖片生成專用，費用統一）
const QUALITY_LEVELS = [
  { id: 'standard', label: '標準', desc: '快速生成', cost: 2, emoji: '⚡' },
  { id: 'fine',     label: '精細', desc: '高品質',   cost: 2, emoji: '🎨' },
  { id: 'ultra',    label: '超精細', desc: '細節豐富', cost: 2, emoji: '✨' },
  { id: 'premium',  label: '頂級',  desc: '最高畫質', cost: 2, emoji: '💎' },
]

const MODELS = [
  { id: 'flux-schnell',     name: 'FLUX Schnell',      desc: '最快速 · 推薦',  badge: '推薦' },
  { id: 'flux-dev',         name: 'FLUX Dev',           desc: '高品質細節' },
  { id: 'flux-1.1-pro',     name: 'FLUX 1.1 Pro',      desc: '頂級 · 最新',   badge: 'PRO' },
  { id: 'sdxl',             name: 'SDXL',               desc: '通用多風格' },
  { id: 'dreamshaper-xl',   name: 'Dreamshaper XL',    desc: '奇幻 / 藝術' },
  { id: 'realistic-vision', name: 'Realistic Vision',  desc: '攝影寫實人像' },
  { id: 'anything-v5',      name: 'Anything V5',        desc: '日系動漫' },
  { id: 'deliberate-v2',    name: 'Deliberate V2',      desc: '多風格混合' },
]

// ── 模型分類（已逐一實測 NovitaAI txt2img 可用）──────────────────
const MODEL_CATEGORIES = [
  {
    id: 'flux', label: 'FLUX（快速）', emoji: '⚡',
    models: [
      { id: 'flux-schnell',   name: 'FLUX Schnell',  desc: '最快速（不支援 NSFW）', badge: '推薦' },
      { id: 'flux-dev',       name: 'FLUX Dev',       desc: '高品質細節（不支援 NSFW）' },
      { id: 'flux-1.1-pro',   name: 'FLUX 1.1 Pro',  desc: '頂級畫質（不支援 NSFW）', badge: 'PRO' },
    ]
  },
  {
    id: 'general', label: '寫實 / 通用 ✅NSFW', emoji: '📸',
    models: [
      { id: 'novita-epic-realism',    name: 'Epic Realism',           desc: '超寫實自然光 · 推薦 NSFW', badge: '推薦' },
      { id: 'novita-realistic-afmix', name: 'Realistic AfMix',        desc: '寫實混合風格' },
      { id: 'novita-epic-photo-xpp',  name: 'Epic Photogasm X++',     desc: '超高清攝影人像' },
      { id: 'novita-epic-photo-x',    name: 'Epic Photogasm X',       desc: '攝影級畫質' },
      { id: 'novita-majicmix',        name: 'Majic Mix Realistic v6', desc: '魔幻寫實混合' },
      { id: 'novita-sdxl',            name: 'SDXL Base 1.0',          desc: '通用高解析度' },
    ]
  },
  {
    id: 'anime', label: '動漫 / 插畫 ✅NSFW', emoji: '🎌',
    models: [
      { id: 'novita-meina-hentai', name: 'Meina Hentai V4', desc: '日系成人動漫', badge: '18+' },
      { id: 'novita-rev-animated', name: 'Rev Animated',    desc: '動畫混合風格' },
    ]
  },
  {
    id: 'furry', label: 'Furry / 獸人 ✅NSFW', emoji: '🐾',
    models: [
      { id: 'novita-furry', name: 'Yiffymix Furry', desc: '獸人通用 · 支援 NSFW', badge: 'NSFW' },
    ]
  },
]

const VIDEO_T2V_MODELS = [
  { id: 'kling-v3',  name: 'Kling V3',       desc: '快速生成', badge: '推薦' },
  { id: 'hunyuan',   name: 'Hunyuan Video',  desc: '高品質影片', badge: 'NEW' },
]

const VIDEO_I2V_MODELS = [
  { id: 'kling-omni', name: 'Kling V3 Omni',      desc: '圖轉影片', badge: '推薦' },
  { id: 'svd',        name: 'Stable Video Diff.', desc: '平滑短片', badge: 'NEW' },
]

const SIZES = [
  { label: '1:1',  w: 1024, h: 1024 },
  { label: '16:9', w: 1344, h: 768 },
  { label: '9:16', w: 768,  h: 1344 },
  { label: '4:3',  w: 1152, h: 896 },
]

const EXAMPLE_PROMPTS = {
  realistic:  ['一個男孩在溜狗，背景是台北101', '日落時分海邊的漁船', '城市夜景中的年輕女性'],
  anime:      ['銀髮少女，魔法森林，奇幻盔甲', '夏日海灘的少年冒險家', '賞楓的和服少女'],
  '3d':       ['3D賽車比賽，動感十足', '未來城市，懸浮汽車', '宇宙空間站內部'],
  cinematic:  ['雨夜霓虹燈下的都市偵探', '史詩戰場上的孤獨武士', '深海中的神秘探險'],
  fantasy:    ['乘坐飛龍的法師', '魔法城堡與彩虹', '精靈女王的皇宮'],
  none:       ['一個男孩在溜狗，背景是總統府', '台灣夜市的熱鬧景象', '山頂看日出的登山者'],
}

const RANDOM_SUBJECTS = [
  '一位武士站在櫻花樹下',
  '未來城市中飛行的汽車',
  '深海中游泳的美人魚',
  '魔法師在城堡塔頂施法',
  '太空人在月球表面探索',
]

export default function Generate() {
  const { user, updateCredits } = useAuth()
  const [tab, setTab] = useState('text-image')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [style, setStyle] = useState('none')
  const [model, setModel] = useState('novita-epic-realism')
  const [quality, setQuality] = useState('standard')
  const [size, setSize] = useState(SIZES[0])
  const [strength, setStrength] = useState(0.7)
  const [inputImage, setInputImage] = useState(null)
  const [inputImagePreview, setInputImagePreview] = useState(null)
  const [result, setResult] = useState(null)
  const [resultType, setResultType] = useState('image')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [videoModel, setVideoModel] = useState('kling-v3')
  const [maskImage, setMaskImage] = useState(null)
  const [maskPreview, setMaskPreview] = useState(null)
  const [imageCount, setImageCount] = useState(1)
  const [results, setResults] = useState([]) // 批量結果

  const onDrop = useCallback((files) => {
    const file = files[0]; if (!file) return
    setInputImage(file)
    setInputImagePreview(URL.createObjectURL(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1, disabled: loading
  })

  const onDropMask = useCallback((files) => {
    const file = files[0]; if (!file) return
    setMaskImage(file)
    setMaskPreview(URL.createObjectURL(file))
  }, [])
  const { getRootProps: getMaskRootProps, getInputProps: getMaskInputProps, isDragActive: isMaskDragActive } = useDropzone({
    onDrop: onDropMask, accept: { 'image/*': [] }, maxFiles: 1, disabled: loading
  })

  // 取得目前選中模型的顯示資訊
  const allModelsList = MODEL_CATEGORIES.flatMap(c => c.models)
  const currentModelInfo = allModelsList.find(m => m.id === model) || MODELS.find(m => m.id === model)

  const currentTab  = TABS.find(t => t.id === tab)
  const needsImage  = tab === 'image-image' || tab === 'image-video' || tab === 'inpaint'
  const isVideo     = tab === 'text-video'  || tab === 'image-video'
  const isImage     = tab === 'text-image'  || tab === 'image-image' || tab === 'inpaint'
  const activeStyles = isVideo ? VIDEO_STYLES : STYLES
  const currentStyle = activeStyles.find(s => s.id === style) || activeStyles[0]
  const currentQuality = QUALITY_LEVELS.find(q => q.id === quality) || QUALITY_LEVELS[0]
  // 實際消耗點數：圖片 = 品質點數 × 張數，影片固定 5 點
  const baseCost = isImage ? currentQuality.cost : currentTab.cost
  const actualCost = isImage ? baseCost * imageCount : baseCost

  const examples = EXAMPLE_PROMPTS[style] || EXAMPLE_PROMPTS.none

  const randomPrompt = () => {
    const subject = RANDOM_SUBJECTS[Math.floor(Math.random() * RANDOM_SUBJECTS.length)]
    setPrompt(subject)
  }

  const handleGenerate = async () => {
    if (!prompt.trim() && tab !== 'image-video') return toast.error('請輸入提示詞')
    if (needsImage && !inputImage) return toast.error('請上傳參考圖片')
    if (tab === 'inpaint' && !maskImage) return toast.error('請上傳遮罩圖片')
    if ((user?.credits ?? 0) < actualCost) {
      return toast.error(`點數不足！需要 ${actualCost} 點，目前剩 ${user?.credits ?? 0} 點`)
    }

    setLoading(true); setResult(null); setResults([]); setLoadingProgress(0)
    const hasChinese = /[\u4e00-\u9fff]/.test(prompt)
    const isNovita = model.startsWith('novita-')
    const countLabel = isImage && imageCount > 1 ? ` × ${imageCount} 張` : ''
    setLoadingMsg(hasChinese ? '🌐 偵測到中文，正在翻譯...' : isVideo ? '📤 提交影片任務...' : isNovita ? `🎨 NovitaAI 生成中${countLabel}（約 ${imageCount * 30}-${imageCount * 90} 秒）...` : `✨ 生成中${countLabel}...`)

    // Optimistic credit deduction
    const previousCredits = user?.credits ?? 0
    updateCredits(Math.max(0, previousCredits - actualCost))

    try {
      const styleKeywords = currentStyle.keywords
      const styledPrompt = styleKeywords && prompt ? `${prompt} -- style: ${styleKeywords}` : prompt

      // ── 圖片生成（同步）
      if (tab === 'text-image') {
        const res = await axios.post('/generate/text-to-image', {
          prompt: styledPrompt, negative_prompt: negativePrompt,
          model, width: size.w, height: size.h, style, quality, image_count: imageCount
        })
        const urls = res.data.image_urls || [res.data.image_url]
        setResults(urls); setResult(urls[0]); setResultType('image')
        if (res.data.credits !== undefined) updateCredits(res.data.credits)
        toast.success(urls.length > 1 ? `成功生成 ${urls.length} 張圖片！` : '圖片生成成功！')
        setLoading(false); setLoadingMsg('')

      } else if (tab === 'image-image') {
        const fd = new FormData()
        fd.append('image', inputImage); fd.append('prompt', styledPrompt)
        fd.append('strength', strength); fd.append('style', style); fd.append('quality', quality)
        const res = await axios.post('/generate/image-to-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setResult(res.data.image_url); setResultType('image')
        if (res.data.credits !== undefined) updateCredits(res.data.credits)
        toast.success('圖片生成成功！')
        setLoading(false); setLoadingMsg('')

      // ── 局部重繪（同步）
      } else if (tab === 'inpaint') {
        if (!maskImage) return toast.error('請上傳遮罩圖片')
        const fd = new FormData()
        fd.append('image', inputImage)
        fd.append('mask', maskImage)
        fd.append('prompt', styledPrompt)
        fd.append('style', style)
        const res = await axios.post('/generate/inpaint', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setResult(res.data.image_url); setResultType('image')
        if (res.data.credits !== undefined) updateCredits(res.data.credits)
        toast.success('局部重繪完成！')
        setLoading(false); setLoadingMsg('')

      // ── 影片生成（非同步輪詢）
      } else {
        let submitRes
        if (tab === 'text-video') {
          submitRes = await axios.post('/generate/text-to-video', { prompt: styledPrompt, style, video_model: videoModel })
        } else {
          const fd = new FormData()
          fd.append('image', inputImage)
          if (prompt) fd.append('prompt', styledPrompt)
          fd.append('style', style)
          fd.append('video_model', videoModel)
          submitRes = await axios.post('/generate/image-to-video', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }

        const { prediction_id } = submitRes.data
        setLoadingMsg('🎬 AI 正在生成影片（約 1-3 分鐘）...')

        // 每 5 秒輪詢一次，最多等 5 分鐘
        let elapsed = 0
        const pollInterval = setInterval(async () => {
          elapsed += 5
          const pct = Math.min(88, Math.round(elapsed / 180 * 100))
          setLoadingProgress(pct)
          setLoadingMsg(`🎬 AI 生成影片中... 已等待 ${elapsed}s`)
          try {
            const poll = await axios.get(`/generate/job/${prediction_id}`)
            if (poll.data.status === 'completed') {
              clearInterval(pollInterval)
              setResult(poll.data.video_url); setResultType('video')
              setLoadingProgress(100)
              if (poll.data.credits !== undefined) updateCredits(poll.data.credits)
              toast.success('🎉 影片生成成功！')
              setLoading(false); setLoadingMsg('')
            } else if (poll.data.status === 'failed') {
              clearInterval(pollInterval)
              toast.error('影片生成失敗：' + (poll.data.error || '請重試'))
              setLoading(false); setLoadingMsg('')
            }
          } catch { /* 網路問題繼續等 */ }
          if (elapsed >= 300) {
            clearInterval(pollInterval)
            toast.error('影片生成超時（5分鐘），點數已退還')
            setLoading(false); setLoadingMsg('')
          }
        }, 5000)
      }
    } catch (err) {
      updateCredits(previousCredits) // rollback on failure
      toast.error(err.response?.data?.error || '生成失敗', { duration: 6000 })
      setLoading(false); setLoadingMsg('')
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">

      {/* ── 左側控制面板 ─────────────────────────────── */}
      <div className="w-[360px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1 pb-4">

        {/* Tab */}
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-1 grid grid-cols-4 gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setStyle('none'); setVideoModel(t.id === 'image-video' ? 'kling-omni' : 'kling-v3') }}
              className={`relative flex flex-col items-center py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
              <span className="text-lg mb-0.5">{t.icon}</span>
              <span className="text-[10px]">{t.label.split('→')[0]}</span>
              {t.label.includes('→') && <span className="text-[10px] text-white/30">→{t.label.split('→')[1]}</span>}
              {t.badge && <span className="absolute -top-1 -right-1 badge-pink text-[9px] px-1 py-0">{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* 點數 */}
        <div className="flex items-center justify-between px-1">
          <span className="text-white/30 text-xs">消耗 {currentTab.cost} 點 / 次</span>
          <Link to="/pricing" className="flex items-center gap-1 text-xs hover:underline" style={{color:'#c8ff3e'}}>
            <Coins size={11} />{user?.credits ?? 0} 點
          </Link>
        </div>

        {/* 圖片上傳 */}
        {needsImage && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/40 mb-2 block">
                {tab === 'inpaint' ? '① 原始圖片' : '參考圖片'}
              </label>
              {inputImagePreview ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-[#111114]">
                  <img src={inputImagePreview} alt="preview" className="w-full h-full object-contain" />
                  <button onClick={() => { setInputImage(null); setInputImagePreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-[#c8ff3e]/60 bg-[#c8ff3e]/5' : 'border-white/10 hover:border-white/20'}`}>
                  <input {...getInputProps()} />
                  <Upload size={20} className="mx-auto mb-2 text-white/20" />
                  <p className="text-white/30 text-xs">拖放或點擊上傳圖片</p>
                </div>
              )}
            </div>

            {/* 遮罩上傳（僅局部重繪）*/}
            {tab === 'inpaint' && (
              <div>
                <label className="text-xs text-white/40 mb-1 block">② 遮罩圖片（白色區域 = 重繪範圍）</label>
                <p className="text-[10px] text-white/25 mb-2">用 Photoshop / 小畫家 將要重繪的區域塗白，其餘保留黑色</p>
                {maskPreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-[#111114]">
                    <img src={maskPreview} alt="mask" className="w-full h-full object-contain" />
                    <button onClick={() => { setMaskImage(null); setMaskPreview(null) }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div {...getMaskRootProps()} className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${isMaskDragActive ? 'border-purple-400/60 bg-purple-500/5' : 'border-white/10 hover:border-purple-400/30'}`}>
                    <input {...getMaskInputProps()} />
                    <p className="text-2xl mb-1">🎭</p>
                    <p className="text-white/30 text-xs">上傳遮罩圖片</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 提示詞 */}
        {tab !== 'image-video' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/40">提示詞（中文 / 英文 均可）</label>
              <button onClick={randomPrompt} className="text-xs hover:underline flex items-center gap-1" style={{color:'#c8ff3e'}}>
                <Shuffle size={10} />隨機
              </button>
            </div>
            <textarea className="input-field resize-none" rows={3}
              placeholder={isVideo ? '描述你想要的影片內容，例如：海浪拍打礁石，夕陽西下...' : '描述你想要的圖片，例如：一個男孩在溜狗，背景是總統府...'}
              value={prompt} onChange={e => setPrompt(e.target.value)} disabled={loading}
              maxLength={1024} />
            {/* 字數計數器 */}
            {(() => {
              const len = prompt.length
              const limit = 1024
              const remaining = limit - len
              const pct = len / limit
              const color = pct >= 1 ? '#ef4444' : pct >= 0.9 ? '#f97316' : pct >= 0.75 ? '#eab308' : 'rgba(255,255,255,0.2)'
              return (
                <div className="flex justify-end items-center mt-1 gap-1.5">
                  {pct >= 0.75 && (
                    <span style={{ color, fontSize: 10 }}>
                      {pct >= 1 ? '⛔ 已達上限！' : `⚠️ 還剩 ${remaining} 字`}
                    </span>
                  )}
                  <span style={{ color, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                    {len} / {limit}
                  </span>
                </div>
              )
            })()}

            {/* 範例提示詞 */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {examples.map((p, i) => (
                <button key={i} onClick={() => setPrompt(p)} disabled={loading}
                  className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/8 text-white/40 hover:text-white px-2 py-1 rounded-lg transition-colors truncate max-w-[150px]"
                  title={p}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── 風格選擇器 ── */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">
            風格選擇
            {style !== 'none' && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{background:'rgba(200,255,62,0.15)', color:'#c8ff3e'}}>
                {currentStyle.emoji} {currentStyle.label} 已套用
              </span>
            )}
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {activeStyles.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                  style === s.id
                    ? 'border-[#c8ff3e]/50 bg-[#c8ff3e]/10'
                    : 'border-white/8 bg-[#111114] hover:border-white/20'
                }`}>
                <span className="text-lg">{s.emoji}</span>
                <span className={`text-[9px] font-medium leading-tight ${style === s.id ? 'text-neon' : 'text-white/40'}`}
                  style={style === s.id ? {color:'#c8ff3e'} : {}}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 影片模型選擇 */}
        {isVideo && (
          <div>
            <label className="text-xs text-white/40 mb-2 block">影片模型</label>
            <div className="grid grid-cols-2 gap-2">
              {(tab === 'text-video' ? VIDEO_T2V_MODELS : VIDEO_I2V_MODELS).map(m => (
                <button key={m.id} onClick={() => setVideoModel(m.id)}
                  className={`relative p-2.5 rounded-xl text-left text-xs border transition-all ${videoModel === m.id ? 'border-[#c8ff3e]/40 bg-[#c8ff3e]/5 text-white' : 'border-white/8 bg-[#111114] text-white/40 hover:border-white/15'}`}>
                  {m.badge && <span className="absolute -top-1.5 -right-1.5 badge-neon text-[8px] px-1">{m.badge}</span>}
                  <div className="font-bold text-[11px]">{m.name}</div>
                  <div className="text-[10px] mt-0.5 text-white/30">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 模型選擇（僅圖片）*/}
        {tab === 'text-image' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-white/40">模型</label>
              {currentModelInfo?.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${currentModelInfo.badge === '18+' || currentModelInfo.badge === 'NSFW' ? 'bg-red-500/20 text-red-400' : 'bg-[#c8ff3e]/15'}`}
                  style={currentModelInfo.badge !== '18+' && currentModelInfo.badge !== 'NSFW' ? {color:'#c8ff3e'} : {}}>
                  {currentModelInfo.badge}
                </span>
              )}
            </div>

            {/* 原生下拉選單 */}
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={loading}
              className="w-full bg-[#111114] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#c8ff3e]/40 cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff40' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {MODEL_CATEGORIES.map(cat => (
                <optgroup key={cat.id} label={`${cat.emoji} ${cat.label}`}>
                  {cat.models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.badge ? ` [${m.badge}]` : ''} — {m.desc}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* 目前選中模型說明 */}
            {currentModelInfo && (
              <p className="text-[10px] text-white/25 mt-1.5 px-1">{currentModelInfo.desc}</p>
            )}

            {/* FLUX / Replicate 不支援 NSFW 警告 */}
            {!model.startsWith('novita-') && (
              <div className="mt-2 flex items-start gap-1.5 bg-yellow-500/8 border border-yellow-500/20 rounded-lg px-2.5 py-2">
                <span className="text-yellow-400 text-xs shrink-0">⚠️</span>
                <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                  此模型走 Replicate，<strong>不支援 NSFW 內容</strong>。<br />
                  生成 18+ 圖片請選「📸 寫實/通用」或「🔞 成人/寫實」分類中的模型。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 尺寸（圖片）*/}
        {tab === 'text-image' && (
          <div>
            <label className="text-xs text-white/40 mb-2 block">尺寸</label>
            <div className="grid grid-cols-4 gap-1.5">
              {SIZES.map(s => (
                <button key={s.label} onClick={() => setSize(s)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${size.label === s.label ? 'border-[#c8ff3e]/40 bg-[#c8ff3e]/5 text-neon' : 'border-white/8 bg-[#111114] text-white/40 hover:border-white/15'}`}
                  style={size.label === s.label ? {color:'#c8ff3e'} : {}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 品質選擇器（圖片生成專用） */}
        {isImage && (
          <div>
            <label className="text-xs text-white/40 mb-2 block">🎯 圖片品質</label>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_LEVELS.map(q => (
                <button key={q.id} onClick={() => setQuality(q.id)} disabled={loading}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    quality === q.id
                      ? 'border-[#c8ff3e] bg-[#c8ff3e]/10 text-[#c8ff3e]'
                      : 'border-white/10 text-white/50 hover:border-white/30'
                  }`}>
                  <span className="text-lg">{q.emoji}</span>
                  <span>{q.label}</span>
                  <span className={`text-[10px] font-black ${quality === q.id ? 'text-[#c8ff3e]' : 'text-white/30'}`}>{q.cost} 點</span>
                  <span className="text-[9px] opacity-60">{q.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 進階設定 */}
        <div>
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
            <Settings size={11} />進階設定 {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showAdvanced && (
            <div className="mt-2 bg-[#111114] border border-white/8 rounded-xl p-3 space-y-3">
              {tab === 'text-image' && (
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">負面提示詞（排除不想要的元素）</label>
                  <textarea className="input-field resize-none text-xs" rows={2}
                    placeholder="blurry, ugly, low quality, watermark, extra fingers..."
                    value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} disabled={loading}
                    maxLength={512} />
                  {negativePrompt.length > 384 && (
                    <div className="flex justify-end mt-0.5">
                      <span style={{ color: negativePrompt.length >= 512 ? '#ef4444' : '#f97316', fontSize: 10 }}>
                        {negativePrompt.length} / 512
                      </span>
                    </div>
                  )}
                </div>
              )}
              {tab === 'image-image' && (
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">變化強度：{Math.round(strength * 100)}%</label>
                  <input type="range" min="0.1" max="1" step="0.05" value={strength}
                    onChange={e => setStrength(parseFloat(e.target.value))} className="w-full accent-[#c8ff3e]" />
                  <div className="flex justify-between text-[10px] text-white/20 mt-1"><span>接近原圖</span><span>完全重生成</span></div>
                </div>
              )}
              {/* 風格關鍵詞預覽 */}
              {style !== 'none' && (
                <div>
                  <label className="text-xs text-white/40 mb-1 block">套用的風格關鍵詞</label>
                  <p className="text-[10px] text-white/20 bg-black/30 rounded-lg p-2 leading-relaxed">{currentStyle.keywords}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 批量生成選擇器（僅圖片）*/}
        {isImage && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40 shrink-0">生成張數</label>
            <div className="flex gap-1.5 flex-1">
              {[1, 2, 4, 8].map(n => (
                <button key={n} onClick={() => setImageCount(n)} disabled={loading}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${imageCount === n ? 'border-[#c8ff3e]/60 bg-[#c8ff3e]/10 text-[#c8ff3e]' : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/70'}`}>
                  {n === 1 ? '× 1' : `× ${n}`}
                </button>
              ))}
            </div>
            {imageCount > 1 && (
              <span className="text-xs text-white/30 shrink-0">{baseCost}×{imageCount}</span>
            )}
          </div>
        )}

        {/* 生成按鈕 */}
        <button onClick={handleGenerate} disabled={loading}
          className="btn-neon w-full flex items-center justify-center gap-2 py-3 text-sm font-black">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />{loadingMsg}</>
          ) : (
            <><Wand2 size={15} />
              生成{isImage && imageCount > 1 ? ` ${imageCount} 張` : ''} · {actualCost} 點
              {isImage && quality !== 'standard' && <span className="opacity-70 text-xs">({currentQuality.emoji}{currentQuality.label})</span>}
              {style !== 'none' && <span className="opacity-70 text-xs">({currentStyle.emoji}{currentStyle.label})</span>}
            </>
          )}
        </button>

        {(user?.credits ?? 0) < actualCost && (
          <Link to="/pricing" className="block text-center text-xs hover:underline bg-[#c8ff3e]/5 border border-[#c8ff3e]/20 rounded-xl py-2.5" style={{color:'#c8ff3e'}}>
            點數不足？購買點數 →
          </Link>
        )}
      </div>

      {/* ── 右側結果區 ──────────────────────────────── */}
      <div className="flex-1 bg-[#111114] border border-white/8 rounded-2xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
              <div className="absolute inset-0 border-4 border-[#c8ff3e] border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-3 flex items-center justify-center text-2xl">👺</div>
            </div>
            <div className="text-center">
              <p className="font-bold text-white">{isVideo ? 'Goblin AI 生成影片中...' : 'Goblin AI 生成圖片中...'}</p>
              <p className="text-white/30 text-sm mt-1">
                {isVideo ? '影片約需 1-3 分鐘，請耐心等候' : model.startsWith('novita-') ? '約需 30-90 秒，請耐心等候' : '圖片約需 10-30 秒'}
              </p>
              {loadingMsg && (loadingMsg.includes('翻譯') || loadingMsg.includes('NovitaAI')) && (
                <p className="text-xs mt-2 animate-pulse" style={{color:'#c8ff3e'}}>{loadingMsg}</p>
              )}
              {style !== 'none' && (
                <p className="text-xs mt-1 text-white/20">{currentStyle.emoji} 套用 {currentStyle.label} 風格</p>
              )}
            </div>
          </div>
        ) : result ? (
          <div className="flex-1 flex flex-col">
            {/* 標題列 */}
            <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
              {style !== 'none' && (
                <span className="text-xs px-2 py-1 rounded-full border" style={{borderColor:'rgba(200,255,62,0.3)',color:'#c8ff3e',background:'rgba(200,255,62,0.08)'}}>
                  {currentStyle.emoji} {currentStyle.label}
                </span>
              )}
              {results.length > 1 && (
                <span className="text-xs px-2 py-1 rounded-full bg-white/8 text-white/50 border border-white/10">
                  {results.length} 張圖片
                </span>
              )}
            </div>

            {/* 圖片 Grid */}
            <div className={`flex-1 p-2 overflow-y-auto ${results.length > 1 ? 'grid gap-2 ' + (results.length === 2 ? 'grid-cols-2' : 'grid-cols-2') : 'flex items-center justify-center bg-black'}`}
              style={{ minHeight: '300px' }}>
              {resultType === 'video' ? (
                <video src={result} controls autoPlay className="max-w-full max-h-full rounded-xl" />
              ) : results.length > 1 ? (
                results.map((url, i) => (
                  <div key={i} className="relative group aspect-square bg-black rounded-xl overflow-hidden">
                    <img src={url} alt={`生成結果 ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a href={url} download target="_blank" rel="noreferrer"
                        className="bg-[#c8ff3e] text-black text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Download size={11} />下載
                      </a>
                    </div>
                    <span className="absolute top-1.5 left-1.5 bg-black/60 text-white/60 text-[9px] px-1.5 py-0.5 rounded">#{i + 1}</span>
                  </div>
                ))
              ) : (
                <img src={result} alt="生成結果" className="max-w-full max-h-full object-contain rounded-xl" />
              )}
            </div>

            <div className="p-4 border-t border-white/8 flex gap-2">
              {results.length > 1 ? (
                <>
                  <button onClick={async () => {
                    for (let i = 0; i < results.length; i++) {
                      const a = document.createElement('a'); a.href = results[i]
                      a.download = `goblin-ai-${i+1}.jpg`; a.target = '_blank'; a.click()
                      await new Promise(r => setTimeout(r, 300))
                    }
                  }} className="btn-neon flex items-center gap-2 flex-1 justify-center py-2.5 text-sm">
                    <Download size={14} />下載全部 ({results.length} 張)
                  </button>
                  <button onClick={() => { setResult(null); setResults([]) }} className="btn-secondary py-2.5 px-4 text-sm">再生成</button>
                </>
              ) : (
                <>
                  <a href={result} download target="_blank" rel="noreferrer"
                    className="btn-neon flex items-center gap-2 flex-1 justify-center py-2.5 text-sm">
                    <Download size={14} />{resultType === 'video' ? '下載影片' : '下載圖片'}
                  </a>
                  <button onClick={() => { setResult(null); setResults([]) }} className="btn-secondary py-2.5 px-4 text-sm">再生成</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-6xl opacity-10">👺</div>
            <div>
              <p className="text-white/30 font-medium">選擇風格，輸入描述</p>
              <p className="text-white/15 text-sm mt-1">支援中文輸入，AI 自動翻譯生成</p>
            </div>
            {/* 快速風格預覽 */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {STYLES.filter(s => s.id !== 'none').slice(0, 6).map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className="text-xs bg-white/5 border border-white/8 text-white/30 hover:text-white hover:border-white/20 px-3 py-1.5 rounded-full transition-all">
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
