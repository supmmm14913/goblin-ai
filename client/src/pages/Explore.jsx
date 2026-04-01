import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Search, Play, Sparkles } from 'lucide-react'
import { openLightbox } from '../utils/lightbox'

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

// ── 探索卡片 ─────────────────────────────────────────────────────
function ExploreCard({ item }) {
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
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={18} color="white" fill="white" style={{ marginLeft: 3 }} />
              </div>
              <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>▶ 影片</span>
            </div>
          )
        ) : (
          /* 圖片：單擊放大（vanilla-JS lightbox） */
          <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => openLightbox(url)}>
            <img
              src={url}
              alt={item.prompt}
              loading="lazy"
              style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
            />
            <span style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontSize: 12, width: 24, height: 24, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hovered ? 1 : 0.4, transition: 'opacity 0.2s',
              pointerEvents: 'none',
            }}>🔍</span>
          </div>
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
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.prompt}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: 4 }}>
              {TYPE_LABEL[item.type] || item.type}
            </span>
          </div>
        </div>
      </div>

      {/* Creator info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '0 2px' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(200,255,62,0.4), rgba(200,255,62,0.1))', border: '1px solid rgba(200,255,62,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#c8ff3e', flexShrink: 0 }}>
          {item.username?.[0]?.toUpperCase()}
        </div>
        <Link to={`/u/${item.username}`}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#c8ff3e'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
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
  const [records, setRecords]       = useState([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]       = useState(true)
  const [q, setQ]                   = useState('')
  const [type, setType]             = useState('')
  const [page, setPage]             = useState(1)
  const [inputVal, setInputVal]     = useState('')

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

  const handleSearch = (e) => {
    e.preventDefault()
    setQ(inputVal)
    setPage(1)
  }

  return (
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
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,255,62,0.1)', border: '1px solid rgba(200,255,62,0.2)', borderRadius: 999, padding: '6px 16px', color: '#c8ff3e', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            <Sparkles size={14} />全球作品探索
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            發現創作者的<span style={{ color: '#c8ff3e' }}>精彩作品</span>
          </h1>
          <p className="text-white/40 text-base">瀏覽所有用戶生成的圖片和影片，點擊創作者名稱查看完整主頁</p>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8, minWidth: 200 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
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
          <div style={{ display: 'flex', gap: 8 }}>
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.v} onClick={() => { setType(opt.v); setPage(1) }}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: type === opt.v ? '#c8ff3e' : 'rgba(255,255,255,0.05)',
                  color: type === opt.v ? '#000' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>
          {total} 件作品{q && <span>　搜尋：<span style={{ color: 'rgba(255,255,255,0.7)' }}>"{q}"</span></span>}
        </p>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="w-8 h-8 border-2 border-[#c8ff3e] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, marginBottom: 8 }}>沒有找到作品</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, marginBottom: 24 }}>試試其他關鍵字或先去生成一些作品吧！</p>
            <Link to="/generate" className="btn-neon">開始創作</Link>
          </div>
        ) : (
          <>
            {/* Masonry grid — 全 inline style */}
            <div style={{ columns: '2 160px', columnGap: 12 }}>
              {records.map(item => <ExploreCard key={item.id} item={item} />)}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 10, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.3 : 1 }}>上一頁</button>
                <span style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 10, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.3 : 1 }}>下一頁</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
