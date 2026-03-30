import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sparkles, History, LogOut, Coins, Shield, Video, Image, Settings, ChevronDown, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      {/* 促銷橫幅 */}
      <div className="bg-gradient-to-r from-[#c8ff3e]/20 via-[#ff3d8a]/20 to-[#c8ff3e]/20 border-b border-white/5 py-2 px-4 text-center text-sm">
        <span className="text-white/60">🎉 新用戶免費獲得 </span>
        <span className="text-neon font-bold">10 點數</span>
        <span className="text-white/60"> · 推薦朋友雙方各得 </span>
        <span className="text-neon font-bold">30 點</span>
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
              <Link to="/generate?tab=text-video" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.search.includes('video') ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
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
                <Link to="/settings?tab=credits" className="hidden sm:flex items-center gap-1.5 bg-[#c8ff3e]/10 border border-[#c8ff3e]/20 text-neon px-3 py-1.5 rounded-lg text-sm hover:bg-[#c8ff3e]/20 transition-colors">
                  <Coins size={13} />
                  <span className="font-black">{user.credits ?? 0}</span>
                  <span className="text-neon/60 text-xs">點</span>
                </Link>

                {/* 頭像下拉選單 */}
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(v => !v)}
                    className="flex items-center gap-1.5 hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors">
                    <div className="w-7 h-7 bg-gradient-to-br from-[#c8ff3e]/40 to-[#c8ff3e]/10 border border-[#c8ff3e]/30 rounded-full flex items-center justify-center text-xs font-black text-neon">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm text-white/70 max-w-[80px] truncate">{user.username}</span>
                    <ChevronDown size={12} className={`text-white/30 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#111114] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="font-bold text-sm">{user.username}</p>
                        <p className="text-white/40 text-xs truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/settings" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                          <User size={14} />個人資料
                        </Link>
                        <Link to="/settings?tab=referral" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                          <Sparkles size={14} />推薦連結
                        </Link>
                        <Link to="/settings?tab=credits" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                          <Coins size={14} />購買點數
                        </Link>
                        <Link to="/settings?tab=password" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                          <Settings size={14} />帳號設定
                        </Link>
                      </div>
                      <div className="border-t border-white/5 py-1">
                        <button onClick={() => { logout(); setDropdownOpen(false) }}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors">
                          <LogOut size={14} />登出
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
