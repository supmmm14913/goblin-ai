import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Check, X, Coins, MessageCircle, Zap, ChevronDown, ChevronUp, Info } from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: '入門包',
    badge: null,
    price: 5,
    credits: 50,
    perCredit: '0.10',
    headerBg: 'bg-white/5',
    border: 'border-white/10',
    btnClass: 'w-full py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-all',
    models: [
      { name: 'FLUX Schnell', cost: '1 點/張', included: true },
      { name: 'FLUX Dev', cost: '2 點/張', included: true },
      { name: 'SDXL', cost: '1 點/張', included: true },
      { name: 'FLUX 1.1 Pro', cost: '3 點/張', included: true },
      { name: 'Kling 影片', cost: '5 點/5s', included: true },
      { name: 'Wan 影片', cost: '5 點/段', included: true },
    ],
  },
  {
    id: 'popular',
    name: '進階包',
    badge: '🔥 MOST POPULAR',
    badgeBg: 'bg-[#ff3d8a]',
    price: 12,
    credits: 150,
    perCredit: '0.08',
    headerBg: 'bg-gradient-to-b from-[#ff3d8a]/20 to-transparent',
    border: 'border-[#ff3d8a]/50',
    btnClass: 'w-full py-3 rounded-xl font-bold text-sm bg-[#ff3d8a] hover:bg-[#ff3d8a]/80 text-white transition-all',
    glow: '0 0 30px rgba(255,61,138,0.2)',
    models: [
      { name: 'FLUX Schnell', cost: '1 點/張', included: true },
      { name: 'FLUX Dev', cost: '2 點/張', included: true },
      { name: 'SDXL', cost: '1 點/張', included: true },
      { name: 'FLUX 1.1 Pro', cost: '3 點/張', included: true },
      { name: 'Kling 影片', cost: '5 點/5s', included: true },
      { name: 'Wan 影片', cost: '5 點/段', included: true },
    ],
  },
  {
    id: 'pro',
    name: '菁英包',
    badge: '⚡ BEST VALUE',
    badgeBg: 'bg-blue-600',
    price: 25,
    credits: 350,
    perCredit: '0.07',
    headerBg: 'bg-gradient-to-b from-blue-600/20 to-transparent',
    border: 'border-blue-500/50',
    btnClass: 'w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all',
    glow: '0 0 30px rgba(59,130,246,0.2)',
    models: [
      { name: 'FLUX Schnell', cost: '1 點/張', included: true },
      { name: 'FLUX Dev', cost: '2 點/張', included: true },
      { name: 'SDXL', cost: '1 點/張', included: true },
      { name: 'FLUX 1.1 Pro', cost: '3 點/張', included: true },
      { name: 'Kling 影片', cost: '5 點/5s', included: true },
      { name: 'Wan 影片', cost: '5 點/段', included: true },
    ],
  },
]

const IMAGE_MODELS = [
  { name: 'FLUX Schnell', desc: '最快速圖片生成 · 秒速出圖', cost: '1 點', badge: '推薦', badgeColor: 'bg-[#c8ff3e]/20 text-[#c8ff3e]' },
  { name: 'FLUX Dev', desc: '高品質細節豐富', cost: '2 點', badge: null },
  { name: 'FLUX 1.1 Pro', desc: '頂級畫質 · 最細膩', cost: '3 點', badge: '最高畫質', badgeColor: 'bg-purple-500/20 text-purple-400' },
  { name: 'SDXL', desc: '通用穩定擴散模型', cost: '1 點', badge: null },
  { name: 'FLUX LoRA', desc: '自訂風格融合', cost: '2 點', badge: '風格定制', badgeColor: 'bg-blue-500/20 text-blue-400' },
]

const VIDEO_MODELS = [
  { name: 'Kling 1.6', desc: '超真實感影片 · 業界頂尖', cost: '5 點/5s', badge: '頂尖', badgeColor: 'bg-[#ff3d8a]/20 text-[#ff3d8a]' },
  { name: 'Wan 2.1', desc: '高創意影片生成', cost: '5 點/段', badge: null },
  { name: 'MiniMax Video', desc: '電影級畫面品質', cost: '6 點/段', badge: '電影級', badgeColor: 'bg-amber-500/20 text-amber-400' },
]

const COMPARE_ROWS = [
  { label: '點數', free: '10 點（一次性）', starter: '50 點', popular: '150 點', pro: '350 點' },
  { label: '每點費用', free: '-', starter: '$0.10', popular: '$0.08', popular_highlight: true, pro: '$0.07', pro_highlight: true },
  { label: '圖片生成（標準）', free: '10 張', starter: '50 張', popular: '150 張', pro: '350 張' },
  { label: '影片生成', free: '2 部', starter: '10 部', popular: '30 部', pro: '70 部' },
  { label: '所有 AI 模型', free: true, starter: true, popular: true, pro: true },
  { label: '點數永久有效', free: true, starter: true, popular: true, pro: true },
  { label: '生成歷史記錄', free: true, starter: true, popular: true, pro: true },
  { label: '優先生成佇列', free: false, starter: false, popular: true, pro: true },
]

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showCompare, setShowCompare] = useState(false)

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
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 rounded-lg text-sm" style={{ color: '#c8ff3e', background: 'rgba(200,255,62,0.08)', borderColor: 'rgba(200,255,62,0.2)' }}>
                  <Coins size={13} /><span className="font-black">{user.credits}</span><span className="text-xs opacity-60">點</span>
                </div>
                <Link to="/generate" className="btn-neon py-1.5 px-4 text-xs">開始創作</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-white/50 hover:text-white text-sm px-3 py-1.5 transition-colors">登入</Link>
                <Link to="/register" className="btn-neon py-1.5 px-4 text-xs">免費開始</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-5xl font-black mb-4 tracking-tight uppercase">
            升級方案<br />
            <span style={{ color: '#c8ff3e' }}>獲得更佳生成結果</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            解鎖全部 AI 模型 · 一次購買永久使用 · 點數不過期
          </p>
          {user && (
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: 'rgba(200,255,62,0.08)', border: '1px solid rgba(200,255,62,0.2)', color: '#c8ff3e' }}>
              <Coins size={14} />目前剩餘 <strong>{user.credits}</strong> 點數
            </div>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border overflow-hidden flex flex-col ${plan.border}`}
              style={plan.glow ? { boxShadow: plan.glow, background: '#0e0e11' } : { background: '#0e0e11' }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="text-center py-2 text-xs font-black tracking-wider" style={{ background: plan.id === 'popular' ? '#ff3d8a' : '#2563eb' }}>
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className={`p-6 pb-4 ${plan.headerBg}`}>
                <h3 className="font-black text-xl mb-4">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black">${plan.price}</span>
                  <span className="text-white/40 text-sm mb-2">一次購買</span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1" style={{ color: '#c8ff3e' }}>
                    <Coins size={14} />
                    <span className="font-black text-lg">{plan.credits} 點數</span>
                  </div>
                  <span className="text-white/30 text-xs">每點 ${plan.perCredit}</span>
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 pb-4">
                <button
                  onClick={() => handleBuy(plan)}
                  disabled={loading === plan.id}
                  className={plan.btnClass}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      處理中...
                    </span>
                  ) : `購買 ${plan.credits} 點`}
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-white/5 mx-6" />

              {/* Models */}
              <div className="p-6 pt-4 flex-1">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">可用模型</p>
                <div className="space-y-2.5">
                  {plan.models.map((m, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={13} style={{ color: '#c8ff3e' }} className="flex-shrink-0" />
                        <span className="text-sm text-white/70">{m.name}</span>
                      </div>
                      <span className="text-xs font-mono text-white/40">{m.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Free plan note */}
        <div className="text-center mb-16">
          <p className="text-white/30 text-sm">
            沒有帳號？
            <Link to="/register" className="ml-1 font-bold hover:underline" style={{ color: '#c8ff3e' }}>免費註冊獲得 10 點數</Link>
            ，立即體驗所有模型
          </p>
        </div>

        {/* Image Models Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(200,255,62,0.1)' }}>🖼️</div>
            <div>
              <h2 className="font-black text-xl">圖片生成模型</h2>
              <p className="text-white/40 text-sm">所有方案皆可使用全部模型</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {IMAGE_MODELS.map((m, i) => (
              <div key={i} className="bg-[#111114] border border-white/8 rounded-xl p-4 flex items-center justify-between hover:border-white/15 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{m.name}</span>
                    {m.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.badgeColor}`}>{m.badge}</span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs">{m.desc}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="flex items-center gap-1 font-bold text-sm" style={{ color: '#c8ff3e' }}>
                    <Coins size={12} />{m.cost}
                  </div>
                  <p className="text-white/30 text-xs">每張</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Models Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(255,61,138,0.1)' }}>🎬</div>
            <div>
              <h2 className="font-black text-xl">影片生成模型</h2>
              <p className="text-white/40 text-sm">文字或圖片轉影片</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VIDEO_MODELS.map((m, i) => (
              <div key={i} className="bg-[#111114] border border-white/8 rounded-xl p-4 flex items-center justify-between hover:border-white/15 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{m.name}</span>
                    {m.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.badge ? m.badgeColor : ''}`}>{m.badge}</span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs">{m.desc}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="flex items-center gap-1 font-bold text-sm" style={{ color: '#c8ff3e' }}>
                    <Coins size={12} />{m.cost}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compare Plans */}
        <div className="mb-16">
          <button
            onClick={() => setShowCompare(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl font-bold text-sm transition-colors"
          >
            {showCompare ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            比較所有方案功能
          </button>

          {showCompare && (
            <div className="mt-4 bg-[#0e0e11] border border-white/8 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-5 py-4 text-white/40 font-medium w-1/3">功能</th>
                      <th className="px-5 py-4 text-white/40 font-medium text-center">免費</th>
                      <th className="px-5 py-4 text-white/60 font-medium text-center">入門 $5</th>
                      <th className="px-5 py-4 font-bold text-center" style={{ color: '#ff3d8a' }}>進階 $12</th>
                      <th className="px-5 py-4 font-bold text-center text-blue-400">菁英 $25</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {COMPARE_ROWS.map((row, i) => (
                      <tr key={i} className="hover:bg-white/2">
                        <td className="px-5 py-3.5 text-white/60">{row.label}</td>
                        {['free', 'starter', 'popular', 'pro'].map(tier => (
                          <td key={tier} className="px-5 py-3.5 text-center">
                            {typeof row[tier] === 'boolean' ? (
                              row[tier]
                                ? <Check size={16} className="mx-auto" style={{ color: '#c8ff3e' }} />
                                : <X size={16} className="mx-auto text-white/20" />
                            ) : (
                              <span className={`font-medium ${tier === 'popular' ? 'text-[#ff3d8a]' : tier === 'pro' ? 'text-blue-400' : 'text-white/70'}`}>
                                {row[tier]}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Credit Cost Reference */}
        <div className="bg-[#0e0e11] border border-white/8 rounded-2xl p-7 max-w-lg mx-auto mb-10">
          <h3 className="font-black text-center mb-5">點數費用對照表</h3>
          <div className="space-y-3">
            {[
              { icon: '⚡', label: '標準圖片 (FLUX Schnell)', cost: 1 },
              { icon: '🎨', label: '精細圖片 (FLUX Dev)', cost: 2 },
              { icon: '💎', label: '頂級圖片 (FLUX 1.1 Pro)', cost: 3 },
              { icon: '🎬', label: '文字生成影片 (Kling)', cost: 5 },
              { icon: '🔄', label: '圖片生成影片', cost: 5 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <span>{item.icon}</span>{item.label}
                </div>
                <div className="flex items-center gap-1 font-bold text-sm" style={{ color: '#c8ff3e' }}>
                  <Coins size={12} />{item.cost} 點
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/8 text-center text-white/20 text-xs">
            生成失敗自動退還點數 · 點數永久不過期
          </div>
        </div>

        {/* Enterprise / Contact */}
        <div className="text-center">
          <p className="text-white/30 text-sm mb-3">需要大量點數或客製化方案？</p>
          <button
            onClick={() => { setSelectedPlan({ name: '客製方案', credits: '自訂' }); setShowManual(true) }}
            className="bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl py-2.5 px-7 text-sm font-bold transition-colors"
          >
            聯絡我們
          </button>
        </div>
      </div>

      {/* Manual Payment Modal */}
      {showManual && selectedPlan && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/10 rounded-2xl max-w-md w-full p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">購買 {selectedPlan.name}</h3>
              <button onClick={() => setShowManual(false)} className="text-white/30 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {selectedPlan.credits !== '自訂' && (
              <div className="rounded-xl p-4 mb-5 text-center" style={{ background: 'rgba(200,255,62,0.08)', border: '1px solid rgba(200,255,62,0.2)' }}>
                <div className="text-4xl font-black">${selectedPlan.price}</div>
                <div className="font-bold mt-1" style={{ color: '#c8ff3e' }}>{selectedPlan.credits} 點數</div>
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
            <button onClick={() => setShowManual(false)} className="w-full py-3 bg-white/8 hover:bg-white/12 rounded-xl text-sm font-medium transition-colors">
              取消
            </button>
            {user && <p className="text-center text-white/20 text-xs mt-3">你的帳號：{user.email}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
