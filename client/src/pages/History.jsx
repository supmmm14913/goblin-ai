import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Trash2, Download, X, Image, Video, Sparkles } from 'lucide-react'

const TYPE_LABELS = {
  'text-to-image': { label: 'T→圖', color: 'bg-indigo-600/80' },
  'image-to-image': { label: '圖→圖', color: 'bg-purple-600/80' },
  'text-to-video': { label: 'T→影', color: 'bg-blue-600/80' },
  'image-to-video': { label: '圖→影', color: 'bg-cyan-600/80' },
}

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'text-to-image', label: '文字生圖' },
  { value: 'image-to-image', label: '圖片轉圖' },
  { value: 'text-to-video', label: '文字生影' },
  { value: 'image-to-video', label: '圖片生影' },
]

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const fetchHistory = async (p = page, f = filter) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 12 }
      if (f !== 'all') params.type = f
      const res = await axios.get('/history', { params })
      setRecords(res.data.records)
      setTotalPages(res.data.totalPages)
      setTotal(res.data.total)
    } catch {
      toast.error('載入歷史記錄失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory(1, filter) }, [filter])

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除此記錄嗎？')) return
    try {
      await axios.delete(`/history/${id}`)
      toast.success('已刪除')
      setSelected(null)
      fetchHistory(page, filter)
    } catch {
      toast.error('刪除失敗')
    }
  }

  const getMediaUrl = (record) => record.image_url || record.video_url
  const isVideo = (record) => record.type === 'text-to-video' || record.type === 'image-to-video'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">生成歷史</h1>
          <p className="text-gray-500 text-sm mt-1">共 {total} 筆記錄</p>
        </div>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.value ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square rounded-xl shimmer" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={36} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">還沒有生成記錄</p>
          <p className="text-gray-600 text-sm mt-1 mb-6">前往生成頁面創作你的第一張圖片或影片</p>
          <Link to="/generate" className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={16} />開始創作
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {records.map(record => {
            const mediaUrl = getMediaUrl(record)
            const isVid = isVideo(record)
            const typeInfo = TYPE_LABELS[record.type] || { label: record.type, color: 'bg-gray-600/80' }
            return (
              <div key={record.id} className="group relative rounded-xl overflow-hidden bg-gray-800 aspect-square cursor-pointer"
                onClick={() => mediaUrl && setSelected(record)}>
                {mediaUrl ? (
                  isVid ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={mediaUrl} alt={record.prompt} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    {isVid ? <Video size={28} className="text-gray-600" /> : <Image size={28} className="text-gray-600" />}
                    <span className="text-gray-500 text-xs">{record.status === 'failed' ? '生成失敗' : '處理中...'}</span>
                  </div>
                )}

                {/* Hover overlay */}
                {mediaUrl && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs line-clamp-2 mb-2">{record.prompt || '（無提示詞）'}</p>
                      <div className="flex gap-1.5">
                        <button className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs py-1.5 rounded-lg backdrop-blur-sm">查看</button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(record.id) }}
                          className="w-8 bg-red-500/80 hover:bg-red-500 text-white rounded-lg flex items-center justify-center">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${typeInfo.color}`}>{typeInfo.label}</span>
                </div>
                {isVid && mediaUrl && (
                  <div className="absolute top-2 right-2">
                    <Video size={14} className="text-white/70" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => { setPage(p); fetchHistory(p, filter) }}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-gray-900 rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full text-white ${TYPE_LABELS[selected.type]?.color || 'bg-gray-600'}`}>
                  {TYPE_LABELS[selected.type]?.label || selected.type}
                </span>
                {selected.model && <span className="text-gray-500 text-sm">{selected.model}</span>}
                <span className="text-gray-600 text-xs">{new Date(selected.created_at).toLocaleString('zh-TW')}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto bg-black flex items-center justify-center" style={{ minHeight: '300px' }}>
              {isVideo(selected) ? (
                <video src={selected.video_url} controls autoPlay className="max-w-full max-h-full" />
              ) : (
                <img src={selected.image_url} alt={selected.prompt} className="max-w-full max-h-full object-contain" />
              )}
            </div>
            <div className="p-4 border-t border-gray-800">
              {selected.prompt && <p className="text-gray-400 text-sm mb-3 line-clamp-3">{selected.prompt}</p>}
              <div className="flex gap-2">
                <a href={getMediaUrl(selected)} download target="_blank" rel="noreferrer"
                  className="btn-primary flex items-center gap-2 flex-1 justify-center py-2.5">
                  <Download size={16} />{isVideo(selected) ? '下載影片' : '下載圖片'}
                </a>
                <button onClick={() => handleDelete(selected.id)}
                  className="btn-secondary flex items-center gap-2 px-4 py-2.5">
                  <Trash2 size={16} />刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
