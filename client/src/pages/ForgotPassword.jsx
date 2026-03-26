import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [devUrl, setDevUrl] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('/auth/forgot-password', { email })
      setDone(true)
      // 開發模式下直接顯示連結
      if (res.data.resetUrl) setDevUrl(res.data.resetUrl)
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || '發送失敗，請稍後再試')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#08080a]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-black text-2xl">
            <span className="text-3xl">👺</span>
            <span className="text-white">Goblin</span><span className="text-neon">AI</span>
          </Link>
          <p className="text-white/30 text-sm mt-3">重設你的密碼</p>
        </div>

        <div className="bg-[#111114] border border-white/10 rounded-2xl p-7">
          {done ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-neon mx-auto mb-4" style={{color:'#c8ff3e'}} />
              <h3 className="font-bold text-lg mb-2">已送出！</h3>
              <p className="text-white/40 text-sm mb-4">
                若此信箱已註冊，重設連結將寄到你的信箱。<br />
                連結 1 小時內有效。
              </p>

              {/* 開發模式顯示連結 */}
              {devUrl && (
                <div className="bg-[#c8ff3e]/10 border border-[#c8ff3e]/20 rounded-xl p-3 mb-4 text-left">
                  <p className="text-neon text-xs font-bold mb-1">⚡ 開發模式（未設定 SMTP）</p>
                  <p className="text-white/40 text-xs mb-2">重設連結：</p>
                  <Link to={devUrl.replace(window.location.origin, '')}
                    className="text-neon text-xs break-all hover:underline"
                    style={{color:'#c8ff3e'}}>
                    點此前往重設頁面 →
                  </Link>
                </div>
              )}

              <Link to="/login" className="btn-secondary block py-2.5 text-sm">返回登入</Link>
            </div>
          ) : (
            <>
              <h3 className="font-bold mb-1">忘記密碼？</h3>
              <p className="text-white/40 text-sm mb-5">輸入你的信箱，我們會寄送重設連結給你</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">電子信箱</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                    <input type="email" className="input-field pl-9" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" className="btn-neon w-full py-3 font-bold" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      發送中...
                    </span>
                  ) : '發送重設連結'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/login" className="flex items-center justify-center gap-1 text-white/30 text-sm hover:text-white transition-colors">
                  <ArrowLeft size={13} />返回登入
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
