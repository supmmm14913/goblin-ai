import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Generate from './pages/Generate'
import History from './pages/History'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import PaymentSuccess from './pages/PaymentSuccess'
import Admin from './pages/Admin'
import Settings from './pages/Settings'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'admin') return <Navigate to="/" />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/generate" /> : children
}

function AppLayout({ children, fullWidth }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#08080a]">
      <Navbar />
      <main className={`flex-1 ${fullWidth ? 'px-4 py-4' : 'container mx-auto px-4 py-6 max-w-6xl'}`}>
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } }
          }}
        />
        <Routes>
          {/* 公開頁面 */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 付款結果 */}
          <Route path="/payment/success" element={<PrivateRoute><PaymentSuccess /></PrivateRoute>} />

          {/* 需要登入 */}
          <Route path="/generate" element={<PrivateRoute><AppLayout fullWidth><Generate /></AppLayout></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><AppLayout><History /></AppLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><AppLayout><Settings /></AppLayout></PrivateRoute>} />

          {/* 管理後台 */}
          <Route path="/admin" element={<AdminRoute><AppLayout><Admin /></AppLayout></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
