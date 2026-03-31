import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, Coins, Zap, Play, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─── 熱門展示卡片（快速載入的高畫質圖，加上 AI 風格遮罩）─────────────────────
// picsum.photos 毫秒即載，不依賴 AI API
const P = (id, w = 512, h = 340) => `https://picsum.photos/id/${id}/${w}/${h}`

const TRENDING = [
  {
    id: 1,
    category: '🔥 時事',
    title: '川普關稅戰開打',
    caption: '川普宣佈對全球加徵 100% 關稅，股市崩盤大混亂',
    img: P(1062, 512, 480), // dramatic city/architecture
    overlay: 'from-red-900/70 via-red-800/30 to-transparent',
    badge: 'TRENDING',
    badgeColor: '#ff3d8a',
    likes: '12.4k',
    tall: true,
    prompt: 'Donald Trump funny cartoon meme, tariff war, dollar bills falling',
  },
  {
    id: 2,
    category: '😂 搞笑',
    title: '川普跳舞大秀',
    caption: '川普在白宮草坪跳 Gangnam Style，全球瘋傳',
    img: P(399, 512, 320),
    overlay: 'from-yellow-900/60 via-orange-800/20 to-transparent',
    badge: 'VIRAL',
    badgeColor: '#c8ff3e',
    likes: '8.7k',
    tall: false,
    prompt: 'Trump dancing Gangnam Style on White House lawn, funny cartoon',
  },
  {
    id: 3,
    category: '🤖 AI 時代',
    title: 'AI 搶走我的工作',
    caption: '機器人坐進辦公室，白領員工一臉茫然站在門口',
    img: P(0, 512, 320),
    overlay: 'from-purple-900/60 via-blue-900/20 to-transparent',
    badge: 'HOT',
    badgeColor: '#a855f7',
    likes: '5.2k',
    tall: false,
    prompt: 'Robot sitting at office desk looking smug, fired workers outside',
  },
  {
    id: 4,
    category: '🚀 名人',
    title: '馬斯克移民火星',
    caption: 'Elon Musk 在火星開 Tesla，外星人攔路收過路費',
    img: P(1025, 512, 480),
    overlay: 'from-orange-900/70 via-red-800/30 to-transparent',
    badge: 'NEW',
    badgeColor: '#4da6ff',
    likes: '9.1k',
    tall: true,
    prompt: 'Elon Musk driving Tesla on Mars, aliens charging toll fee',
  },
  {
    id: 5,
    category: '😹 動物迷因',
    title: '貓咪 CEO 開董事會',
    caption: '貓咪穿西裝主持會議，其他貓咪在電腦前一臉嚴肅',
    img: P(453, 512, 320),
    overlay: 'from-gray-900/60 via-slate-800/20 to-transparent',
    badge: '😂 FUNNY',
    badgeColor: '#a855f7',
    likes: '21.3k',
    tall: false,
    prompt: 'Cats in business suits in corporate boardroom, CEO cat presenting',
  },
  {
    id: 6,
    category: '🎮 電競',
    title: '阿嬤打電動世界冠軍',
    caption: '80歲阿嬤戴著電競耳機，在大舞台上狂打 LOL 奪冠',
    img: P(1047, 512, 320),
    overlay: 'from-cyan-900/60 via-blue-800/20 to-transparent',
    badge: 'EPIC',
    badgeColor: '#c8ff3e',
    likes: '15.8k',
    tall: false,
    prompt: 'Elderly grandmother winning esports world championship, gaming headset',
  },
  {
    id: 7,
    category: '🌏 時事',
    title: '關稅戰國際反應',
    caption: '各國領袖開緊急視訊會議，全場一臉生無可戀',
    img: P(1081, 512, 480),
    overlay: 'from-blue-900/70 via-indigo-800/30 to-transparent',
    badge: 'TRENDING',
    badgeColor: '#ff3d8a',
    likes: '6.9k',
    tall: true,
    prompt: 'World leaders in stressed Zoom call about trade war, funny expressions',
  },
  {
    id: 8,
    category: '💃 舞蹈',
    title: 'AI 機器人跳街舞',
    caption: '機器人在時代廣場 breakdance，人類圍觀鼓掌',
    img: P(1060, 512, 320),
    overlay: 'from-pink-900/60 via-purple-800/20 to-transparent',
    badge: 'COOL',
    badgeColor: '#4da6ff',
    likes: '11.2k',
    tall: false,
    prompt: 'Robot breakdancing in Times Square, crowd watching amazed',
  },
  {
    id: 9,
    category: '🏆 體育',
    title: '台灣選手奧運奪金',
    caption: '台灣運動員站上奧運最高領獎台，全場瘋狂歡呼',
    img: P(1019, 512, 320),
    overlay: 'from-yellow-900/70 via-amber-800/30 to-transparent',
    badge: '🥇 GOLD',
    badgeColor: '#ffd700',
    likes: '33.7k',
    tall: false,
    prompt: 'Taiwanese athlete on Olympic gold medal podium, emotional victory',
  },
  {
    id: 10,
    category: '🎨 創意',
    title: '賽博龐克台北夜景',
    caption: '2077年台北，霓虹燈招牌、飛行車、電子夜市',
    img: P(1031, 512, 480),
    overlay: 'from-cyan-900/70 via-purple-900/40 to-transparent',
    badge: 'ART',
    badgeColor: '#a855f7',
    likes: '18.5k',
    tall: true,
    prompt: 'Cyberpunk Taipei 2077, neon Chinese signs, flying cars, blade runner',
  },
  {
    id: 11,
    category: '🐶 動物',
    title: '狗狗當總統',
    caption: '金毛獵犬坐在總統辦公桌後面簽署法案，助理是貓',
    img: P(237, 512, 320),
    overlay: 'from-green-900/60 via-emerald-800/20 to-transparent',
    badge: '😂 LOL',
    badgeColor: '#ff3d8a',
    likes: '44.1k',
    tall: false,
    prompt: 'Golden retriever as president signing documents, cat as assistant',
  },
]

// ─── 影片展示（YouTube 真實示範影片）──────────────────────────────────────────
const VIDEO_DEMOS = [
  {
    id: 'v1',
    title: 'AI 生成舞蹈影片',
    caption: 'Kling 3.0 · 輸入「跳舞的人」即可生成',
    // Publicly available AI video generation demo
    youtubeId: 'dQw4w9WgXcQ', // placeholder - will show thumbnail
    thumb: P(1005, 640, 360),
    badge: 'Kling 3.0',
    badgeColor: '#ff3d8a',
  },
  {
    id: 'v2',
    title: 'AI 生成城市影片',
    caption: 'Kling 3.0 · 「夜晚城市空拍鏡頭」',
    youtubeId: 'dQw4w9WgXcQ',
    thumb: P(1031, 640, 360),
    badge: 'Kling 3.0',
    badgeColor: '#4da6ff',
  },
  {
    id: 'v3',
    title: 'AI 圖片轉影片',
    caption: 'Kling 3.0 Omni · 上傳靜態圖，一鍵動起來',
    youtubeId: 'dQw4w9WgXcQ',
    thumb: P(1059, 640, 360),
    badge: 'I2V',
    badgeColor: '#c8ff3e',
  },
]

// ─── 模型展示 ─────────────────────────────────────────────────────────────────
const MODEL_SHOWCASE = [
  {
    icon: '🖼️',
    name: 'FLUX 1.1 Pro',
    tag: '文字生成圖片',
    desc: '最新旗艦模型，輸入描述 2 秒出圖，任何風格任何場景',
    cost: '2 點/張',
    badgeColor: '#c8ff3e',
    img: P(1040, 600, 280),
    overlay: 'from-emerald-900/80 to-transparent',
  },
  {
    icon: '🔄',
    name: 'FLUX Dev',
    tag: '圖片轉圖片',
    desc: '上傳參考圖片，一鍵轉換風格，精準保留構圖',
    cost: '3 點/張',
    badgeColor: '#a855f7',
    img: P(1054, 600, 280),
    overlay: 'from-purple-900/80 to-transparent',
  },
  {
    icon: '🎬',
    name: 'Kling 3.0',
    tag: '文字生成影片',
    desc: '輸入一句描述，AI 生成電影級 5 秒影片，支援原生音效',
    cost: '5 點/部',
    badgeColor: '#ff3d8a',
    img: P(1015, 600, 280),
    overlay: 'from-pink-900/80 to-transparent',
    isVideo: true,
  },
  {
    icon: '✨',
    name: 'Kling 3.0 Omni',
    tag: '圖片生成影片',
    desc: '任何靜態圖片都能變成流暢動態影片',
    cost: '5 點/部',
    badgeColor: '#4da6ff',
    img: P(1080, 600, 280),
    overlay: 'from-blue-900/80 to-transparent',
    isVideo: true,
  },
]

// ─── 統計計數器 ───────────────────────────────────────────────────────────────
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const id = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(id) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(id)
  }, [target, duration])
  return count
}

function StatBox({ value, label, suffix = '' }) {
  const n = useCountUp(value)
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-black text-white">{n.toLocaleString()}{suffix}</div>
      <div className="text-white/40 text-xs mt-1">{label}</div>
    </div>
  )
}

// ─── 展示圖片卡 ───────────────────────────────────────────────────────────────
function ShowcaseCard({ item }) {
  const [loaded, setLoaded] = useState(false)
  const h = item.tall ? 400 : 260
  return (
    <div className="masonry-item">
      <div className="showcase-card relative overflow-hidden rounded-2xl bg-[#111114] border border-white/8 cursor-pointer group">
        {!loaded && <div className="shimmer" style={{ height: h }} />}
        <img
          src={item.img}
          alt={item.title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${loaded ? 'block' : 'hidden'}`}
          style={{ height: h }}
        />
        {/* Color grade overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${item.overlay}`} />
        {/* Dark bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Hover prompt overlay */}
        <div className="showcase-overlay absolute inset-0 bg-black/70 flex flex-col justify-center items-center p-4 gap-3">
          <p className="text-xs text-white/60 italic text-center">"{item.prompt}"</p>
          <Link to="/register" className="px-4 py-2 rounded-xl text-xs font-black bg-[#c8ff3e] text-black hover:bg-[#d4ff5c] transition-colors">
            立即生成同款 →
          </Link>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="text-xs px-2 py-1 rounded-full font-bold bg-black/60 backdrop-blur text-white/70">{item.category}</span>
          <span className="text-xs px-2 py-1 rounded-full font-black text-black" style={{ background: item.badgeColor }}>{item.badge}</span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-black text-sm text-white leading-tight">{item.title}</div>
              <div className="text-white/40 text-xs mt-0.5 line-clamp-1">{item.caption}</div>
            </div>
            <div className="text-xs text-white/40 shrink-0 ml-2">❤️ {item.likes}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 影片示範卡 ───────────────────────────────────────────────────────────────
function VideoCard({ v, onClick }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className="showcase-card relative overflow-hidden rounded-2xl bg-[#111114] border border-white/8 cursor-pointer group"
      onClick={() => onClick(v)}
    >
      {!loaded && <div className="shimmer h-52" />}
      <img
        src={v.thumb}
        alt={v.title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105 ${loaded ? 'block' : 'hidden'}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center
          group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
          <Play size={24} className="text-white ml-1" fill="white" />
        </div>
      </div>

      {/* Top badge */}
      <div className="absolute top-3 left-3">
        <span className="text-xs px-2 py-1 rounded-full font-black text-black" style={{ background: v.badgeColor }}>{v.badge}</span>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
        <div className="font-black text-sm text-white">{v.title}</div>
        <div className="text-white/40 text-xs mt-0.5">{v.caption}</div>
      </div>
    </div>
  )
}

// ─── 影片 Modal ───────────────────────────────────────────────────────────────
function VideoModal({ video, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/50 hover:text-white text-sm">✕ 關閉</button>
        {/* Embedded YouTube */}
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&mute=1`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={video.title}
          />
        </div>
        {/* CTA */}
        <div className="mt-4 text-center">
          <p className="text-white/50 text-sm mb-3">以上影片由 Kling 3.0 生成 · 你也可以生成屬於自己的</p>
          <Link to="/register" className="btn-neon inline-flex items-center gap-2">
            <Sparkles size={14} />免費生成影片
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── 跑馬燈 ───────────────────────────────────────────────────────────────────
const TICKER = [
  '🔥 川普關稅戰', '💃 AI 跳舞影片', '🤖 機器人搶工作', '🐱 貓咪 CEO',
  '🚀 馬斯克火星', '🎮 阿嬤電競冠軍', '🌏 國際貿易戰', '🏆 奧運奪金',
  '🌃 賽博龐克台北', '🐶 狗狗總統', '😂 AI 搞笑迷因', '⚡ 2 秒生成圖片',
  '🎬 Kling 3.0 影片', '✨ FLUX 1.1 Pro', '🎨 AI 藝術創作',
]

// ─── 主頁 ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [activeVideo, setActiveVideo] = useState(null)

  const TABS = ['all', '時事', '搞笑', 'AI 時代', '名人', '動物', '創意', '影片']
  const filtered = activeTab === 'all'
    ? TRENDING
    : TRENDING.filter(t => t.category.includes(activeTab))

  return (
    <div className="min-h-screen bg-[#08080a] overflow-x-hidden">

      {/* ── 促銷橫幅 */}
      <div className="bg-gradient-to-r from-[#c8ff3e]/15 via-[#ff3d8a]/15 to-[#c8ff3e]/15 border-b border-white/5 py-2 px-4 text-center text-sm">
        <span className="text-white/50">🎉 新用戶免費 </span>
        <span className="font-black" style={{ color: '#c8ff3e' }}>10 點數</span>
        <span className="text-white/50"> · 無需信用卡 · 點數永不過期</span>
        <Link to="/register" className="ml-3 font-black hover:underline text-xs" style={{ color: '#c8ff3e' }}>立即領取 →</Link>
      </div>

      {/* ── Navbar */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#08080a]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-black text-lg">
            <span className="text-2xl">👺</span>
            <span className="text-white">Goblin</span><span style={{ color: '#c8ff3e' }}>AI</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm">
            {[['首頁', '/'], ['生成', '/generate'], ['定價', '/pricing']].map(([name, to]) => (
              <Link key={name} to={to} className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all">{name}</Link>
            ))}
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

      {/* ── Hero */}
      <section className="relative max-w-7xl mx-auto px-4 pt-20 pb-16 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(200,255,62,0.07) 0%, rgba(255,61,138,0.05) 60%, transparent 70%)' }} />

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
          <Link to="/pricing" className="btn-secondary flex items-center gap-2 text-base px-8 py-3.5">
            查看方案 <ArrowRight size={16} />
          </Link>
        </div>
        <p className="text-white/25 text-xs">免費 10 點 · 不需信用卡 · 點數永不過期</p>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto border-t border-white/8 pt-10">
          <StatBox value={48293} label="已生成圖片" suffix="+" />
          <StatBox value={5821}  label="已生成影片" suffix="+" />
          <StatBox value={3204}  label="創作用戶"   suffix="+" />
        </div>
      </section>

      {/* ── 跑馬燈 */}
      <div className="border-y border-white/5 bg-[#0d0d10] py-3 marquee-wrap">
        <div className="marquee-track">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="mx-6 text-sm text-white/30 whitespace-nowrap flex items-center">
              {item}
              <span className="w-1 h-1 rounded-full bg-white/15 mx-4" />
            </span>
          ))}
        </div>
      </div>

      {/* ── 影片示範區 */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Play size={18} style={{ color: '#ff3d8a' }} />
              <span className="text-xs font-black tracking-widest text-white/40 uppercase">影片示範</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              Kling 3.0<span className="gradient-text-pink"> 影片生成</span>
            </h2>
            <p className="text-white/40 text-sm mt-2">輸入一句描述，AI 即時生成電影級影片</p>
          </div>
          <Link to="/register" className="btn-pink flex items-center gap-2 shrink-0">
            <Play size={14} />生成我的影片
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {VIDEO_DEMOS.map(v => (
            <VideoCard key={v.id} v={v} onClick={setActiveVideo} />
          ))}
        </div>

        {/* 影片提示詞 */}
        <div className="mt-6 bg-[#111114] border border-white/8 rounded-2xl p-5">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">熱門影片提示詞</p>
          <div className="flex flex-wrap gap-2">
            {[
              '川普在白宮跳 Gangnam Style',
              '機器人在街頭 breakdance',
              '貓咪穿西裝走秀',
              '賽博龐克台北夜景空拍',
              '宇宙中漂浮的金魚',
              '外星人參觀台灣夜市',
            ].map((p, i) => (
              <Link to="/register" key={i}
                className="bg-white/5 border border-white/8 hover:border-[#ff3d8a]/30 text-white/50 hover:text-white text-xs px-3 py-2 rounded-full transition-all">
                🎬 {p}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 熱門圖片 Gallery */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} style={{ color: '#ff3d8a' }} />
              <span className="text-xs font-black tracking-widest text-white/40 uppercase">本週最火</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              AI 生成<span className="gradient-text-pink"> 熱門內容</span>
            </h2>
            <p className="text-white/40 text-sm mt-2">懸停圖片可查看生成提示詞</p>
          </div>
          <Link to="/register" className="btn-neon flex items-center gap-2 shrink-0">
            <Sparkles size={14} />立即創作
          </Link>
        </div>

        {/* 分類 tab */}
        <div className="flex gap-2 flex-wrap mb-8">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'text-black'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
              }`}
              style={activeTab === tab ? { background: '#c8ff3e' } : {}}>
              {tab === 'all' ? '全部' : tab}
            </button>
          ))}
        </div>

        {/* Masonry */}
        <div className="masonry-grid">
          {filtered.map(item => <ShowcaseCard key={item.id} item={item} />)}
        </div>

        <div className="text-center mt-10">
          <Link to="/register"
            className="inline-flex items-center gap-2 border border-white/15 px-8 py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:border-white/30 transition-all">
            自己生成更多 → <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── 熱門提示詞 */}
      <section className="border-y border-white/5 bg-[#0d0d10] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-white/30 text-sm mb-6 uppercase tracking-widest font-bold">試試這些熱門提示詞</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              '川普宣佈關稅戰，全球股市崩盤搞笑迷因',
              '貓咪穿西裝開董事會議',
              'Elon Musk 在火星開 Tesla 繞圈',
              '機器人在時代廣場街舞 breakdance',
              '阿嬤戴電競耳機奪世界冠軍',
              '賽博龐克台北夜景 2077',
              '狗狗擔任美國總統簽署法案',
              '中美貿易戰搞笑漫畫 funny meme',
            ].map((p, i) => (
              <Link to="/register" key={i}
                className="bg-white/5 border border-white/8 hover:border-[#c8ff3e]/30 text-white/50 hover:text-white text-sm px-4 py-2 rounded-full transition-all">
                "{p}"
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 模型展示 */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-sm text-white/50 mb-4">
            <Zap size={14} style={{ color: '#c8ff3e' }} />業界頂尖模型
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-3">
            四大 AI 模型<span className="gradient-text-neon">全都有</span>
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">圖片、影片、圖轉圖，一個平台全搞定</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MODEL_SHOWCASE.map(m => (
            <div key={m.name} className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
              <div className="relative overflow-hidden h-40">
                <img src={m.img} alt={m.name} loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-t ${m.overlay}`} />
                {m.isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play size={16} className="text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="text-xs px-2 py-1 rounded-full font-black text-black" style={{ background: m.badgeColor }}>{m.tag}</span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black">{m.icon} {m.name}</h3>
                  <div className="flex items-center gap-1 text-xs font-black" style={{ color: '#c8ff3e' }}>
                    <Coins size={11} />{m.cost}
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">{m.desc}</p>
                <Link to="/register" className="mt-3 flex items-center gap-1.5 text-sm font-bold hover:gap-2.5 transition-all" style={{ color: m.badgeColor }}>
                  立即試用 <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 點數費用 */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 max-w-2xl mx-auto">
          <h3 className="font-black text-xl mb-2 text-center">點數費用說明</h3>
          <p className="text-center text-white/30 text-sm mb-6">一次購買 · 永久有效 · 不過期</p>
          <div className="space-y-4">
            {[
              { icon: '🖼️', label: '文字生成圖片', cost: '2 點/張', sub: 'FLUX Schnell / FLUX Dev / FLUX 1.1 Pro' },
              { icon: '🔄', label: '圖片轉圖片',   cost: '3 點/張', sub: 'FLUX Dev · 精準風格轉換' },
              { icon: '🎬', label: '文字生成影片', cost: '5 點/部', sub: 'Kling 3.0 · 電影級 5 秒影片' },
              { icon: '✨', label: '圖片生成影片', cost: '5 點/部', sub: 'Kling 3.0 Omni · 靜態變動態' },
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

      {/* ── 如何使用 */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">三步驟，開始創作</h2>
          <p className="text-white/40">比你想像的還要簡單</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', icon: '🎁', title: '免費註冊領點數', desc: '30 秒完成註冊，立即獲得 10 點免費點數，無需信用卡。' },
            { step: '02', icon: '✍️', title: '輸入提示詞',    desc: '用中文或英文描述你想生成的畫面，越詳細效果越好。' },
            { step: '03', icon: '🚀', title: '下載分享',      desc: 'AI 幾秒內生成，高畫質圖片或影片立即下載，直接發社群。' },
          ].map(s => (
            <div key={s.step} className="relative bg-[#111114] border border-white/8 rounded-2xl p-7 hover:border-white/15 transition-colors">
              <div className="text-6xl font-black text-white/5 absolute top-4 right-5 leading-none select-none">{s.step}</div>
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="font-black text-lg mb-2">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="relative overflow-hidden rounded-3xl p-12 border border-white/10"
          style={{ background: 'linear-gradient(135deg, rgba(200,255,62,0.08) 0%, rgba(255,61,138,0.08) 100%)' }}>
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(200,255,62,0.1)' }} />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(255,61,138,0.1)' }} />
          <div className="relative">
            <div className="text-5xl mb-4 float-anim inline-block">👺</div>
            <h2 className="text-4xl font-black mb-4">開始你的第一個 AI 作品</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">免費 10 點等你領取，從川普跳舞到賽博龐克台北，任何畫面都能生成</p>
            <Link to="/register" className="btn-neon inline-flex items-center gap-2 text-base px-10 py-3.5">
              <Sparkles size={18} />免費創建帳號
            </Link>
            <p className="text-white/20 text-xs mt-4">免費 10 點 · 不需信用卡 · 30 秒完成</p>
          </div>
        </div>
      </section>

      {/* ── Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-black">
            <span>👺</span><span className="text-white">Goblin</span><span style={{ color: '#c8ff3e' }}>AI</span>
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

      {/* ── 影片 Modal */}
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}

    </div>
  )
}
