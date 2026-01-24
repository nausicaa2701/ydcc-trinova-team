import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SYSTEM_ADMIN') {
        navigate('/admin/dashboard', { replace: true })
      } else if (user.role === 'COOP_ADMIN') {
        navigate('/coop/map', { replace: true })
      } else if (user.role === 'FARMER') {
        navigate('/farmer/dashboard', { replace: true })
      }
    } else {
      navigate('/login', { replace: true })
    }
  }, [user, isAuthenticated, navigate])

  return null
}

