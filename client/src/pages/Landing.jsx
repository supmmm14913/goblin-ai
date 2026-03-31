import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, Coins, Zap, Play, Image, Video, TrendingUp, Laugh } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─── AI 圖片來源 (Pollinations.ai 免費 AI 生圖 API) ───────────────────────────
const ai = (prompt, seed, w = 768, h = 512) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true`

// ─── 熱門展示內容 ───────────────────────────────────────────────────────────────
const TRENDING = [
  {
    id: 1,
    category: '🔥 時事',
    title: '川普關稅戰開打',
    caption: '川普宣佈對全球加徵 100% 關稅，股市崩盤大混亂',
    prompt: 'Donald Trump funny cartoon meme holding giant tariff sign, dollar bills falling from sky, stock market crashing behind him, comic art style, vibrant colorful, dramatic expression',
    seed: 1001,
    tall: true,
    badge: 'TRENDING',
    badgeColor: '#ff3d8a',
    likes: '12.4k',
    type: 'image',
  },
  {
    id: 2,
    category: '😂 搞笑',
    title: '川普跳舞大秀',
    caption: '川普在白宮草坪跳 Gangnam Style，全球瘋傳',
    prompt: 'Donald Trump in funny dance pose on White House lawn, doing Gangnam Style, cartoon meme style, bright colors, confetti everywhere, exaggerated expression, hilarious',
    seed: 2002,
    tall: false,
    badge: 'VIRAL',
    badgeColor: '#c8ff3e',
    likes: '8.7k',
    type: 'image',
  },
  {
    id: 3,
    category: '🤖 AI 時代',
    title: 'AI 搶走我的工作',
    caption: '機器人坐進辦公室，白領員工一臉茫然站在門口',
    prompt: 'Cute robot sitting at office desk looking smug, human workers fired outside the window with cardboard boxes, funny cartoon style, neon cyberpunk office, dramatic lighting',
    seed: 3003,
    tall: false,
    badge: 'HOT',
    badgeColor: '#ff3d8a',
    likes: '5.2k',
    type: 'image',
  },
  {
    id: 4,
    category: '🚀 名人',
    title: '馬斯克移民火星',
    caption: 'Elon Musk 在火星開 Tesla，外星人攔路收過路費',
    prompt: 'Elon Musk driving a Tesla on Mars surface, funny cartoon, alien holding a toll sign in road, red dusty landscape, rockets in background, comedy style, vibrant colors',
    seed: 4004,
    tall: true,
    badge: 'NEW',
    badgeColor: '#4da6ff',
    likes: '9.1k',
    type: 'image',
  },
  {
    id: 5,
    category: '😹 動物迷因',
    title: '貓咪 CEO 開董事會',
    caption: '貓咪穿西裝主持會議，其他貓咪在電腦前一臉嚴肅',
    prompt: 'Cats wearing business suits in corporate boardroom meeting, one cat CEO pointing at presentation screen showing fish chart, other cats on laptops, photorealistic funny, dramatic lighting',
    seed: 5005,
    tall: false,
    badge: '😂 FUNNY',
    badgeColor: '#a855f7',
    likes: '21.3k',
    type: 'image',
  },
  {
    id: 6,
    category: '🎮 電競',
    title: '阿嬤打電動世界冠軍',
    caption: '80歲阿嬤戴著電競耳機，在大舞台上狂打 LOL 奪冠',
    prompt: 'Cute elderly grandmother wearing gaming headset winning esports championship, giant stadium crowd cheering, League of Legends tournament stage, cinematic dramatic lighting, funny wholesome',
    seed: 6006,
    tall: false,
    badge: 'EPIC',
    badgeColor: '#c8ff3e',
    likes: '15.8k',
    type: 'image',
  },
  {
    id: 7,
    category: '🌏 時事',
    title: '關稅戰國際反應',
    caption: '各國領袖開緊急視訊會議，全場一臉生無可戀',
    prompt: 'World leaders in zoom video call looking extremely stressed and exhausted about trade war, funny exaggerated expressions, flags in background, dramatic lighting, cartoon editorial style',
    seed: 7007,
    tall: true,
    badge: 'TRENDING',
    badgeColor: '#ff3d8a',
    likes: '6.9k',
    type: 'image',
  },
  {
    id: 8,
    category: '💃 舞蹈',
    title: 'AI 機器人跳街舞',
    caption: '機器人在時代廣場 breakdance，人類圍觀鼓掌',
    prompt: 'Cool humanoid robot breakdancing in Times Square New York, crowd watching amazed, neon lights reflection, cinematic photo style, dynamic motion blur, spectacular',
    seed: 8008,
    tall: false,
    badge: 'COOL',
    badgeColor: '#4da6ff',
    likes: '11.2k',
    type: 'image',
  },
  {
    id: 9,
    category: '🏆 體育',
    title: '台灣選手奧運奪金',
    caption: '台灣運動員站上奧運最高領獎台，全場瘋狂歡呼',
    prompt: 'Taiwanese athlete standing on Olympic gold medal podium, emotional victory tears, crowd waving flags, dramatic cinematic lighting, ultra detailed, inspirational moment',
    seed: 9009,
    tall: false,
    badge: '🥇 GOLD',
    badgeColor: '#ffd700',
    likes: '33.7k',
    type: 'image',
  },
  {
    id: 10,
    category: '🎨 創意',
    title: '賽博龐克台北夜景',
    caption: '2077年台北，霓虹燈招牌、飛行車、電子夜市',
    prompt: 'Cyberpunk Taipei Taiwan city at night 2077, neon signs in Chinese characters, flying vehicles, night market stalls with holograms, blade runner aesthetic, ultra detailed cinematic',
    seed: 10010,
    tall: true,
    badge: 'ART',
    badgeColor: '#a855f7',
    likes: '18.5k',
    type: 'image',
  },
  {
    id: 11,
    category: '🐶 動物',
    title: '狗狗當總統',
    caption: '金毛獵犬坐在總統辦公桌後面簽署法案，助理是貓',
    prompt: 'Golden retriever dog sitting behind presidential desk signing documents, cat assistant standing next to him, American flag background, realistic funny photo, natural lighting, highly detailed',
    seed: 11011,
    tall: false,
    badge: '😂 LOL',
    badgeColor: '#ff3d8a',
    likes: '44.1k',
    type: 'image',
  },
  {
    id: 12,
    category: '🎬 影片',
    title: '川普跳街舞影片',
    caption: '輸入提示詞，幾秒生成影片',
    prompt: 'Donald Trump breakdancing in Oval Office, secret service agents clapping, funny music video style',
    seed: 12012,
    tall: false,
    badge: '▶ VIDEO',
    badgeColor: '#ff3d8a',
    likes: '7.3k',
    type: 'video',
    isVideo: true,
  },
]

// ─── 跑馬燈標籤 ──────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '🔥 川普關稅戰',  '💃 AI 跳舞影片',  '🤖 機器人搶工作',  '🐱 貓咪 CEO',
  '🚀 馬斯克火星',  '🎮 阿嬤電競冠軍', '🌏 國際貿易戰',   '🏆 奧運奪金',
  '🌃 賽博龐克台北', '🐶 狗狗總統',    '😂 AI 搞笑迷因',  '🎨 AI 藝術創作',
  '⚡ 3 秒生成圖片', '🎬 Kling 3.0 影片', '✨ FLUX 1.1 Pro',
]

// ─── 模型能力展示 ─────────────────────────────────────────────────────────────
const MODEL_SHOWCASE = [
  {
    icon: '🖼️',
    name: 'FLUX 1.1 Pro',
    tag: '文字生成圖片',
    desc: '最新旗艦模型，輸入描述 2 秒出圖，任何風格任何場景',
    cost: '2 點/張',
    badgeColor: '#c8ff3e',
    prompt: 'Beautiful Japanese woman in kimono cherry blossom garden, golden hour, ultra realistic, masterpiece',
    seed: 20001,
  },
  {
    icon: '🔄',
    name: 'FLUX Dev',
    tag: '圖片轉圖片',
    desc: '上傳參考圖片，一鍵轉換風格，精準保留構圖',
    cost: '3 點/張',
    badgeColor: '#a855f7',
    prompt: 'Anime art style portrait of a warrior woman, vibrant colors, studio ghibli aesthetic, detailed',
    seed: 20002,
  },
  {
    icon: '🎬',
    name: 'Kling 3.0',
    tag: '文字生成影片',
    desc: '輸入一句描述，AI 生成電影級 5 秒影片，支援原生音效',
    cost: '5 點/部',
    badgeColor: '#ff3d8a',
    prompt: 'Cinematic drone shot of Tokyo city at night, neon lights reflecting on wet streets, epic',
    seed: 20003,
  },
  {
    icon: '✨',
    name: 'Kling 3.0 Omni',
    tag: '圖片生成影片',
    desc: '任何靜態圖片都能變成流暢動態影片',
    cost: '5 點/部',
    badgeColor: '#4da6ff',
    prompt: 'Fantasy dragon flying over mountain landscape, epic cinematic, breath fire, realistic',
    seed: 20004,
  },
]

// ─── 統計數字 ─────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

function StatCounter({ value, label, suffix = '' }) {
  const count = useCountUp(value)
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-black text-white">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-white/40 text-sm mt-1">{label}</div>
    </div>
  )
}

// ─── 單張展示卡 ──────────────────────────────────────────────────────────────
function ShowcaseCard({ item }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  const h = item.tall ? 420 : 280

  return (
    <div className="masonry-item">
      <div className="showcase-card relative overflow-hidden rounded-2xl bg-[#111114] border border-white/8 cursor-pointer group">
        {/* Image */}
        {!err ? (
          <>
            {!loaded && <div className="shimmer" style={{ height: h }} />}
            <img
              src={ai(item.prompt, item.seed, 512, item.tall ? 680 : 450)}
              alt={item.title}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setErr(true)}
              className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${loaded ? 'block' : 'hidden'}`}
              style={{ height: h }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center bg-[#1a1a2e] text-white/20 text-sm"
            style={{ height: h }}>
            <div className="text-center">
              <div className="text-3xl mb-2">🎨</div>
              <div>AI 生成中...</div>
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="showcase-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
          <p className="text-xs text-white/50 italic mb-2 line-clamp-2">"{item.prompt}"</p>
          <Link to="/register" className="w-full text-center py-2 rounded-lg text-xs font-black bg-[#c8ff3e] text-black hover:bg-[#d4ff5c] transition-colors">
            立即生成同款 →
          </Link>
        </div>

        {/* Always-visible info */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="text-xs px-2 py-1 rounded-full font-bold bg-black/60 backdrop-blur text-white/70">
            {item.category}
          </span>
          <span className="text-xs px-2 py-1 rounded-full font-black text-black"
            style={{ background: item.badgeColor }}>
            {item.badge}
          </span>
        </div>

        {/* Video play button */}
        {item.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur flex items-center justify-center border border-white/20">
              <Play size={22} className="text-white ml-1" />
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white leading-tight">{item.title}</div>
              <div className="text-white/40 text-xs mt-0.5 line-clamp-1">{item.caption}</div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="text-xs text-white/40">❤️ {item.likes}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 模型展示卡 ──────────────────────────────────────────────────────────────
function ModelCard({ m }) {
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
      {/* Preview image */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        {!err ? (
          <>
            {!loaded && <div className="shimmer absolute inset-0" />}
            <img
              src={ai(m.prompt, m.seed, 600, 320)}
              alt={m.name}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setErr(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e] text-4xl">{m.icon}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111114] to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="text-xs px-2 py-1 rounded-full font-black text-black" style={{ background: m.badgeColor }}>
            {m.tag}
          </span>
        </div>
      </div>
      {/* Info */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-lg">{m.name}</h3>
          <div className="flex items-center gap-1 text-sm font-black" style={{ color: '#c8ff3e' }}>
            <Coins size={12} />{m.cost}
          </div>
        </div>
        <p className="text-white/50 text-sm leading-relaxed">{m.desc}</p>
        <Link to="/register" className="mt-4 flex items-center gap-2 text-sm font-bold hover:gap-3 transition-all" style={{ color: m.badgeColor }}>
          立即試用 <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

// ─── 主頁 ────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')

  const categories = ['all', '時事', '搞笑', 'AI 時代', '名人', '動物', '創意', '影片']
  const filtered = activeTab === 'all'
    ? TRENDING
    : TRENDING.filter(t => t.category.includes(activeTab))

  return (
    <div className="min-h-screen bg-[#08080a] overflow-x-hidden">

      {/* ── 促銷橫幅 ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#c8ff3e]/15 via-[#ff3d8a]/15 to-[#c8ff3e]/15 border-b border-white/5 py-2 px-4 text-center text-sm">
        <span className="text-white/50">🎉 新用戶免費 </span>
        <span className="font-black" style={{ color: '#c8ff3e' }}>10 點數</span>
        <span className="text-white/50"> · 無需信用卡 · 點數永不過期</span>
        <Link to="/register" className="ml-3 font-black hover:underline text-xs" style={{ color: '#c8ff3e' }}>
          立即領取 →
        </Link>
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#08080a]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-black text-lg">
            <span className="text-2xl">👺</span>
            <span className="text-white">Goblin</span><span style={{ color: '#c8ff3e' }}>AI</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm">
            {['首頁', '生成', '定價'].map((name, i) => {
              const to = ['/', '/generate', '/pricing'][i]
              return (
                <Link key={name} to={to}
                  className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all">
                  {name}
                </Link>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/settings?tab=credits"
                  className="hidden sm:flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm"
                  style={{ color: '#c8ff3e', background: 'rgba(200,255,62,0.08)', borderColor: 'rgba(200,255,62,0.2)' }}>
                  <Coins size={13} /><span className="font-black">{user.credits ?? 0}</span><span className="text-xs opacity-60">點</span>
                </Link>
                <Link to="/generate" className="btn-neon py-1.5 px-4 text-xs">開始創作</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-white/50">登入</Link>
                <Link to="/register" className="btn-neon py-1.5 px-4 text-xs">免費開始</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 pt-20 pb-16 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(200,255,62,0.08) 0%, rgba(255,61,138,0.06) 50%, transparent 70%)' }} />

        <div className="fade-in-up-1 inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-sm text-white/60 mb-6">
          <span className="pulse-dot w-2 h-2 rounded-full" style={{ background: '#c8ff3e' }} />
          FLUX · Kling 3.0 · Stable Diffusion 驅動
        </div>

        <h1 className="fade-in-up-2 text-5xl sm:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
          用 AI 生成<br />
          <span className="gradient-text-neon">任何你想像的畫面</span>
        </h1>

        <p className="fade-in-up-3 text-lg text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
          輸入文字，幾秒生成精緻圖片與影片。<br />
          從川普跳舞到賽博龐克台北，什麼都難不倒 AI。
        </p>

        <div className="fade-in-up-4 flex gap-3 justify-center flex-wrap mb-6">
          <Link to="/register" className="btn-neon flex items-center gap-2 text-base px-8 py-3.5">
            <Sparkles size={18} />免費開始創作
          </Link>
          <Link to="/generate" className="btn-secondary flex items-center gap-2 text-base px-8 py-3.5">
            <Play size={16} />查看示範
          </Link>
        </div>
        <p className="text-white/25 text-xs">免費 10 點 · 不需信用卡 · 點數永不過期</p>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto border-t border-white/8 pt-10">
          <StatCounter value={48293} label="已生成圖片" suffix="+" />
          <StatCounter value={5821}  label="已生成影片" suffix="+" />
          <StatCounter value={3204}  label="創作用戶" suffix="+" />
        </div>
      </section>

      {/* ── 跑馬燈 ──────────────────────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-[#0d0d10] py-3 marquee-wrap">
        <div className="marquee-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="mx-6 text-sm text-white/30 whitespace-nowrap flex items-center gap-2">
              {item}
              <span className="w-1 h-1 rounded-full bg-white/15 mx-2" />
            </span>
          ))}
        </div>
      </div>

      {/* ── 熱門展示 Gallery ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} style={{ color: '#ff3d8a' }} />
              <span className="text-xs font-black tracking-widest text-white/40 uppercase">本週最火</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              AI 生成<span className="gradient-text-pink"> 熱門內容</span>
            </h2>
            <p className="text-white/40 text-sm mt-2">以下均為 GoblinAI 用戶生成，輸入任何提示詞即可創作</p>
          </div>
          <Link to="/register" className="btn-neon flex items-center gap-2 shrink-0">
            <Sparkles size={14} />全部生成 →
          </Link>
        </div>

        {/* 分類 tab */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                activeTab === cat
                  ? 'text-black'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
              }`}
              style={activeTab === cat ? { background: '#c8ff3e' } : {}}
            >
              {cat === 'all' ? '全部' : cat}
            </button>
          ))}
        </div>

        {/* Masonry grid */}
        <div className="masonry-grid">
          {filtered.map(item => (
            <ShowcaseCard key={item.id} item={item} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/register"
            className="inline-flex items-center gap-2 border border-white/15 px-8 py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:border-white/30 transition-all">
            載入更多 <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── 提示詞示範 ──────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#0d0d10] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-white/30 text-sm mb-6 uppercase tracking-widest font-bold">試試這些熱門提示詞</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              '川普宣佈關稅戰，全球股市崩盤搞笑迷因',
              '貓咪穿西裝開董事會會議',
              'Elon Musk 在火星開 Tesla 繞圈',
              '機器人在時代廣場街舞 breakdance',
              '阿嬤戴電競耳機奪世界冠軍',
              '賽博龐克台北夜景 2077',
              '狗狗擔任美國總統簽署法案',
              '中美貿易戰漫畫 funny cartoon',
            ].map((p, i) => (
              <Link to="/register" key={i}
                className="bg-white/5 border border-white/8 hover:border-[#c8ff3e]/30 text-white/50 hover:text-white text-sm px-4 py-2 rounded-full transition-all">
                "{p}"
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 模型展示 ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-sm text-white/50 mb-4">
            <Zap size={14} style={{ color: '#c8ff3e' }} />業界頂尖模型
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-3">
            四大 AI 模型<span className="gradient-text-neon">全都有</span>
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            圖片、影片、圖轉圖，一個平台全搞定
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MODEL_SHOWCASE.map(m => <ModelCard key={m.name} m={m} />)}
        </div>
      </section>

      {/* ── 點數費用 ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 max-w-2xl mx-auto">
          <h3 className="font-black text-xl mb-2 text-center">點數費用說明</h3>
          <p className="text-center text-white/30 text-sm mb-6">一次購買 · 永久有效 · 不過期</p>
          <div className="space-y-4">
            {[
              { icon: '🖼️', label: '文字生成圖片', cost: '2 點/張',  sub: 'FLUX Schnell / FLUX Dev / FLUX 1.1 Pro' },
              { icon: '🔄', label: '圖片轉圖片',   cost: '3 點/張',  sub: 'FLUX Dev · 精準風格轉換' },
              { icon: '🎬', label: '文字生成影片', cost: '5 點/部',  sub: 'Kling 3.0 · 電影級 5 秒影片' },
              { icon: '✨', label: '圖片生成影片', cost: '5 點/部',  sub: 'Kling 3.0 Omni · 靜態變動態' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="text-white/80 font-medium">{item.label}</div>
                    <div className="text-white/30 text-xs">{item.sub}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 font-black text-sm shrink-0 ml-4" style={{ color: '#c8ff3e' }}>
                  <Coins size={12} />{item.cost}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/8 text-center text-white/25 text-xs">
            生成失敗自動退還點數 · 點數永久有效
          </div>
        </div>
      </section>

      {/* ── 如何使用 ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">三步驟，開始創作</h2>
          <p className="text-white/40">比你想像的還要簡單</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', icon: '🎁', title: '免費註冊領點數', desc: '30 秒完成註冊，立即獲得 10 點免費點數，無需信用卡。' },
            { step: '02', icon: '✍️', title: '輸入提示詞',     desc: '用中文或英文描述你想生成的畫面，越詳細效果越好。' },
            { step: '03', icon: '🚀', title: '下載分享',       desc: 'AI 幾秒內生成，高畫質圖片或影片立即下載，直接發社群。' },
          ].map(s => (
            <div key={s.step} className="relative bg-[#111114] border border-white/8 rounded-2xl p-7 hover:border-white/15 transition-colors">
              <div className="text-6xl font-black text-white/5 absolute top-4 right-5 leading-none">{s.step}</div>
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="font-black text-lg mb-2">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 功能特點 ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '🧠', title: '頂尖 AI 模型',   desc: 'FLUX 1.1 Pro、Kling 3.0 等業界最新模型，品質無妥協。' },
            { icon: '⚡', title: '最快 2 秒出圖',   desc: 'FLUX Schnell 技術，最快 2 秒生成一張精緻圖片。' },
            { icon: '💎', title: '點數永久有效',    desc: '一次購買終身使用，沒有月費、沒有訂閱、不會過期。' },
          ].map(f => (
            <div key={f.title} className="bg-[#111114] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-black text-white mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="relative overflow-hidden rounded-3xl p-12 border border-white/10"
          style={{ background: 'linear-gradient(135deg, rgba(200,255,62,0.08) 0%, rgba(255,61,138,0.08) 100%)' }}>
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(200,255,62,0.1)' }} />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(255,61,138,0.1)' }} />
          <div className="relative">
            <div className="text-5xl mb-4 float-anim inline-block">👺</div>
            <h2 className="text-4xl font-black mb-4">開始你的第一個 AI 作品</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              免費 10 點數等你領取，從川普跳舞到賽博龐克台北，任何畫面都能生成
            </p>
            <Link to="/register" className="btn-neon inline-flex items-center gap-2 text-base px-10 py-3.5">
              <Sparkles size={18} />免費創建帳號
            </Link>
            <p className="text-white/20 text-xs mt-4">免費 10 點 · 不需信用卡 · 30 秒完成</p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-black">
            <span>👺</span>
            <span className="text-white">Goblin</span><span style={{ color: '#c8ff3e' }}>AI</span>
          </div>
          <div className="flex gap-6 text-white/30 text-sm">
            <Link to="/pricing"  className="hover:text-white transition-colors">定價</Link>
            <Link to="/generate" className="hover:text-white transition-colors">生成</Link>
            <Link to="/login"    className="hover:text-white transition-colors">登入</Link>
            <Link to="/register" className="hover:text-white transition-colors">註冊</Link>
          </div>
          <p className="text-white/20 text-xs">© 2025 Goblin AI 影像生成</p>
        </div>
      </footer>

    </div>
  )
}
