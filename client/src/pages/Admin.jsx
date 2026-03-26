import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Users, Image, DollarSign, TrendingUp, Edit2, Check, X, Gift, Video, Mail, CreditCard, ExternalLink, Copy } from 'lucide-react'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('stats')
  const [editingUser, setEditingUser] = useState(null)
  const [editCredits, setEditCredits] = useState('')
  const [grantForm, setGrantForm] = useState({ email: '', credits: '', note: '' })
  const [grantLoading, setGrantLoading] = useState(false)

  const load = () => {
    axios.get('/admin/stats').then(r => setStats(r.data)).catch(() => {})
    axios.get('/admin/users').then(r => setUsers(r.data.users)).catch(() => {})
    axios.get('/admin/orders').then(r => setOrders(r.data.orders)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleUpdateCredits = async (userId) => {
    try {
      await axios.patch(`/admin/users/${userId}/credits`, { credits: parseInt(editCredits) })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: parseInt(editCredits) } : u))
      toast.success('點數已更新')
      setEditingUser(null)
    } catch { toast.error('更新失敗') }
  }

  const handleGrant = async () => {
    if (!grantForm.email || !grantForm.credits) return toast.error('請填寫 Email 和點數')
    setGrantLoading(true)
    try {
      const res = await axios.post('/payment/manual-grant', grantForm)
      toast.success(`已為 ${res.data.username} 發放 ${grantForm.credits} 點！`)
      setGrantForm({ email: '', credits: '', note: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || '發放失敗')
    } finally { setGrantLoading(false) }
  }

  const StatCard = ({ icon, label, value, sub, color = 'indigo' }) => (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${color}-500/20 text-${color}-400`}>{icon}</div>
      </div>
      <div className="text-3xl font-black">{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  )

  const TABS = [
    { id: 'stats',   label: '📊 統計' },
    { id: 'grant',   label: '🎁 發放點數' },
    { id: 'users',   label: '👤 用戶' },
    { id: 'orders',  label: '💳 訂單' },
    { id: 'paddle',  label: '💰 Paddle 收款' },
    { id: 'smtp',    label: '📧 Gmail 寄信' },
    { id: 'deploy',  label: '🚀 部署上線' },
  ]

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-black">管理後台</h1>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 統計 */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users size={18} />} label="總用戶" value={stats.totalUsers} />
          <StatCard icon={<Image size={18} />} label="圖片生成" value={stats.imageGenerations} sub={`今日 ${stats.todayGenerations}`} />
          <StatCard icon={<Video size={18} />} label="影片生成" value={stats.videoGenerations} color="purple" />
          <StatCard icon={<DollarSign size={18} />} label="總訂單" value={stats.totalOrders} sub={`總計 ${stats.totalGenerations} 次生成`} color="green" />
        </div>
      )}

      {/* 手動發放點數 */}
      {tab === 'grant' && (
        <div className="max-w-lg">
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <Gift size={20} className="text-amber-400" />
              <h2 className="font-bold text-lg">手動發放點數</h2>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              用於用戶轉帳/匯款後手動給予點數，或測試帳號補點。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">用戶 Email</label>
                <input type="email" className="input-field" placeholder="user@example.com"
                  value={grantForm.email} onChange={e => setGrantForm({ ...grantForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">點數數量</label>
                <input type="number" className="input-field" placeholder="例如: 50"
                  value={grantForm.credits} onChange={e => setGrantForm({ ...grantForm, credits: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">備註（選填）</label>
                <input type="text" className="input-field" placeholder="例如: 已確認匯款"
                  value={grantForm.note} onChange={e => setGrantForm({ ...grantForm, note: e.target.value })} />
              </div>
              <button onClick={handleGrant} disabled={grantLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {grantLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />發放中...</>
                ) : (
                  <><Gift size={16} />發放點數</>
                )}
              </button>
            </div>
          </div>

          <div className="card mt-4">
            <h3 className="font-semibold mb-3 text-sm text-gray-400">💡 收款方式建議（付款未自動化前）</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>• 用戶匯款到你的帳戶 → 你在這裡手動發點</li>
              <li>• 推薦收款：LINE Pay、歐付寶、銀行轉帳</li>
              <li>• 之後設定 Paddle 即可自動化</li>
            </ul>
          </div>
        </div>
      )}

      {/* 用戶列表 */}
      {tab === 'users' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  {['用戶名', '信箱', '點數', '身份', '加入時間', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      {editingUser === u.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={editCredits} onChange={e => setEditCredits(e.target.value)}
                            className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm" />
                          <button onClick={() => handleUpdateCredits(u.id)} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                          <button onClick={() => setEditingUser(null)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                        </div>
                      ) : (
                        <span className="text-amber-400 font-bold">{u.credits}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                        {u.role === 'admin' ? '管理員' : '用戶'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditingUser(u.id); setEditCredits(u.credits) }}
                        className="text-gray-400 hover:text-indigo-400 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 訂單 */}
      {tab === 'orders' && (
        <div className="card overflow-hidden p-0">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-gray-500">尚無訂單記錄</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    {['用戶', '點數', '金額', '類型', '備註', '時間'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">{o.username || o.user_id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-amber-400 font-bold">+{o.credits}</td>
                      <td className="px-4 py-3 text-green-400">{o.amount ? `$${(o.amount / 100).toFixed(2)}` : '手動'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'manual' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                          {o.status === 'manual' ? '手動' : '付款'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{o.note || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Paddle 收款設定 ── */}
      {tab === 'paddle' && (
        <div className="max-w-2xl space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={20} className="text-amber-400" />
              <h2 className="font-bold text-lg">Paddle 自動收款設定</h2>
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">台灣個人可用</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-[#c8ff3e]/5 border border-[#c8ff3e]/20 rounded-xl p-4">
                <p className="font-bold mb-2" style={{color:'#c8ff3e'}}>📋 申請步驟</p>
                <ol className="space-y-2 text-white/60 list-decimal list-inside">
                  <li>前往 <a href="https://vendors.paddle.com/signup" target="_blank" rel="noreferrer" className="text-neon underline" style={{color:'#c8ff3e'}}>vendors.paddle.com/signup</a> 申請帳號</li>
                  <li>填寫個人或公司資料（台灣地址即可）</li>
                  <li>完成身份驗證（約 1-2 個工作天）</li>
                  <li>到 <strong className="text-white">Catalog → Products</strong> 建立三個產品</li>
                  <li>每個產品建立一個 Price（一次性付款）</li>
                  <li>複製 Price ID（格式：<code className="bg-white/10 px-1 rounded">pri_xxxxxxxx</code>）</li>
                </ol>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="font-bold mb-3">📦 建立三個產品方案</p>
                <div className="space-y-2">
                  {[
                    { name: '入門方案 - 50 Credits', price: '$5', env: 'PADDLE_PRICE_STARTER' },
                    { name: '熱門方案 - 200 Credits', price: '$15', env: 'PADDLE_PRICE_POPULAR' },
                    { name: '專業方案 - 600 Credits', price: '$30', env: 'PADDLE_PRICE_PRO' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                      <span className="text-white/70">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-neon font-bold text-xs" style={{color:'#c8ff3e'}}>{p.price}</span>
                        <code className="text-white/30 text-xs">{p.env}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="font-bold mb-3">⚙️ 填入 server/.env</p>
                <pre className="text-xs text-white/50 bg-black/30 rounded-lg p-3 overflow-x-auto">{`PADDLE_API_KEY=你的API Key (Developer → Authentication)
PADDLE_WEBHOOK_SECRET=你的Webhook Secret
PADDLE_PRICE_STARTER=pri_xxxxxxxx
PADDLE_PRICE_POPULAR=pri_xxxxxxxx
PADDLE_PRICE_PRO=pri_xxxxxxxx`}</pre>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="font-bold mb-2">🔔 Webhook 設定</p>
                <p className="text-white/50 text-xs mb-2">在 Paddle Dashboard → Notifications → New Destination：</p>
                <div className="bg-black/30 rounded-lg p-2 flex items-center justify-between">
                  <code className="text-xs text-neon" style={{color:'#c8ff3e'}}>https://你的railway網址.railway.app/api/payment/webhook</code>
                </div>
                <p className="text-white/30 text-xs mt-2">勾選事件：<code>transaction.completed</code></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gmail SMTP 設定 ── */}
      {tab === 'smtp' && (
        <div className="max-w-2xl space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Mail size={20} className="text-blue-400" />
              <h2 className="font-bold text-lg">Gmail SMTP 寄信設定</h2>
              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">用於忘記密碼寄信</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="font-bold mb-2 text-blue-400">📋 設定步驟</p>
                <ol className="space-y-2 text-white/60 list-decimal list-inside">
                  <li>前往 <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google 帳號安全性</a></li>
                  <li>開啟「<strong className="text-white">兩步驟驗證</strong>」（必須先開啟）</li>
                  <li>搜尋「<strong className="text-white">應用程式密碼</strong>」</li>
                  <li>選擇「<strong className="text-white">郵件</strong>」→「<strong className="text-white">Windows 電腦</strong>」</li>
                  <li>複製產生的 <strong className="text-white">16 碼密碼</strong></li>
                </ol>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="font-bold mb-3">⚙️ 填入 server/.env</p>
                <pre className="text-xs text-white/50 bg-black/30 rounded-lg p-3">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=你的gmail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # 16碼應用程式密碼`}</pre>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-amber-400 text-xs">💡 目前忘記密碼功能在「開發模式」下會直接在頁面顯示重設連結，設定 SMTP 後才會真正寄信給用戶。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 部署上線 ── */}
      {tab === 'deploy' && (
        <div className="max-w-2xl space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🚀</span>
              <h2 className="font-bold text-lg">部署上線指南</h2>
            </div>

            <div className="space-y-5 text-sm">

              {/* Step 1: GitHub */}
              <div className="border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="font-bold">上傳到 GitHub</p>
                </div>
                <pre className="text-xs text-white/50 bg-black/30 rounded-lg p-3 overflow-x-auto">{`# 在專案根目錄執行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/goblin-ai.git
git push -u origin main`}</pre>
                <a href="https://github.com/new" target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-neon hover:underline" style={{color:'#c8ff3e'}}>
                  <ExternalLink size={11} />建立 GitHub Repository
                </a>
              </div>

              {/* Step 2: Railway */}
              <div className="border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="font-bold">後端部署到 Railway</p>
                  <span className="text-white/30 text-xs">免費 $5/月額度</span>
                </div>
                <ol className="space-y-1.5 text-white/60 list-decimal list-inside">
                  <li>前往 <a href="https://railway.app" target="_blank" rel="noreferrer" className="text-neon underline" style={{color:'#c8ff3e'}}>railway.app</a> 用 GitHub 登入</li>
                  <li>New Project → Deploy from GitHub → 選你的 repo</li>
                  <li>設定 Root Directory 為 <code className="bg-white/10 px-1 rounded">server</code></li>
                  <li>到 Variables 填入所有 .env 內容</li>
                  <li>複製網址（例如：<code className="bg-white/10 px-1 rounded">goblin-ai.railway.app</code>）</li>
                </ol>
              </div>

              {/* Step 3: Vercel */}
              <div className="border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="font-bold">前端部署到 Vercel</p>
                  <span className="text-white/30 text-xs">完全免費</span>
                </div>
                <ol className="space-y-1.5 text-white/60 list-decimal list-inside">
                  <li>前往 <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-neon underline" style={{color:'#c8ff3e'}}>vercel.com</a> 用 GitHub 登入</li>
                  <li>Import Project → 選你的 repo</li>
                  <li>Root Directory 設為 <code className="bg-white/10 px-1 rounded">client</code></li>
                  <li>更新 <code className="bg-white/10 px-1 rounded">client/vercel.json</code> 中的 Railway 網址</li>
                  <li>Deploy！取得網址（例如：<code className="bg-white/10 px-1 rounded">goblinai.vercel.app</code>）</li>
                </ol>
              </div>

              {/* Step 4: 自訂網域 */}
              <div className="border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <p className="font-bold">綁定自訂網域（選配）</p>
                </div>
                <p className="text-white/50">在 Vercel → Domains 加入你的網域（如 goblinai.com），然後在你的網域服務商設定 CNAME 指向 <code className="bg-white/10 px-1 rounded">cname.vercel-dns.com</code></p>
              </div>

              <div className="bg-[#c8ff3e]/5 border border-[#c8ff3e]/20 rounded-xl p-3">
                <p className="text-neon text-xs font-bold mb-1" style={{color:'#c8ff3e'}}>💡 上線後記得更新</p>
                <ul className="text-white/40 text-xs space-y-1">
                  <li>• Railway 的 <code>CLIENT_URL</code> 改成 Vercel 網址</li>
                  <li>• <code>vercel.json</code> 中的 API 網址改成 Railway 網址</li>
                  <li>• Paddle Webhook URL 更新為 Railway 網址</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
