import { useState, useEffect, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Check, X, Coins, MessageCircle } from 'lucide-react'

// ─── Plan definitions ────────────────────────────────────────────────────────
// Base: $10 = 100pts → $0.100/pt
// Mid:  $30 = 400pts → $0.075/pt → save 25%
// Pro:  $100= 1491pts→ $0.067/pt → save 33%
const PLANS = [
  {
    id: 'starter',
    name: 'PLUS',
    badge: '入門首選',
    badgeColor: 'bg-[#c8ff3e] text-black',
    borderTop: 'border-t-[#c8ff3e]',
    description: '輕鬆上手 AI 圖像創作的入門選擇',
    oneTimePrice: 10,
    credits: 100,
    perCredit: '0.10',
    save: null,
    creditsDetail: ['= 50 張文字生圖', '= 20 部 AI 影片'],
    features: [
      '所有 AI 圖像模型',
      '所有 AI 影片模型',
      '點數永久有效，不過期',
      '生成失敗自動退還點數',
    ],
    cta: '立即購買',
    ctaClass: 'bg-white text-black hover:bg-gray-200',
  },
  {
    id: 'popular',
    name: 'ULTRA',
    badge: '最受歡迎',
    badgeColor: 'bg-[#ff3d8a] text-white',
    borderTop: 'border-t-[#ff3d8a]',
    description: '創作者與內容製作者的最佳選擇',
    oneTimePrice: 30,
    credits: 400,
    perCredit: '0.075',
    save: 25,
    creditsDetail: ['= 200 張文字生圖', '= 80 部 AI 影片'],
    features: [
      '所有 AI 圖像模型',
      '所有 AI 影片模型',
      '點數永久有效，不過期',
      '生成失敗自動退還點數',
      '每點費用更低（省 25%）',
      '優先生成佇列',
    ],
    cta: '立即升級',
    ctaClass: 'bg-[#ff3d8a] text-white hover:bg-[#ff5599]',
    popular: true,
  },
  {
    id: 'pro',
    name: 'ELITE',
    badge: '最划算',
    badgeColor: 'bg-[#4da6ff] text-white',
    borderTop: 'border-t-[#4da6ff]',
    description: '重度創作者與工作室的終極方案',
    oneTimePrice: 100,
    credits: 1491,
    perCredit: '0.067',
    save: 33,
    creditsDetail: ['= 745 張文字生圖', '= 298 部 AI 影片'],
    features: [
      '所有 AI 圖像模型',
      '所有 AI 影片模型',
      '點數永久有效，不過期',
      '生成失敗自動退還點數',
      '每點費用最低（省 33%）',
      '優先生成佇列',
      '大量點數折扣',
    ],
    cta: '立即升級',
    ctaClass: 'bg-[#4da6ff] text-white hover:bg-blue-400',
    bestValue: true,
  },
]

// ─── Compare table ────────────────────────────────────────────────────────────
const COMPARE_SECTIONS = [
  {
    title: '圖片生成（2 點/張）',
    rows: [
      { name: '文字生成圖片', sub: '2 點/張', values: ['5 張（一次性）', '50 張', '200 張', '745 張'] },
      { name: '圖片轉圖片',   sub: '3 點/張', values: ['3 張',          '33 張', '133 張', '497 張'] },
    ],
  },
  {
    title: '影片生成（5 點/部）',
    rows: [
      { name: 'Kling 3.0 文字→影片',   sub: '5 點/部', values: ['2 部', '20 部', '80 部', '298 部'] },
      { name: 'Kling 3.0 Omni 圖→影', sub: '5 點/部', values: ['2 部', '20 部', '80 部', '298 部'] },
    ],
  },
  {
    title: '功能',
    rows: [
      { name: '所有 AI 模型使用權', values: [true,  true,  true,  true] },
      { name: '點數永久有效',       values: [true,  true,  true,  true] },
      { name: '生成失敗自動退還',   values: [true,  true,  true,  true] },
      { name: '優先生成佇列',       values: [false, false, true,  true] },
      { name: '大量點數折扣',       values: [false, false, false, true] },
    ],
  },
]

const PLAN_HEADERS = [
  { name: '免費',   sub: '新用戶一次性' },
  { name: 'PLUS',  sub: 'USD $10' },
  { name: 'ULTRA', sub: 'USD $30' },
  { name: 'ELITE', sub: 'USD $100' },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: '點數如何使用？', a: '點數是生成內容的貨幣。標準圖片消耗 1 點，高品質圖片消耗 2-3 點，影片生成消耗 5 點。生成失敗時點數自動退還。' },
  { q: '點數會過期嗎？', a: '不會！GoblinAI 的點數永久有效，一次購買終身使用，沒有月費壓力。' },
  { q: '支援哪些 AI 模型？', a: '圖片支援 FLUX Schnell、FLUX Dev、FLUX 1.1 Pro、SDXL。影片支援 Kling 3.0（文字→影片）與 Kling 3.0 Omni（圖片→影片）。' },
  { q: '如何購買更多點數？', a: '可在定價頁面選擇方案，或聯繫我們取得客製化大量購買優惠。' },
  { q: '可以更改購買方案嗎？', a: '由於點數是一次性購買，可以隨時再次購買任何方案累積點數，沒有鎖定問題。' },
  { q: '生成失敗會扣點嗎？', a: '不會！所有生成失敗都會自動退還點數，請放心使用。' },
  { q: '需要訂閱或月費嗎？', a: '完全不需要！GoblinAI 採用一次性點數制，無月費、無訂閱、無過期日期。' },
]

// ─── Promo Banner countdown ───────────────────────────────────────────────────
function PromoBanner() {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const target = new Date()
    target.setDate(target.getDate() + 7)
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) return
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const Box = ({ v, label }) => (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-lg bg-black/40 text-2xl sm:text-3xl font-black tabular-nums text-white">
        {String(v).padStart(2, '0')}
      </div>
      <span className="mt-1 text-[10px] text-white/50">{label}</span>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6">
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #3b1055 0%, #6b2070 50%, #a02060 100%)' }}>
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="relative grid gap-6 md:grid-cols-3 items-center">
          {/* Left */}
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#c8ff3e] px-3 py-1 text-xs font-black text-black">限時優惠</span>
              <span className="rounded-full bg-[#ff3d8a] px-3 py-1 text-xs font-black text-white">點數買就送</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">限時優惠</h2>
            <p className="text-2xl sm:text-3xl font-black uppercase text-[#ff3d8a]">免費 10 點數</p>
            <p className="mt-2 text-sm text-white/60">新用戶註冊即送，無需信用卡</p>
          </div>
          {/* Countdown */}
          <div className="flex flex-col items-center">
            <p className="mb-3 text-sm text-white/60 flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#ff3d8a]" />
              優惠倒數
            </p>
            <div className="flex gap-2 sm:gap-3">
              <Box v={time.d} label="天" />
              <Box v={time.h} label="時" />
              <Box v={time.m} label="分" />
              <Box v={time.s} label="秒" />
            </div>
          </div>
          {/* Right */}
          <div className="space-y-3">
            {['點數永久有效，不過期', '所有頂尖 AI 模型', '生成失敗自動退還'].map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-[#c8ff3e]">✓</span>
                <span className="text-sm font-medium text-white">{f}</span>
              </div>
            ))}
            <p className="text-xs text-white/30">+ 更多頂級功能限時優惠中</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState(null)
  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <h2 className="text-3xl sm:text-4xl font-black text-center italic mb-10">常見問題</h2>
      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-white/8 bg-[#111114] transition-colors hover:border-white/15">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
              <span className="text-sm font-medium">{faq.q}</span>
              <svg className={`h-5 w-5 shrink-0 text-white/30 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open === i ? 'max-h-40 pb-4' : 'max-h-0'}`}>
              <p className="px-6 text-sm leading-relaxed text-white/50">{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Compare Table ────────────────────────────────────────────────────────────
function CompareTable() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="text-3xl sm:text-4xl font-black uppercase text-center mb-12 tracking-tight">方案比較</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-white/8">
              <th className="w-48 pb-6 pr-4 text-left text-white/30 font-medium text-sm">功能</th>
              {PLAN_HEADERS.map(p => (
                <th key={p.name} className="pb-6 text-left">
                  <div className="font-black text-base">{p.name}</div>
                  <div className="text-xs text-white/40">{p.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_SECTIONS.map(sec => (
              <Fragment key={sec.title}>
                <tr>
                  <td colSpan={5} className="pb-3 pt-8">
                    <h3 className="text-base font-black">{sec.title}</h3>
                  </td>
                </tr>
                {sec.rows.map(row => (
                  <tr key={row.name} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="text-sm text-white/70">{row.name}</div>
                      {row.sub && <div className="text-xs text-white/30">{row.sub}</div>}
                    </td>
                    {row.values.map((val, i) => (
                      <td key={i} className="py-3 text-sm">
                        {val === true  ? <span className="text-[#c8ff3e]">✓</span>
                        : val === false ? <span className="text-white/20">✗</span>
                        : <span className="text-white/60">{val}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Enterprise ───────────────────────────────────────────────────────────────
function Enterprise({ onContact }) {
  const features = [
    '客製化點數方案', '優先技術支援', '批量生成折扣',
    '專屬帳號管理', '進階使用分析', '客製化功能開發',
  ]
  const highlights = [
    { icon: '⚙️', title: '自訂點數額度', desc: '依需求彈性調整' },
    { icon: '∞', title: '無限量合作', desc: '不受標準方案限制' },
    { icon: '✦', title: '更高並行生成', desc: '大量任務同時處理' },
    { icon: '🔒', title: '安全與合規', desc: 'DPA、SSO、資料保護' },
  ]
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="overflow-hidden rounded-2xl bg-[#111114] border border-white/8">
        <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#08080a] text-2xl text-[#c8ff3e]">✓</div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">企業方案</h2>
            <p className="text-2xl sm:text-3xl font-black uppercase text-white/30">大量創作無上限</p>
            <p className="mt-4 text-sm text-white/50">自訂點數配額與企業級安全保障，滿足大型團隊需求</p>
            <button
              onClick={onContact}
              className="mt-6 rounded-xl bg-white px-8 py-3 text-sm font-bold text-black hover:bg-gray-200 transition-all"
            >
              聯繫業務
            </button>
          </div>
          <div>
            <p className="mb-4 text-sm text-white/40">包含所有 ELITE 方案功能，另加：</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {features.map(f => (
                <div key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-sm text-[#c8ff3e]">✓</span>
                  <span className="text-sm text-white/60">{f}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {highlights.map(h => (
                <div key={h.title} className="rounded-xl border border-white/8 bg-[#08080a] p-4">
                  <div className="mb-2 text-2xl">{h.icon}</div>
                  <h4 className="text-sm font-bold">{h.title}</h4>
                  <p className="mt-1 text-xs text-white/30">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Main Pricing Page ────────────────────────────────────────────────────────
export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const handleBuy = async (plan) => {
    if (!user) return navigate('/register')
    setLoading(plan.id)
    try {
      const res = await axios.post('/payment/checkout', { planId: plan.id })
      window.location.href = res.data.url
    } catch (err) {
      const errData = err.response?.data
      if (errData?.error === 'PAYMENT_NOT_CONFIGURED') {
        setSelectedPlan(plan)
        setShowManual(true)
      } else {
        toast.error(errData?.error || '建立付款失敗')
      }
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-white">

      {/* Navbar */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#08080a]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-black text-lg">
            <span className="text-2xl">👺</span>
            <span className="text-white">Goblin</span><span style={{ color: '#c8ff3e' }}>AI</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm"
                  style={{ color: '#c8ff3e', background: 'rgba(200,255,62,0.08)', borderColor: 'rgba(200,255,62,0.2)' }}>
                  <Coins size={13} /><span className="font-black">{user.credits ?? 0}</span><span className="text-xs opacity-60">點</span>
                </div>
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

      {/* Promo Banner */}
      <PromoBanner />

      {/* Heading */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-4">
          升級方案，獲得更佳結果
        </h1>
        <p className="text-white/40 text-lg max-w-2xl mx-auto mb-6">
          解鎖所有頂尖 AI 模型，一次購買永久使用，點數絕不過期。無月費、無訂閱。
        </p>
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#111114] px-4 py-2">
          <span className="text-sm text-[#c8ff3e]">點數買越多越划算</span>
          <Link to="/register" className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50 hover:text-white transition-colors">
            立即領取 →
          </Link>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border-t-4 ${plan.borderTop} bg-[#111114] ${
                plan.popular ? 'glow-pink' : plan.bestValue ? 'glow-blue' : ''
              }`}
            >
              {/* Top banner */}
              {plan.popular && (
                <div className="bg-[#ff3d8a] py-1.5 text-center text-xs font-black text-white tracking-widest">MOST POPULAR</div>
              )}
              {plan.bestValue && (
                <div className="py-1.5 text-center text-xs font-black text-white tracking-widest"
                  style={{ background: 'linear-gradient(90deg,#4da6ff,#2563eb)' }}>BEST VALUE</div>
              )}

              <div className="flex flex-1 flex-col p-6">
                {/* Name + badge */}
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-2xl font-black">{plan.name}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs font-black ${plan.badgeColor}`}>{plan.badge}</span>
                </div>
                <p className="mb-4 text-sm text-white/40">{plan.description}</p>

                {/* Credits */}
                <div className="mb-1 flex items-center gap-2">
                  <Coins size={14} className="text-[#c8ff3e]" />
                  <span className="font-black text-[#c8ff3e]">{plan.credits.toLocaleString()} 點數</span>
                </div>
                {plan.creditsDetail.map(d => (
                  <p key={d} className="ml-6 text-xs text-white/30">{d}</p>
                ))}

                {/* Price */}
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black">${plan.oneTimePrice}</span>
                  <span className="text-sm font-bold text-white/50">USD</span>
                  <span className="text-sm text-white/30">一次購買</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-white/25">每點 ${plan.perCredit} USD</p>
                  {plan.save && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#c8ff3e]/15 text-[#c8ff3e]">
                      省 {plan.save}%
                    </span>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleBuy(plan)}
                  disabled={loading === plan.id}
                  className={`mt-4 w-full rounded-xl py-3 text-sm font-black transition-all active:scale-95 ${plan.ctaClass}`}
                >
                  {loading === plan.id
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />處理中...</span>
                    : `${plan.cta} · ${plan.credits.toLocaleString()} 點`}
                </button>

                {/* Features */}
                <div className="mt-6 space-y-3 border-t border-white/8 pt-5">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <Check size={14} className="mt-0.5 text-[#c8ff3e] shrink-0" />
                      <span className="text-sm text-white/60">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          沒有帳號？
          <Link to="/register" className="ml-1 font-bold text-[#c8ff3e] hover:underline">免費註冊獲得 10 點數</Link>
          ，無需信用卡
        </p>
      </section>

      {/* Model Cost Reference */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black uppercase text-center mb-8 tracking-tight">點數費用對照</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Models */}
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(200,255,62,0.1)' }}>🖼️</div>
              <div>
                <h3 className="font-black">圖片生成模型</h3>
                <p className="text-xs text-white/30">Image Generation</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { name: 'FLUX Schnell', desc: '最快速 · 秒速出圖 · 推薦入門', cost: '2 點/張', badge: '推薦', badgeClass: 'bg-[#c8ff3e]/20 text-[#c8ff3e]' },
                { name: 'FLUX Dev',     desc: '高品質 · 細節豐富 · 創作首選', cost: '2 點/張', badge: null },
                { name: 'FLUX 1.1 Pro', desc: '旗艦級 · 最新頂尖畫質',        cost: '2 點/張', badge: '最新', badgeClass: 'bg-purple-500/20 text-purple-400' },
                { name: 'SDXL',         desc: '通用穩定擴散 · 風格多樣',       cost: '2 點/張', badge: null },
              ].map(m => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{m.name}</span>
                      {m.badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.badgeClass}`}>{m.badge}</span>}
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">{m.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 font-black text-sm shrink-0 ml-4" style={{ color: '#c8ff3e' }}>
                    <Coins size={12} />{m.cost}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Video Models */}
          <div className="bg-[#111114] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(255,61,138,0.1)' }}>🎬</div>
              <div>
                <h3 className="font-black">影片生成模型</h3>
                <p className="text-xs text-white/30">Video Generation</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Kling 3.0',      desc: '電影級畫質 · 文字直接生成 5 秒影片',  cost: '5 點/部', badge: '最新', badgeClass: 'bg-[#ff3d8a]/20 text-[#ff3d8a]', mode: '文字→影片' },
                { name: 'Kling 3.0 Omni', desc: '圖片轉影片 · 多模態生成 · 精準控制', cost: '5 點/部', badge: 'I2V',  badgeClass: 'bg-blue-500/20 text-blue-400',  mode: '圖片→影片' },
              ].map(m => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{m.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.badgeClass}`}>{m.badge}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-white/10 text-white/40">{m.mode}</span>
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">{m.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 font-black text-sm shrink-0 ml-4" style={{ color: '#c8ff3e' }}>
                    <Coins size={12} />{m.cost}
                  </div>
                </div>
              ))}
            </div>

            {/* Credit cost quick ref */}
            <div className="mt-6 pt-5 border-t border-white/8">
              <p className="text-xs text-white/30 mb-3 font-semibold uppercase tracking-wider">生成數量對照</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'PLUS (100點)', images: '50', videos: '20' },
                  { label: 'ULTRA (400點)', images: '200', videos: '80' },
                  { label: 'ELITE (1491點)', images: '745', videos: '298' },
                ].map(r => (
                  <div key={r.label} className="bg-[#08080a] rounded-lg p-3">
                    <p className="font-bold text-white/60 mb-1">{r.label}</p>
                    <p className="text-white/40">🖼️ {r.images} 張圖</p>
                    <p className="text-white/40">🎬 {r.videos} 部影片</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-white/20 mt-4">生成失敗自動退還點數 · 點數永久不過期</p>
      </section>

      {/* Compare Table */}
      <CompareTable />

      {/* Enterprise */}
      <Enterprise onContact={() => { setSelectedPlan({ name: '企業方案', credits: '自訂' }); setShowManual(true) }} />

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-white/40">準備好了嗎？</span>
          <Link to="/register" className="btn-neon">立即免費開始</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-black">
            <span>👺</span><span className="text-white">Goblin</span><span style={{ color: '#c8ff3e' }}>AI</span>
          </div>
          <div className="flex gap-6 text-white/30 text-sm">
            <Link to="/pricing" className="hover:text-white transition-colors">定價</Link>
            <Link to="/login"   className="hover:text-white transition-colors">登入</Link>
            <Link to="/register" className="hover:text-white transition-colors">註冊</Link>
          </div>
          <p className="text-white/20 text-xs">© 2025 Goblin AI 影像生成</p>
        </div>
      </footer>

      {/* Manual Payment Modal */}
      {showManual && selectedPlan && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/10 rounded-2xl max-w-md w-full p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg">購買 {selectedPlan.name}</h3>
              <button onClick={() => setShowManual(false)} className="text-white/30 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {selectedPlan.credits !== '自訂' && (
              <div className="rounded-xl p-4 mb-5 text-center" style={{ background: 'rgba(200,255,62,0.08)', border: '1px solid rgba(200,255,62,0.2)' }}>
                <div className="text-4xl font-black">${selectedPlan.oneTimePrice} <span className="text-lg font-bold text-white/40">USD</span></div>
                <div className="font-black mt-1" style={{ color: '#c8ff3e' }}>{selectedPlan.credits.toLocaleString()} 點數</div>
                {selectedPlan.save && <div className="text-xs text-[#c8ff3e]/60 mt-1">比入門方案省 {selectedPlan.save}%</div>}
              </div>
            )}
            <div className="space-y-2 text-sm text-white/40 mb-6">
              <p className="font-semibold text-white/70">購買方式：</p>
              <p>1. 記下你的帳號 Email</p>
              <p>2. 透過下方聯繫方式告知購買方案</p>
              <p>3. 付款完成後 24 小時內手動發點</p>
            </div>
            <a href="mailto:contact@goblinai.com"
              className="btn-neon w-full flex items-center justify-center gap-2 py-3 mb-2">
              <MessageCircle size={16} />Email 聯繫購買
            </a>
            <button onClick={() => setShowManual(false)}
              className="w-full py-3 bg-white/8 hover:bg-white/12 rounded-xl text-sm font-medium transition-colors">
              取消
            </button>
            {user && <p className="text-center text-white/20 text-xs mt-3">你的帳號：{user.email}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
