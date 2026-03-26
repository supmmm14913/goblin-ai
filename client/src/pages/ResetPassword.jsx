import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Lock, CheckCircle } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#08080a]">
        <div className="text-center">
          <p className="text-white/40 mb-4">無效的重設連結</p>
          <Link to="/forgot-password" className="btn-neon">重新申請</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('兩次密碼不一致')
    if (form.password.length < 6) return toast.error('密碼至少需要 6 個字元')
    setLoading(true)
    try {
      await axios.post('/auth/reset-password', { token, password: form.password })
      setDone(true)
      toast.success('密碼重設成功！')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      toast.error(err.response?.data?.error || '重設失敗，連結可能已過期')
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
          <p className="text-white/30 text-sm mt-3">設定新密碼</p>
        </div>

        <div className="bg-[#111114] border border-white/10 rounded-2xl p-7">
          {done ? (
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-4" style={{color:'#c8ff3e'}} />
              <h3 className="font-bold text-lg mb-2">密碼已重設！</h3>
              <p className="text-white/40 text-sm mb-4">正在跳轉到登入頁面...</p>
              <Link to="/login" className="btn-neon block py-2.5 text-sm text-center">立即登入</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="font-bold mb-4">設定新密碼</h3>
                <label className="block text-xs text-white/40 mb-1.5">新密碼</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="password" className="input-field pl-9" placeholder="至少 6 個字元"
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">確認新密碼</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="password" className="input-field pl-9" placeholder="再輸入一次"
                    value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn-neon w-full py-3 font-bold" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    重設中...
                  </span>
                ) : '確認重設密碼'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
