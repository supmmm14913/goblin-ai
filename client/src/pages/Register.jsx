import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Lock } from 'lucide-react'

export default function Register() {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('密碼至少需要 6 個字元')
    setLoading(true)
    try {
      const res = await axios.post('/auth/register', form)
      login(res.data.token, res.data.user)
      toast.success('🎉 歡迎加入 Goblin AI！你已獲得 10 點數')
    } catch (err) {
      toast.error(err.response?.data?.error || '註冊失敗')
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
          <p className="text-white/30 text-sm mt-3">免費加入，立得 10 點數</p>
        </div>

        <div className="bg-[#111114] border border-white/10 rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">用戶名稱</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" className="input-field pl-9" placeholder="你的暱稱"
                  value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">電子信箱</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="email" className="input-field pl-9" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">密碼</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="password" className="input-field pl-9" placeholder="至少 6 個字元"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="btn-neon w-full py-3 mt-1 font-black" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />建立中...
                </span>
              ) : '🎉 免費建立帳號'}
            </button>
          </form>
          <div className="mt-4 bg-[#c8ff3e]/5 border border-[#c8ff3e]/20 rounded-xl p-3 text-center">
            <p className="text-neon text-xs font-semibold">✓ 立即獲得 10 點免費點數</p>
            <p className="text-white/20 text-xs mt-0.5">不需信用卡 · 點數永久有效</p>
          </div>
          <p className="text-center text-white/30 text-xs mt-4">
            已有帳號？
            <Link to="/login" className="text-neon hover:underline ml-1 font-semibold">登入</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
