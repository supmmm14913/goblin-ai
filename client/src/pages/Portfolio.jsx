import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { Image, Video, Calendar, ArrowLeft, Play, ExternalLink } from 'lucide-react'

const TYPE_LABEL = {
  'text-to-image': '文字生成圖片',
  'image-to-image': '圖片轉圖片',
  'text-to-video': '文字生成影片',
  'image-to-video': '圖片生成影片',
}

function MediaCard({ item }) {
  const [playing, setPlaying] = useState(false)
  const isVideo = item.type === 'text-to-video' || item.type === 'image-to-video'
  const url = isVideo ? item.video_url : item.image_url
  if (!url) return null

  return (
    <div className="masonry-item">
      <div className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/8 cursor-pointer"
        onClick={() => setPlaying(true)}>
        {isVideo ? (
          playing ? (
            <video src={url} autoPlay controls className="w-full" />
          ) : (
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="z-10 w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play size={20} className="text-white ml-1" fill="white" />
              </div>
              <Video size={32} className="text-white/20 absolute" />
            </div>
          )
        ) : (
          <img src={url} alt={item.prompt} className="w-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white/80 line-clamp-2">{item.prompt}</p>
          <p className="text-xs text-white/40 mt-1">{TYPE_LABEL[item.type] || item.type}</p>
        </div>
      </div>
    </div>
  )
}

export default function Portfolio() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)

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
            <span className="text-neon">AI</span>
          </Link>
          <Link to="/explore" className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft size={14} />探索
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* User header */}
        <div className="flex items-center gap-5 mb-8 fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-br from-[#c8ff3e]/40 to-[#c8ff3e]/10 border-2 border-[#c8ff3e]/30 rounded-full flex items-center justify-center text-3xl font-black text-neon">
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
            <div className="masonry-grid">
              {records.map(item => <MediaCard key={item.id} item={item} />)}
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
  )
}
