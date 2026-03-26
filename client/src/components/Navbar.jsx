import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sparkles, History, LogOut, User, Coins, Shield, Video, Image, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* 促銷橫幅 */}
      <div className="bg-gradient-to-r from-[#c8ff3e]/20 via-[#ff3d8a]/20 to-[#c8ff3e]/20 border-b border-white/5 py-2 px-4 text-center text-sm">
        <span className="text-white/60">🎉 新用戶免費獲得 </span>
        <span className="text-neon font-bold">10 點數</span>
        <span className="text-white/60"> · 立即體驗 AI 影像生成</span>
        {!user && (
          <Link to="/register" className="ml-3 text-neon font-bold hover:underline">免費開始 →</Link>
        )}
      </div>

      {/* 主 Navbar */}
      <nav className="bg-[#0c0c0f]/90 backdrop-blur border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-black text-lg shrink-0">
            <span className="text-2xl">👺</span>
            <span className="text-white">Goblin</span>
            <span className="text-neon">AI</span>
          </Link>

          {/* 中間導航 */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/generate" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive('/generate') ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Image size={14} />圖片
              </Link>
              <Link to="/generate?tab=text-video" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive('/generate') && location.search.includes('video') ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Video size={14} />影片
              </Link>
              <Link to="/history" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive('/history') ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <History size={14} />作品集
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive('/admin') ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                  <Shield size={14} />後台
                </Link>
              )}
            </div>
          )}

          {/* 右側 */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* 點數 */}
                <Link to="/pricing" className="hidden sm:flex items-center gap-1.5 bg-[#c8ff3e]/10 border border-[#c8ff3e]/20 text-neon px-3 py-1.5 rounded-lg text-sm hover:bg-[#c8ff3e]/20 transition-colors">
                  <Coins size={13} />
                  <span className="font-black">{user.credits ?? 0}</span>
                  <span className="text-neon/60 text-xs">點</span>
                </Link>
                {/* 升級按鈕 */}
                <Link to="/pricing" className="hidden sm:block btn-neon py-1.5 px-4 text-xs">
                  升級方案
                </Link>
                {/* 用戶 */}
                <div className="flex items-center gap-1 text-sm text-white/50">
                  <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                </div>
                <button onClick={logout} className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5">
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/pricing" className="btn-ghost hidden sm:block">定價</Link>
                <Link to="/login" className="btn-ghost">登入</Link>
                <Link to="/register" className="btn-neon py-1.5 px-4 text-xs">免費開始</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
