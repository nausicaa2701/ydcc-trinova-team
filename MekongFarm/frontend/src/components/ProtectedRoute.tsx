import { Navigate } from 'react-router-dom'
import { useAuth, UserRole } from '@/contexts/AuthContext'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'SYSTEM_ADMIN') {
      return <Navigate to="/admin/dashboard" replace />
    } else if (user.role === 'COOP_ADMIN') {
      return <Navigate to="/coop/dashboard" replace />
    } else if (user.role === 'FARMER') {
      return <Navigate to="/farmer/dashboard" replace />
    }
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

