import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, Coins, Sparkles } from 'lucide-react'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const { updateCredits } = useAuth()
  const [status, setStatus] = useState('verifying')
  const [data, setData] = useState(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) { setStatus('error'); return }

    axios.get(`/payment/verify/${sessionId}`)
      .then(res => {
        setData(res.data)
        updateCredits(res.data.credits)
        setStatus('success')
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold">驗證付款中...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">付款成功！</h2>
            {!data?.duplicate && (
              <div className="flex items-center justify-center gap-2 text-amber-400 text-xl font-bold my-4">
                <Coins size={24} />
                +{data?.added} 點數已加入你的帳號
              </div>
            )}
            <p className="text-gray-400 mb-6">目前剩餘：<strong className="text-white">{data?.credits}</strong> 點</p>
            <Link to="/generate" className="btn-primary flex items-center justify-center gap-2 w-full py-3">
              <Sparkles size={18} />
              開始創作
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">驗證失敗</h2>
            <p className="text-gray-400 mb-6">如已付款請聯絡客服，點數會手動補發</p>
            <Link to="/pricing" className="btn-secondary block py-3">返回定價頁</Link>
          </>
        )}
      </div>
    </div>
  )
}
