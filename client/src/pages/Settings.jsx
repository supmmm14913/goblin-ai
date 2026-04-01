import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Link, useSearchParams } from 'react-router-dom'
import { User, Link2, Lock, Mail, Coins, Copy, Check, Eye, EyeOff, ExternalLink, Image, Video, Play, Globe, Trash2 } from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: '入門包',
    price: 5,
    credits: 50,
    perCredit: '0.10',
    border: 'border-white/10',
    btnClass: 'w-full py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-all',
  },
  {
    id: 'popular',
    name: '進階包',
    badge: '🔥 最受歡迎',
    price: 12,
    credits: 150,
    perCredit: '0.08',
    border: 'border-[#ff3d8a]/50',
    btnClass: 'w-full py-2.5 rounded-xl font-bold text-sm bg-[#ff3d8a] hover:bg-[#ff3d8a]/80 text-white transition-all',
    glow: '0 0 20px rgba(255,61,138,0.15)',
  },
  {
    id: 'pro',
    name: '菁英包',
    badge: '⚡ 最划算',
    price: 25,
    credits: 350,
    perCredit: '0.07',
    border: 'border-blue-500/50',
    btnClass: 'w-full py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all',
    glow: '0 0 20px rgba(59,130,246,0.15)',
  },
]

const TABS = [
  { id: 'profile',   icon: <User size={15} />,   label: '個人資料' },
  { id: 'portfolio', icon: <Image size={15} />,  label: '我的作品集' },
  { id: 'referral',  icon: <Link2 size={15} />,  label: '推薦連結' },
  { id: 'password',  icon: <Lock size={15} />,   label: '修改密碼' },
  { id: 'email',     icon: <Mail size={15} />,   label: '修改信箱' },
  { id: 'credits',   icon: <Coins size={15} />,  label: '購買點數' },
]

export default function Settings() {
  const { user, updateCredits } = useAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'profile')
  const [profile, setProfile] = useState(null)
  const [copied, setCopied] = useState(false)
  const [buyLoading, setBuyLoading] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  // 作品集
  const [portfolio, setPortfolio] = useState({ records: [], total: 0, totalPages: 1 })
  const [portfolioPage, setPortfolioPage] = useState(1)
  const [portfolioFilter, setPortfolioFilter] = useState('')
  const [portfolioLoading, setPortfolioLoading] = useState(false)

  // 修改密碼
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // 修改信箱
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' })
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    axios.get('/auth/me').then(r => setProfile(r.data.user)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== 'portfolio') return
    setPortfolioLoading(true)
    axios.get('/portfolio/me', { params: { type: portfolioFilter || undefined, page: portfolioPage, limit: 12 } })
      .then(r => setPortfolio(r.data))
      .catch(() => {})
      .finally(() => setPortfolioLoading(false))
  }, [tab, portfolioFilter, portfolioPage])

  const toggleVisibility = async (genId, current) => {
    try {
      const res = await axios.put(`/portfolio/${genId}/visibility`)
      setPortfolio(prev => ({
        ...prev,
        records: prev.records.map(r => r.id === genId ? { ...r, is_public: res.data.is_public } : r)
      }))
      toast.success(res.data.is_public ? '已設為公開' : '已設為私密')
    } catch { toast.error('更新失敗') }
  }

  const deleteGen = async (genId) => {
    if (!confirm('確定要刪除此作品嗎？')) return
    try {
      await axios.delete(`/portfolio/${genId}`)
      setPortfolio(prev => ({
        ...prev,
        records: prev.records.filter(r => r.id !== genId),
        total: prev.total - 1
      }))
      toast.success('已刪除')
    } catch { toast.error('刪除失敗') }
  }

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/register?ref=${profile.referral_code}`
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('推薦連結已複製！')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('兩次密碼不一致')
    setPwLoading(true)
    try {
      await axios.patch('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('密碼已更新！')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || '更新失敗')
    } finally { setPwLoading(false) }
  }

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    setEmailLoading(true)
    try {
      await axios.patch('/auth/change-email', emailForm)
      toast.success('信箱已更新！請重新登入')
      setEmailForm({ newEmail: '', password: '' })
      setProfile(prev => ({ ...prev, email: emailForm.newEmail }))
    } catch (err) {
      toast.error(err.response?.data?.error || '更新失敗')
    } finally { setEmailLoading(false) }
  }

  const handleBuy = async (plan) => {
    setBuyLoading(plan.id)
    try {
      const res = await axios.post('/payment/checkout', { planId: plan.id })
      window.location.href = res.data.url
    } catch (err) {
      const e = err.response?.data
      if (e?.error === 'PAYMENT_NOT_CONFIGURED') {
        setSelectedPlan(plan)
        setShowManual(true)
      } else {
        toast.error(e?.message || '建立付款失敗')
      }
    } finally { setBuyLoading(null) }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-black mb-6">帳號設定</h1>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
              ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* 個人資料 */}
      {tab === 'profile' && profile && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">個人資料</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">用戶名稱</p>
              <p className="font-bold">{profile.username}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">電子信箱</p>
              <p className="font-bold text-sm truncate">{profile.email}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">剩餘點數</p>
              <p className="font-black text-xl" style={{ color: '#c8ff3e' }}>
                {profile.credits} <span className="text-sm text-white/40">點</span>
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">加入日期</p>
              <p className="font-bold text-sm">{new Date(profile.created_at).toLocaleDateString('zh-TW')}</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">會員 ID</p>
            <p className="font-mono text-xs text-white/50">{profile.id}</p>
          </div>
          {profile.role === 'admin' && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <span className="text-red-400 text-xs font-bold">👑 管理員帳號</span>
            </div>
          )}
        </div>
      )}

      {/* 我的作品集 */}
      {tab === 'portfolio' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">我的作品集</h2>
              <p className="text-white/40 text-sm mt-0.5">管理你的圖片和影片，切換公開或私密狀態</p>
            </div>
            <Link to="/explore" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-neon transition-colors">
              <Globe size={12} />瀏覽探索頁
            </Link>
          </div>

          {/* 篩選 */}
          <div className="flex gap-2">
            {[{ v: '', label: '全部' }, { v: 'text-to-image', label: '圖片' }, { v: 'text-to-video', label: '影片' }].map(f => (
              <button key={f.v} onClick={() => { setPortfolioFilter(f.v); setPortfolioPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${portfolioFilter === f.v ? 'bg-[#c8ff3e] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {portfolioLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#c8ff3e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : portfolio.records.length === 0 ? (
            <div className="py-16 text-center bg-white/3 rounded-2xl border border-white/8">
              <p className="text-white/30 mb-3">還沒有作品</p>
              <Link to="/generate" className="btn-neon text-sm">立即生成</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolio.records.map(item => {
                  const isVideo = item.type === 'text-to-video' || item.type === 'image-to-video'
                  const url = isVideo ? item.video_url : item.image_url
                  if (!url) return null
                  return (
                    <div key={item.id} className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/8">
                      {isVideo ? (
                        <div className="aspect-video bg-black flex items-center justify-center">
                          <Play size={20} className="text-white/40" />
                        </div>
                      ) : (
                        <img src={url} alt={item.prompt} className="w-full aspect-square object-cover" loading="lazy" />
                      )}
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => toggleVisibility(item.id, item.is_public)}
                            title={item.is_public ? '設為私密' : '設為公開'}
                            className={`p-1.5 rounded-lg transition-colors ${item.is_public ? 'bg-[#c8ff3e]/20 text-neon hover:bg-[#c8ff3e]/30' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
                            <Globe size={13} />
                          </button>
                          <button onClick={() => deleteGen(item.id)}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div>
                          <p className="text-xs text-white/70 line-clamp-2">{item.prompt}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.is_public ? 'bg-[#c8ff3e]/20 text-neon' : 'bg-white/10 text-white/40'}`}>
                              {item.is_public ? '公開' : '私密'}
                            </span>
                            <span className="text-white/30 text-xs">{new Date(item.created_at).toLocaleDateString('zh-TW')}</span>
                          </div>
                        </div>
                      </div>
                      {/* Visibility badge (always visible) */}
                      {!item.is_public && (
                        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur rounded-full px-2 py-0.5 text-xs text-white/50">私密</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {portfolio.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button disabled={portfolioPage <= 1} onClick={() => setPortfolioPage(p => p - 1)}
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm disabled:opacity-30 transition-colors">上一頁</button>
                  <span className="px-3 py-1.5 text-white/40 text-sm">{portfolioPage} / {portfolio.totalPages}</span>
                  <button disabled={portfolioPage >= portfolio.totalPages} onClick={() => setPortfolioPage(p => p + 1)}
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm disabled:opacity-30 transition-colors">下一頁</button>
                </div>
              )}

              <p className="text-xs text-white/25 text-center">點擊作品可切換公開/私密狀態 · 公開作品可在探索頁面被其他用戶搜尋到</p>
            </>
          )}
        </div>
      )}

      {/* 推薦連結 */}
      {tab === 'referral' && profile && (
        <div className="card space-y-5">
          <h2 className="font-bold text-lg">推薦連結</h2>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(200,255,62,0.05)', border: '1px solid rgba(200,255,62,0.2)' }}>
            <p className="font-black text-3xl mb-1" style={{ color: '#c8ff3e' }}>{profile.referralCount || 0}</p>
            <p className="text-white/40 text-sm">成功推薦人數</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4" style={{ borderColor: 'rgba(200,255,62,0.2)', border: '1px solid' }}>
            <p className="text-white/40 text-xs mb-2">你的推薦碼</p>
            <p className="font-mono font-black text-xl tracking-widest" style={{ color: '#c8ff3e' }}>{profile.referral_code}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-2">推薦連結（分享給朋友）</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/50 truncate">
                {referralLink}
              </div>
              <button onClick={copyLink}
                className="flex items-center gap-1.5 text-black text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0"
                style={{ background: '#c8ff3e' }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '已複製' : '複製'}
              </button>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm text-white/50">
            <p className="text-white font-semibold text-xs mb-2">推薦獎勵規則</p>
            <p>• 朋友使用你的推薦碼註冊 → 他們獲得 <span className="font-bold" style={{ color: '#c8ff3e' }}>30 點</span></p>
            <p>• 同時你也獲得 <span className="font-bold" style={{ color: '#c8ff3e' }}>30 點</span> 獎勵</p>
            <p>• 無限制推薦人數，越多越多！</p>
          </div>
        </div>
      )}

      {/* 修改密碼 */}
      {tab === 'password' && (
        <div className="card">
          <h2 className="font-bold text-lg mb-5">修改密碼</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { key: 'currentPassword', label: '目前密碼', placeholder: '輸入目前密碼' },
              { key: 'newPassword', label: '新密碼', placeholder: '至少 6 個字元' },
              { key: 'confirmPassword', label: '確認新密碼', placeholder: '再次輸入新密碼' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-white/40 mb-1.5">{f.label}</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type={showPw ? 'text' : 'password'} className="input-field pl-9 pr-10" placeholder={f.placeholder}
                    value={pwForm[f.key]} onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })} required />
                  {f.key === 'newPassword' && (
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="submit" className="btn-neon w-full py-3 font-bold" disabled={pwLoading}>
              {pwLoading ? '更新中...' : '更新密碼'}
            </button>
          </form>
        </div>
      )}

      {/* 修改信箱 */}
      {tab === 'email' && (
        <div className="card">
          <h2 className="font-bold text-lg mb-2">修改信箱</h2>
          <p className="text-white/40 text-sm mb-5">目前信箱：<span className="text-white">{user?.email}</span></p>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">新信箱</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="email" className="input-field pl-9" placeholder="new@example.com"
                  value={emailForm.newEmail} onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">確認密碼</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="password" className="input-field pl-9" placeholder="輸入密碼確認"
                  value={emailForm.password} onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="btn-neon w-full py-3 font-bold" disabled={emailLoading}>
              {emailLoading ? '更新中...' : '更新信箱'}
            </button>
          </form>
        </div>
      )}

      {/* 購買點數 */}
      {tab === 'credits' && (
        <div className="space-y-4">
          {/* 剩餘點數 */}
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-white/40 text-sm">目前剩餘點數</p>
              <p className="font-black text-3xl" style={{ color: '#c8ff3e' }}>
                {user?.credits ?? 0} <span className="text-base text-white/40">點</span>
              </p>
            </div>
            <Coins size={36} style={{ color: 'rgba(200,255,62,0.3)' }} />
          </div>

          {/* 方案卡片 */}
          <div className="grid gap-3">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative bg-[#111114] border rounded-2xl p-5 flex items-center justify-between ${plan.border}`}
                style={plan.glow ? { boxShadow: plan.glow } : {}}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-4 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: plan.id === 'popular' ? '#ff3d8a' : '#2563eb', color: 'white' }}>
                    {plan.badge}
                  </span>
                )}
                <div>
                  <p className="font-bold text-base mb-0.5">{plan.name}</p>
                  <p className="font-black text-lg" style={{ color: '#c8ff3e' }}>{plan.credits} 點數</p>
                  <p className="text-white/30 text-xs mt-0.5">每點 ${plan.perCredit} · 永久有效</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-2xl mb-2">${plan.price}</p>
                  <button
                    onClick={() => handleBuy(plan)}
                    disabled={buyLoading === plan.id}
                    className={plan.btnClass}
                    style={{ minWidth: '80px' }}
                  >
                    {buyLoading === plan.id ? (
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        處理中
                      </span>
                    ) : '購買'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 查看完整定價頁面 */}
          <Link to="/pricing"
            className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors">
            <ExternalLink size={14} />查看完整方案對比與模型介紹
          </Link>

          {/* 點數說明 */}
          <div className="bg-white/5 rounded-xl p-4 text-xs text-white/30 text-center space-y-1">
            <p>生成失敗自動退還點數</p>
            <p>點數永久不過期 · 一次購買</p>
          </div>
        </div>
      )}

      {/* 手動付款 Modal */}
      {showManual && selectedPlan && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/10 rounded-2xl max-w-md w-full p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">購買 {selectedPlan.name}</h3>
              <button onClick={() => setShowManual(false)} className="text-white/30 hover:text-white">
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="rounded-xl p-4 mb-5 text-center" style={{ background: 'rgba(200,255,62,0.08)', border: '1px solid rgba(200,255,62,0.2)' }}>
              <div className="text-4xl font-black">${selectedPlan.price}</div>
              <div className="font-bold mt-1" style={{ color: '#c8ff3e' }}>{selectedPlan.credits} 點數</div>
            </div>
            <div className="space-y-2 text-sm text-white/40 mb-6">
              <p className="font-semibold text-white/70">購買方式：</p>
              <p>1. 記下你的帳號 Email</p>
              <p>2. 透過下方聯繫方式告知購買方案</p>
              <p>3. 付款完成後 24 小時內手動發點</p>
            </div>
            <a href="mailto:contact@goblinai.com" className="btn-neon w-full flex items-center justify-center gap-2 py-3 mb-2">
              聯絡購買
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
