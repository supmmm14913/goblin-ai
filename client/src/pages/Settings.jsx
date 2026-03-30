import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Link, useSearchParams } from 'react-router-dom'
import { User, Link2, Lock, Mail, Coins, Copy, Check, Eye, EyeOff } from 'lucide-react'

const TABS = [
  { id: 'profile',   icon: <User size={15} />,   label: '個人資料' },
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
  const [plans, setPlans] = useState([])
  const [copied, setCopied] = useState(false)

  // 修改密碼
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  // 修改信箱
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' })
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    axios.get('/auth/me').then(r => setProfile(r.data.user)).catch(() => {})
    axios.get('/payment/plans').then(r => setPlans(r.data.plans)).catch(() => {})
  }, [])

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

  const handleBuyPlan = async (planId) => {
    try {
      const res = await axios.post('/payment/checkout', { planId })
      window.location.href = res.data.url
    } catch (err) {
      const e = err.response?.data
      if (e?.error === 'PAYMENT_NOT_CONFIGURED') {
        toast.error('付款系統尚未設定，請聯絡管理員')
      } else {
        toast.error(e?.message || '建立付款失敗')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-black mb-6">帳號設定</h1>

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
              <p className="font-bold text-sm">{profile.email}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">剩餘點數</p>
              <p className="font-black text-neon text-xl">{profile.credits} <span className="text-sm text-white/40">點</span></p>
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
        </div>
      )}

      {/* 推薦連結 */}
      {tab === 'referral' && profile && (
        <div className="card space-y-5">
          <h2 className="font-bold text-lg">推薦連結</h2>
          <div className="bg-[#c8ff3e]/5 border border-[#c8ff3e]/20 rounded-xl p-4 text-center">
            <p className="text-neon font-black text-3xl mb-1">{profile.referralCount || 0}</p>
            <p className="text-white/40 text-sm">成功推薦人數</p>
          </div>
          <div className="bg-white/5 border border-[#c8ff3e]/20 rounded-xl p-4">
            <p className="text-white/40 text-xs mb-3">你的推薦碼</p>
            <p className="font-mono font-black text-neon text-xl tracking-widest" style={{color:'#c8ff3e'}}>{profile.referral_code}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-2">推薦連結（分享給朋友）</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/50 truncate">
                {referralLink}
              </div>
              <button onClick={copyLink}
                className="flex items-center gap-1.5 bg-[#c8ff3e] text-black text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#d4ff5a] transition-colors shrink-0">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '已複製' : '複製'}
              </button>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm text-white/50">
            <p className="text-white font-semibold text-xs mb-2">推薦獎勵規則</p>
            <p>• 朋友使用你的推薦碼註冊 → 他們獲得 <span className="text-neon font-bold">30 點</span></p>
            <p>• 同時你也獲得 <span className="text-neon font-bold">30 點</span> 獎勵</p>
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
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-white/40 text-sm">目前剩餘點數</p>
              <p className="font-black text-neon text-3xl">{user?.credits ?? 0} <span className="text-base text-white/40">點</span></p>
            </div>
            <Coins size={36} className="text-neon/30" />
          </div>
          <div className="grid gap-3">
            {plans.map(plan => (
              <div key={plan.id} className="card flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold">{plan.name}</p>
                    {plan.badge && <span className="text-xs bg-[#c8ff3e]/20 text-neon px-2 py-0.5 rounded-full">{plan.badge}</span>}
                  </div>
                  <p className="text-white/40 text-sm">{plan.desc}</p>
                  <p className="text-neon font-black mt-1">{plan.credits} 點</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl mb-2">${plan.priceUSD}</p>
                  <button onClick={() => handleBuyPlan(plan.id)}
                    className="btn-neon py-2 px-5 text-sm font-bold">
                    購買
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
