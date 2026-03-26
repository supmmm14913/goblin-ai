import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Check, X, Coins, Sparkles, Zap, MessageCircle, Image, Video } from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    badge: null,
    monthlyPrice: 5,
    annualPrice: 4,
    credits: 50,
    color: 'border-white/10',
    btnClass: 'btn-secondary',
    features: [
      { text: '50 點數 / 月', included: true },
      { text: '50 張圖片 或 10 支影片', included: true },
      { text: '所有 AI 模型', included: true },
      { text: '點數永久有效', included: true },
      { text: '生成歷史記錄', included: true },
      { text: '優先生成', included: false },
      { text: '最低點數單價', included: false },
    ]
  },
  {
    id: 'popular',
    name: 'Creator',
    badge: { text: 'MOST POPULAR', color: 'badge-neon' },
    monthlyPrice: 15,
    annualPrice: 11,
    credits: 200,
    color: 'border-[#c8ff3e]/40',
    btnClass: 'btn-neon',
    glow: 'glow-neon',
    features: [
      { text: '200 點數 / 月', included: true },
      { text: '200 張圖片 或 40 支影片', included: true },
      { text: '所有 AI 模型', included: true },
      { text: '點數永久有效', included: true },
      { text: '生成歷史記錄', included: true },
      { text: '優先生成佇列', included: true },
      { text: '最低點數單價', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: { text: 'BEST VALUE', color: 'badge-pink' },
    monthlyPrice: 30,
    annualPrice: 22,
    credits: 600,
    color: 'border-[#ff3d8a]/40',
    btnClass: 'btn-pink',
    glow: 'glow-pink',
    features: [
      { text: '600 點數 / 月', included: true },
      { text: '600 張圖片 或 120 支影片', included: true },
      { text: '所有 AI 模型', included: true },
      { text: '點數永久有效', included: true },
      { text: '生成歷史記錄', included: true },
      { text: '優先生成佇列', included: true },
      { text: '最低點數單價', included: true, badge: '90% CHEAPER' },
    ]
  },
]

const CREDIT_COSTS = [
  { icon: '🖼️', label: '文字生成圖片', cost: 1 },
  { icon: '🔄', label: '圖片轉圖片',   cost: 2 },
  { icon: '🎬', label: '文字生成影片', cost: 5 },
  { icon: '✨', label: '圖片生成影片', cost: 5 },
]

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(false)
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

  const getPrice = (plan) => annual ? plan.annualPrice : plan.monthlyPrice
  const getSavings = (plan) => Math.round((1 - plan.annualPrice / plan.monthlyPrice) * 100)

  return (
    <div className="min-h-screen bg-[#08080a]">
      {/* 促銷橫幅 */}
      <div className="bg-gradient-to-r from-[#c8ff3e]/15 via-[#ff3d8a]/15 to-[#c8ff3e]/15 border-b border-white/5 py-2 px-4 text-center text-sm">
        <span className="badge-neon mr-2">限時</span>
        <span className="text-white/60">年付方案享 </span>
        <span className="text-neon font-bold">25% 折扣</span>
        <span className="text-white/60"> · 點數永不過期</span>
      </div>

      {/* Navbar */}
      <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#08080a]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-black text-lg">
            <span className="text-2xl">👺</span>
            <span className="text-white">Goblin</span><span className="text-neon">AI</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-1.5 bg-[#c8ff3e]/10 border border-[#c8ff3e]/20 text-neon px-3 py-1.5 rounded-lg text-sm">
                  <Coins size={13} /><span className="font-black">{user.credits}</span><span className="text-neon/60 text-xs">點</span>
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

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3 tracking-tight">選擇你的方案</h1>
          <p className="text-white/40 mb-8">點數永久有效 · 按需購買 · 隨時取消</p>

          {/* 月付/年付切換 */}
          <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1 gap-1">
            <button onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>
              月付
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>
              年付
              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${annual ? 'bg-[#c8ff3e] text-black' : 'bg-[#c8ff3e]/20 text-neon'}`}>
                省 25%
              </span>
            </button>
          </div>

          {user && (
            <div className="mt-4 inline-flex items-center gap-2 bg-[#c8ff3e]/10 border border-[#c8ff3e]/20 text-neon px-4 py-2 rounded-full text-sm">
              <Coins size={14} />目前剩餘 <strong>{user.credits}</strong> 點數
            </div>
          )}
        </div>

        {/* 方案卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {PLANS.map(plan => (
            <div key={plan.id} className={`relative bg-[#111114] border rounded-2xl p-7 flex flex-col transition-all ${plan.color} ${plan.glow || ''}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={plan.badge.color}>{plan.badge.text}</span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-black text-xl mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mt-3">
                  <span className="text-5xl font-black">${getPrice(plan)}</span>
                  <span className="text-white/40 text-sm mb-2">/月</span>
                </div>
                {annual && (
                  <div className="text-white/30 text-xs mt-1">
                    年付 ${getPrice(plan) * 12} · 省 {getSavings(plan)}%
                  </div>
                )}
                <div className="mt-2">
                  <span className="text-neon font-bold">{plan.credits} 點數</span>
                  <span className="text-white/30 text-xs ml-2">/ 月</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    {f.included ? (
                      <Check size={14} className="text-neon flex-shrink-0" />
                    ) : (
                      <X size={14} className="text-white/20 flex-shrink-0" />
                    )}
                    <span className={f.included ? 'text-white/70' : 'text-white/20'}>{f.text}</span>
                    {f.badge && <span className="badge-neon ml-auto">{f.badge}</span>}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuy(plan)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.btnClass}`}>
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />處理中...
                  </span>
                ) : `購買 ${plan.credits} 點 · $${getPrice(plan)}`}
              </button>
            </div>
          ))}
        </div>

        {/* 點數費用表 */}
        <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 max-w-lg mx-auto mb-8">
          <h3 className="font-bold text-center mb-6">點數費用說明</h3>
          <div className="space-y-4">
            {CREDIT_COSTS.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <span>{item.icon}</span>{item.label}
                </div>
                <div className="flex items-center gap-1 text-neon font-bold text-sm">
                  <Coins size={12} />{item.cost} 點
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/8 text-center text-white/20 text-xs">
            生成失敗自動退還點數 · 點數永久不過期
          </div>
        </div>

        {/* 企業 / 聯絡 */}
        <div className="text-center">
          <p className="text-white/30 text-sm mb-3">需要大量點數或客製方案？</p>
          <button onClick={() => { setSelectedPlan({ name: '企業方案', credits: '自訂', priceUSD: 0 }); setShowManual(true) }}
            className="btn-secondary text-sm py-2 px-6">聯絡我們</button>
        </div>
      </div>

      {/* 手動付款 Modal */}
      {showManual && selectedPlan && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/10 rounded-2xl max-w-md w-full p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">購買 {selectedPlan.name}</h3>
              <button onClick={() => setShowManual(false)} className="text-white/30 hover:text-white"><X size={20} /></button>
            </div>
            {selectedPlan.credits !== '自訂' && (
              <div className="bg-[#c8ff3e]/10 border border-[#c8ff3e]/20 rounded-xl p-4 mb-5 text-center">
                <div className="text-4xl font-black">${selectedPlan.monthlyPrice || selectedPlan.priceUSD}</div>
                <div className="text-neon font-bold mt-1">{selectedPlan.credits} 點數</div>
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
            <button onClick={() => setShowManual(false)} className="btn-secondary w-full py-3 text-sm">取消</button>
            {user && <p className="text-center text-white/20 text-xs mt-3">你的帳號：{user.email}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
