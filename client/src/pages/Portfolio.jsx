import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { Image, Video, Calendar, ArrowLeft, Play } from 'lucide-react'
import { openLightbox } from '../utils/lightbox'

const TYPE_LABEL = {
  'text-to-image':  '文字生成圖片',
  'image-to-image': '圖片轉圖片',
  'text-to-video':  '文字生成影片',
  'image-to-video': '圖片生成影片',
}

// ── 媒體卡片 ─────────────────────────────────────────────────────
function MediaCard({ item }) {
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
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={22} color="white" fill="white" style={{ marginLeft: 3 }} />
              </div>
              <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>▶ 影片</span>
            </div>
          )
        ) : (
          /* 圖片：單擊放大（vanilla-JS lightbox，不依賴 React Portal） */
          <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => openLightbox(url, { prompt: item.prompt, model: item.model })}>
            <img
              src={url}
              alt={item.prompt}
              loading="lazy"
              style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
            />
            {/* 放大提示 icon */}
            <span style={{
              position: 'absolute', top: 7, right: 7,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontSize: 13, width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hovered ? 1 : 0.45, transition: 'opacity 0.2s',
              pointerEvents: 'none',
            }}>🔍</span>
          </div>
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
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.prompt}</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{TYPE_LABEL[item.type] || item.type}</p>
        </div>
      </div>
    </div>
  )
}

export default function Portfolio() {
  const { username } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [page, setPage]       = useState(1)

  useEffect(() => {
    setLoading(true)
    axios.get(`/portfolio/user/${username}`, { params: { type: filter || undefined, page } })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [username, filter, page])

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
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
            style={{ background: 'linear-gradient(135deg, rgba(200,255,62,0.4), rgba(200,255,62,0.1))', border: '2px solid rgba(200,255,62,0.3)', color: '#c8ff3e' }}>
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
              style={{
                padding: '6px 16px', borderRadius: 999, fontSize: 14, fontWeight: 500,
                background: filter === f.v ? '#c8ff3e' : 'rgba(255,255,255,0.05)',
                color: filter === f.v ? '#000' : 'rgba(255,255,255,0.5)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
            <p style={{ fontSize: 18 }}>此用戶目前沒有公開作品</p>
          </div>
        ) : (
          <>
            {/* Masonry grid — 全 inline style */}
            <div style={{ columns: '2 160px', columnGap: 12 }}>
              {records.map(item => <MediaCard key={item.id} item={item} />)}
            </div>

            {data.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 8, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.3 : 1 }}>上一頁</button>
                <span style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{page} / {data.totalPages}</span>
                <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 8, cursor: page >= data.totalPages ? 'not-allowed' : 'pointer', opacity: page >= data.totalPages ? 0.3 : 1 }}>下一頁</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
