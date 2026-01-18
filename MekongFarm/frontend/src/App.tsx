import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRedirect from './components/RoleBasedRedirect'

// System Admin Views
import AdminDashboard from './views/admin/AdminDashboard'
import AdminCoopsManagement from './views/admin/AdminCoopsManagement'
import AdminMapView from './views/admin/AdminMapView'

// HTX Admin Views
import CoopDashboard from './views/coop/CoopDashboard'
import CoopFarmersManagement from './views/coop/CoopFarmersManagement'
import CoopAlertsConfig from './views/coop/CoopAlertsConfig'
import CoopMapView from './views/coop/CoopMapView'

// Farmer Views
import FarmerDashboard from './views/farmer/FarmerDashboard'
import FarmerMapView from './views/farmer/FarmerMapView'
import FarmerProfile from './views/farmer/FarmerProfile'

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <RoleBasedRedirect /> : <LoginPage />} />

      {/* System Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="coops" element={<AdminCoopsManagement />} />
              <Route path="map" element={<AdminMapView />} />
              <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* HTX Admin routes */}
      <Route
        path="/coop/*"
        element={
          <ProtectedRoute allowedRoles={['COOP_ADMIN']}>
            <Routes>
              <Route path="dashboard" element={<CoopDashboard />} />
              <Route path="farmers" element={<CoopFarmersManagement />} />
              <Route path="alerts" element={<CoopAlertsConfig />} />
              <Route path="map" element={<CoopMapView />} />
              <Route path="" element={<Navigate to="/coop/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Farmer routes */}
      <Route
        path="/farmer/*"
        element={
          <ProtectedRoute allowedRoles={['FARMER']}>
            <Routes>
              <Route path="dashboard" element={<FarmerDashboard />} />
              <Route path="map" element={<FarmerMapView />} />
              <Route path="profile" element={<FarmerProfile />} />
              <Route path="" element={<Navigate to="/farmer/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      {/* Redirect root to role-based dashboard if authenticated */}
      <Route
        path="/redirect"
        element={
          isAuthenticated ? <RoleBasedRedirect /> : <Navigate to="/" replace />
        }
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

