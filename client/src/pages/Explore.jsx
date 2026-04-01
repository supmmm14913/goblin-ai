import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Search, Image, Video, Play, Sparkles, Download } from 'lucide-react'

const TYPE_OPTIONS = [
  { v: '', label: '全部' },
  { v: 'text-to-image', label: '圖片' },
  { v: 'text-to-video', label: '影片' },
]

const TYPE_LABEL = {
  'text-to-image':  '圖片',
  'image-to-image': '圖片',
  'text-to-video':  '影片',
  'image-to-video': '影片',
}

// ── Lightbox（Portal，掛到 document.body）────────────────────────
function Lightbox({ src, onClose }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: '92vw' }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: -44, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 30, cursor: 'pointer', lineHeight: 1, padding: 4 }}
        >
          ✕
        </button>
        <img
          src={src}
          alt="放大預覽"
          style={{ maxWidth: '92vw', maxHeight: 'calc(90vh - 80px)', objectFit: 'contain', borderRadius: 14, boxShadow: '0 8px 60px rgba(0,0,0,0.9)', display: 'block' }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={src} download target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ background: '#c8ff3e', color: '#000', fontWeight: 700, fontSize: 13, padding: '9px 22px', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={14} />下載原圖
          </a>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: 13, padding: '9px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer' }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── 探索卡片（全 inline style）───────────────────────────────────
function ExploreCard({ item, onZoom }) {
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isVideo = item.type === 'text-to-video' || item.type === 'image-to-video'
  const url = isVideo ? item.video_url : item.image_url
  if (!url) return null

  return (
    <div style={{ marginBottom: 12, breakInside: 'avoid' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#111114', border: '1px solid rgba(255,255,255,0.08)' }}>

        {isVideo ? (
          playing ? (
            <video
              src={url}
              autoPlay
              muted
              controls
              style={{ width: '100%', display: 'block', maxHeight: '70vh' }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <div
              onClick={() => setPlaying(true)}
              style={{ aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Play size={18} color="white" fill="white" style={{ marginLeft: 3 }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 8, left: 8,
                background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)',
                fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
              }}>
                ▶ 影片
              </div>
            </div>
          )
        ) : (
          <img
            src={url}
            alt={item.prompt}
            loading="lazy"
            onClick={() => onZoom(url)}
            style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
          />
        )}

        {/* Hover 資訊浮層 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.prompt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: 4 }}>
              {TYPE_LABEL[item.type] || item.type}
            </span>
          </div>
        </div>
      </div>

      {/* Creator info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '0 2px' }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(200,255,62,0.4), rgba(200,255,62,0.1))',
          border: '1px solid rgba(200,255,62,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900, color: '#c8ff3e', flexShrink: 0,
        }}>
          {item.username?.[0]?.toUpperCase()}
        </div>
        <Link to={`/u/${item.username}`}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
          onMouseEnter={e => e.target.style.color = '#c8ff3e'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
        >
          {item.username}
        </Link>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
          {new Date(item.created_at).toLocaleDateString('zh-TW')}
        </span>
      </div>
    </div>
  )
}

export default function Explore() {
  const [records, setRecords]         = useState([])
  const [total, setTotal]             = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [loading, setLoading]         = useState(true)
  const [q, setQ]                     = useState('')
  const [type, setType]               = useState('')
  const [page, setPage]               = useState(1)
  const [inputVal, setInputVal]       = useState('')
  const [lightbox, setLightbox]       = useState(null)  // 放大圖片 URL

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/portfolio/explore', { params: { q, type: type || undefined, page, limit: 24 } })
      setRecords(res.data.records)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [q, type, page])

  useEffect(() => { fetchData() }, [fetchData])

  // ESC 關閉 lightbox
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setQ(inputVal)
    setPage(1)
  }

  return (
    <>
      <div className="min-h-screen bg-[#08080a]">
        {/* Navbar */}
        <div className="bg-[#0c0c0f]/90 backdrop-blur border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 font-black text-lg shrink-0">
              <span className="text-2xl">👺</span>
              <span className="text-white">Goblin</span>
              <span style={{ color: '#c8ff3e' }}>AI</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/generate" className="btn-neon py-1.5 px-4 text-xs">開始創作</Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Header */}
          <div className="text-center mb-10 fade-in-up">
            <div className="inline-flex items-center gap-2 bg-[#c8ff3e]/10 border border-[#c8ff3e]/20 rounded-full px-4 py-1.5 text-neon text-sm font-bold mb-4">
              <Sparkles size={14} />全球作品探索
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              發現創作者的<span style={{ color: '#c8ff3e' }}>精彩作品</span>
            </h1>
            <p className="text-white/40 text-base">瀏覽所有用戶生成的圖片和影片，點擊創作者名稱查看完整主頁</p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8 fade-in-up-1">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder="搜尋提示詞內容..."
                  className="input-field pl-9"
                />
              </div>
              <button type="submit" className="btn-neon px-5">搜尋</button>
            </form>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.v} onClick={() => { setType(opt.v); setPage(1) }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${type === opt.v ? 'bg-[#c8ff3e] text-black' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 mb-6 text-sm text-white/40">
            <span>{total} 件作品</span>
            {q && <span className="flex items-center gap-1">搜尋：<span className="text-white/70">"{q}"</span></span>}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-8 h-8 border-2 border-[#c8ff3e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-32 text-center">
              <p className="text-white/30 text-lg mb-2">沒有找到作品</p>
              <p className="text-white/20 text-sm">試試其他關鍵字或先去生成一些作品吧！</p>
              <Link to="/generate" className="inline-block mt-6 btn-neon">開始創作</Link>
            </div>
          ) : (
            <>
              {/* Masonry grid — inline style 避免 Tailwind purge */}
              <div style={{ columns: 2, columnGap: 12 }}
                className="sm:columns-3 lg:columns-4">
                {records.map(item => (
                  <ExploreCard
                    key={item.id}
                    item={item}
                    onZoom={url => setLightbox(url)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-5 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm disabled:opacity-30 transition-colors">上一頁</button>
                  <span className="px-4 py-2 text-white/40 text-sm">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-5 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm disabled:opacity-30 transition-colors">下一頁</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Portal */}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}
