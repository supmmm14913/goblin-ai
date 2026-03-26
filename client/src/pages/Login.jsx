import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('/auth/login', form)
      login(res.data.token, res.data.user)
      toast.success('歡迎回來！')
    } catch (err) {
      toast.error(err.response?.data?.error || '登入失敗')
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
          <p className="text-white/30 text-sm mt-3">登入你的帳號</p>
        </div>

        <div className="bg-[#111114] border border-white/10 rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">電子信箱</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="email" className="input-field pl-9" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-white/40">密碼</label>
                <Link to="/forgot-password" className="text-xs text-neon hover:underline" style={{color:'#c8ff3e'}}>
                  忘記密碼？
                </Link>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="password" className="input-field pl-9" placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="btn-neon w-full py-3 mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />登入中...
                </span>
              ) : '登入'}
            </button>
          </form>
          <p className="text-center text-white/30 text-xs mt-5">
            還沒有帳號？
            <Link to="/register" className="text-neon hover:underline ml-1 font-semibold">免費註冊</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
