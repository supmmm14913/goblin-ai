import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { Image, Video, Calendar, ArrowLeft, Play, Download } from 'lucide-react'

const TYPE_LABEL = {
  'text-to-image':  '文字生成圖片',
  'image-to-image': '圖片轉圖片',
  'text-to-video':  '文字生成影片',
  'image-to-video': '圖片生成影片',
}

// ── 媒體卡片（全 inline style，避免 Tailwind JIT purge）─────────
function MediaCard({ item, onZoom }) {
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isVideo = item.type === 'text-to-video' || item.type === 'image-to-video'
  const url = isVideo ? item.video_url : item.image_url
  if (!url) return null

  return (
    <div
      style={{ marginBottom: 12, breakInside: 'avoid' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#111114', border: '1px solid rgba(255,255,255,0.08)' }}>

        {isVideo ? (
          playing ? (
            /* 播放中：直接顯示 video 元素，muted 讓瀏覽器允許 autoplay */
            <video
              src={url}
              autoPlay
              muted
              controls
              style={{ width: '100%', display: 'block', maxHeight: '70vh' }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            /* 縮圖狀態：點擊播放 */
            <div
              onClick={() => setPlaying(true)}
              style={{
                aspectRatio: '16/9', background: '#000', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}>
                <Play size={22} color="white" fill="white" style={{ marginLeft: 3 }} />
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
          /* 圖片：點擊放大 */
          <img
            src={url}
            alt={item.prompt}
            loading="lazy"
            onClick={() => onZoom(url)}
            style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
          />
        )}

        {/* Hover 提示詞浮層 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '28px 10px 10px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.prompt}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {TYPE_LABEL[item.type] || item.type}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Lightbox（共用）──────────────────────────────────────────────
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
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: -44, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 30, cursor: 'pointer', lineHeight: 1, padding: 4 }}
        >
          ✕
        </button>
        {/* 原圖 */}
        <img
          src={src}
          alt="放大預覽"
          style={{ maxWidth: '92vw', maxHeight: 'calc(90vh - 80px)', objectFit: 'contain', borderRadius: 14, boxShadow: '0 8px 60px rgba(0,0,0,0.9)', display: 'block' }}
        />
        {/* 操作列 */}
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

export default function Portfolio() {
  const { username } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [page, setPage]       = useState(1)
  const [lightbox, setLightbox] = useState(null)  // 放大圖片 URL

  useEffect(() => {
    setLoading(true)
    axios.get(`/portfolio/user/${username}`, { params: { type: filter || undefined, page } })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [username, filter, page])

  // ESC 關閉 lightbox
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#c8ff3e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center gap-4">
      <p className="text-white/40 text-lg">找不到此用戶</p>
      <Link to="/explore" className="btn-neon">瀏覽探索頁面</Link>
    </div>
  )

  const { user, records, total } = data
  const images = records.filter(r => r.type === 'text-to-image' || r.type === 'image-to-image')
  const videos = records.filter(r => r.type === 'text-to-video' || r.type === 'image-to-video')

  return (
    <>
      <div className="min-h-screen bg-[#08080a]">
        {/* Top bar */}
        <div className="bg-[#0c0c0f]/90 backdrop-blur border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 h-14">
            <Link to="/" className="flex items-center gap-2 font-black text-lg shrink-0 mr-4">
              <span className="text-2xl">👺</span>
              <span className="text-white">Goblin</span>
              <span style={{ color: '#c8ff3e' }}>AI</span>
            </Link>
            <Link to="/explore" className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
              <ArrowLeft size={14} />探索
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* User header */}
          <div className="flex items-center gap-5 mb-8 fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-br from-[#c8ff3e]/40 to-[#c8ff3e]/10 border-2 border-[#c8ff3e]/30 rounded-full flex items-center justify-center text-3xl font-black" style={{ color: '#c8ff3e' }}>
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{user.username}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-white/40">
                <span className="flex items-center gap-1.5"><Image size={13} />{images.length} 張圖片</span>
                <span className="flex items-center gap-1.5"><Video size={13} />{videos.length} 支影片</span>
                <span className="flex items-center gap-1.5"><Calendar size={13} />加入於 {new Date(user.created_at).toLocaleDateString('zh-TW')}</span>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { v: '', label: `全部 (${total})` },
              { v: 'text-to-image', label: '圖片' },
              { v: 'text-to-video', label: '影片' },
            ].map(f => (
              <button key={f.v} onClick={() => { setFilter(f.v); setPage(1) }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f.v ? 'bg-[#c8ff3e] text-black' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {records.length === 0 ? (
            <div className="py-24 text-center text-white/30">
              <p className="text-lg">此用戶目前沒有公開作品</p>
            </div>
          ) : (
            <>
              {/* Masonry grid — inline style 避免 Tailwind purge */}
              <div style={{ columns: 2, columnGap: 12 }}
                className="sm:columns-3 lg:columns-4">
                {records.map(item => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onZoom={url => setLightbox(url)}
                  />
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm disabled:opacity-30 transition-colors">上一頁</button>
                  <span className="px-4 py-2 text-white/40 text-sm">{page} / {data.totalPages}</span>
                  <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm disabled:opacity-30 transition-colors">下一頁</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Portal — 掛到 document.body，不受任何父層 overflow 影響 */}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}
