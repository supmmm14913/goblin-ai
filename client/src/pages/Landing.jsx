import { Link } from 'react-router-dom'
import { Sparkles, Zap, Image, Video, ArrowRight, Check, Play } from 'lucide-react'

const TOOLS = [
  { emoji: '🖼️', name: '文字生圖', desc: 'FLUX · SDXL', badge: 'HOT', badgeColor: 'badge-neon' },
  { emoji: '🔄', name: '圖片轉圖', desc: '精準控制風格', badge: null },
  { emoji: '🎬', name: '文字生影', desc: 'Wan 2.1 模型', badge: 'NEW', badgeColor: 'badge-pink' },
  { emoji: '✨', name: '圖片生影', desc: '靜態變動態', badge: null },
]

const FEATURES = [
  {
    title: '頂尖 AI 模型',
    desc: '整合 FLUX.1、Stable Diffusion XL、Wan Video 等業界頂級模型，品質卓越',
    icon: '🧠',
  },
  {
    title: '極速生成',
    desc: '最快 3 秒生成一張圖片，FLUX Schnell 技術加持，不浪費你的創作靈感',
    icon: '⚡',
  },
  {
    title: '點數永久有效',
    desc: '買了就是你的，不會過期，不用擔心月費壓力，按需使用最自由',
    icon: '💎',
  },
]

const SAMPLE_PROMPTS = [
  'A samurai warrior standing in neon-lit cyberpunk Tokyo at night',
  'Portrait of an elven queen with silver hair, magical forest, ethereal lighting',
  'Abstract digital art, flowing colors, cosmic nebula, ultra detailed',
  'A cozy Japanese ramen shop in winter, snow outside, warm golden light',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#08080a]">
      {/* 促銷橫幅 */}
      <div className="bg-gradient-to-r from-[#c8ff3e]/15 via-[#ff3d8a]/15 to-[#c8ff3e]/15 border-b border-white/5 py-2 px-4 text-center text-sm">
        <span className="text-white/50">🎉 新用戶免費 </span>
        <span className="text-neon font-bold">10 點數</span>
        <span className="text-white/50"> · 無需信用卡</span>
        <Link to="/register" className="ml-3 text-neon font-bold hover:underline text-xs">立即領取 →</Link>
      </div>

      {/* Navbar */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#08080a]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-black text-lg">
            <span className="text-2xl">👺</span>
            <span className="text-white">Goblin</span><span className="text-neon">AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/pricing" className="btn-ghost hidden sm:block text-white/50">定價</Link>
            <Link to="/login" className="btn-ghost text-white/50">登入</Link>
            <Link to="/register" className="btn-neon py-1.5 px-4 text-xs">免費開始</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-sm text-white/60 mb-6">
          <span className="w-2 h-2 bg-neon rounded-full animate-pulse" style={{background:'#c8ff3e'}} />
          由 FLUX · Stable Diffusion · Wan Video 驅動
        </div>

        <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
          用 AI 創造<br />
          <span style={{color:'#c8ff3e'}}>無限影像</span>
        </h1>

        <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto leading-relaxed">
          輸入文字描述，幾秒生成精緻圖片與影片。<br />
          支援最新 AI 模型，點數永久有效。
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/register" className="btn-neon flex items-center gap-2 text-base px-8 py-3">
            <Sparkles size={18} />免費開始創作
          </Link>
          <Link to="/pricing" className="btn-secondary flex items-center gap-2 text-base px-8 py-3">
            查看方案 <ArrowRight size={16} />
          </Link>
        </div>
        <p className="text-white/25 text-xs mt-4">免費 10 點 · 不需信用卡 · 點數永不過期</p>
      </section>

      {/* 工具卡片 */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TOOLS.map((tool, i) => (
            <Link to="/register" key={i}
              className="bg-[#111114] border border-white/8 rounded-2xl p-5 hover:border-white/20 transition-all hover:-translate-y-0.5 group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{tool.emoji}</span>
                {tool.badge && <span className={tool.badgeColor}>{tool.badge}</span>}
              </div>
              <div className="font-bold text-white">{tool.name}</div>
              <div className="text-white/40 text-xs mt-1">{tool.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 示範提示詞 */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-6">
          <p className="text-white/30 text-sm">輸入任何描述，AI 立刻生成</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {SAMPLE_PROMPTS.map((p, i) => (
            <Link to="/register" key={i}
              className="bg-white/5 border border-white/8 hover:border-[#c8ff3e]/30 text-white/50 hover:text-white text-sm px-4 py-2 rounded-full transition-all">
              "{p}"
            </Link>
          ))}
        </div>
      </section>

      {/* 功能特色 */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-[#111114] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 點數費用說明 */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 max-w-2xl mx-auto">
          <h3 className="font-bold text-lg mb-6 text-center">點數費用說明</h3>
          <div className="space-y-4">
            {[
              { label: '文字生成圖片', cost: '1 點', icon: '🖼️' },
              { label: '圖片轉圖片',   cost: '2 點', icon: '🔄' },
              { label: '文字生成影片', cost: '5 點', icon: '🎬' },
              { label: '圖片生成影片', cost: '5 點', icon: '✨' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <span>{item.icon}</span>{item.label}
                </div>
                <span className="text-neon font-bold text-sm">{item.cost}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/8 text-center text-white/25 text-xs">
            生成失敗自動退還點數 · 點數永久有效
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-br from-[#c8ff3e]/10 to-[#ff3d8a]/10 border border-white/10 rounded-3xl p-12">
          <h2 className="text-4xl font-black mb-4">開始你的第一個作品</h2>
          <p className="text-white/50 mb-8">免費 10 點數等你領取，馬上體驗 AI 創作的魔力</p>
          <Link to="/register" className="btn-neon inline-flex items-center gap-2 text-base px-10 py-3">
            <Sparkles size={18} />免費創建帳號
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-black">
            <span>👺</span>
            <span className="text-white">Goblin</span><span className="text-neon">AI</span>
          </div>
          <div className="flex gap-6 text-white/30 text-sm">
            <Link to="/pricing" className="hover:text-white transition-colors">定價</Link>
            <Link to="/login" className="hover:text-white transition-colors">登入</Link>
            <Link to="/register" className="hover:text-white transition-colors">註冊</Link>
          </div>
          <p className="text-white/20 text-xs">© 2025 Goblin AI 影像生成</p>
        </div>
      </footer>
    </div>
  )
}
