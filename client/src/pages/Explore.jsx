import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Search, Image, Video, Play, User, Sparkles } from 'lucide-react'

const TYPE_OPTIONS = [
  { v: '', label: '全部' },
  { v: 'text-to-image', label: '圖片' },
  { v: 'text-to-video', label: '影片' },
]

const TYPE_LABEL = {
  'text-to-image': '圖片',
  'image-to-image': '圖片',
  'text-to-video': '影片',
  'image-to-video': '影片',
}

function ExploreCard({ item }) {
  const [playing, setPlaying] = useState(false)
  const isVideo = item.type === 'text-to-video' || item.type === 'image-to-video'
  const url = isVideo ? item.video_url : item.image_url
  if (!url) return null

  return (
    <div className="masonry-item group">
      <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/8 cursor-pointer"
        onClick={() => setPlaying(true)}>
        {isVideo ? (
          playing ? (
            <video src={url} autoPlay controls className="w-full" onClick={e => e.stopPropagation()} />
          ) : (
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play size={16} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          )
        ) : (
          <img src={url} alt={item.prompt} className="w-full object-cover" loading="lazy" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute bottom-0 inset-x-0 p-3">
            <p className="text-xs text-white/90 line-clamp-2 mb-2">{item.prompt}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/70">
                {TYPE_LABEL[item.type] || item.type}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Creator info */}
      <div className="flex items-center gap-2 mt-1.5 px-1">
        <div className="w-5 h-5 bg-gradient-to-br from-[#c8ff3e]/40 to-[#c8ff3e]/10 border border-[#c8ff3e]/20 rounded-full flex items-center justify-center text-[10px] font-black text-neon shrink-0">
          {item.username?.[0]?.toUpperCase()}
        </div>
        <Link to={`/u/${item.username}`} className="text-xs text-white/40 hover:text-neon transition-colors truncate">
          {item.username}
        </Link>
        <span className="text-white/20 text-xs ml-auto shrink-0">
          {new Date(item.created_at).toLocaleDateString('zh-TW')}
        </span>
      </div>
    </div>
  )
}

export default function Explore() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [inputVal, setInputVal] = useState('')

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
            <span className="text-neon">AI</span>
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
            發現創作者的<span className="text-neon">精彩作品</span>
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
            <div className="masonry-grid">
              {records.map(item => <ExploreCard key={item.id} item={item} />)}
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
  )
}
