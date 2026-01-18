import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Map, Users, BarChart3, Settings, LogOut, User } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RoleBasedHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) return null

  // System Admin navigation
  if (user.role === 'SYSTEM_ADMIN') {
    const navItems = [
      { path: '/admin/dashboard', label: t('navigation.dashboard'), icon: <BarChart3 className="w-5 h-5" /> },
      { path: '/admin/coops', label: t('navigation.htxManagement'), icon: <Users className="w-5 h-5" /> },
      { path: '/admin/map', label: t('navigation.mapView'), icon: <Map className="w-5 h-5" /> },
    ]

    return (
      <header className="h-16 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-30">
        <div className="flex items-center h-full gap-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-primary">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white text-lg font-bold leading-none tracking-tight">{t('header.mekongSalinityAI')}</h1>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{t('header.systemAdmin')}</span>
            </div>
          </div>
          <nav className="flex items-center h-full gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                  location.pathname === item.path
                    ? 'text-white border-primary bg-primary/5'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{user.name}</p>
            <p className="text-[10px] text-slate-400">{t('header.systemAdmin')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title={t('common.logout')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    )
  }

  // HTX Admin navigation
  if (user.role === 'COOP_ADMIN') {
    const navItems = [
      { path: '/coop/dashboard', label: t('navigation.dashboard'), icon: <BarChart3 className="w-5 h-5" /> },
      { path: '/coop/farmers', label: t('navigation.farmers'), icon: <Users className="w-5 h-5" /> },
      { path: '/coop/alerts', label: t('navigation.alerts'), icon: <Settings className="w-5 h-5" /> },
      { path: '/coop/map', label: t('navigation.map'), icon: <Map className="w-5 h-5" /> },
    ]

    return (
      <header className="h-16 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-30">
        <div className="flex items-center h-full gap-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-amber-400">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white text-lg font-bold leading-none tracking-tight">{t('header.coopAdmin')}</h1>
              <span className="text-amber-400 text-[10px] uppercase font-bold tracking-widest">{t('header.cooperativeManagement')}</span>
            </div>
          </div>
          <nav className="flex items-center h-full gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                  location.pathname === item.path
                    ? 'text-white border-amber-400 bg-amber-400/5'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{user.name}</p>
            <p className="text-[10px] text-slate-400">{t('header.coopAdmin')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title={t('common.logout')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    )
  }

  // Farmer navigation
  if (user.role === 'FARMER') {
    const navItems = [
      { path: '/farmer/dashboard', label: t('navigation.dashboard'), icon: <BarChart3 className="w-5 h-5" /> },
      { path: '/farmer/map', label: t('navigation.map'), icon: <Map className="w-5 h-5" /> },
      { path: '/farmer/profile', label: t('navigation.profile'), icon: <User className="w-5 h-5" /> },
    ]

    return (
      <header className="h-16 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-30">
        <div className="flex items-center h-full gap-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 text-green-400">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white text-lg font-bold leading-none tracking-tight">{t('header.farmerPortal')}</h1>
              <span className="text-green-400 text-[10px] uppercase font-bold tracking-widest">{t('header.hoSanXuat')}</span>
            </div>
          </div>
          <nav className="flex items-center h-full gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                  location.pathname === item.path
                    ? 'text-white border-green-400 bg-green-400/5'
                    : 'text-slate-400 hover:text-white border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{user.name}</p>
            <p className="text-[10px] text-slate-400">{t('roles.farmer')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title={t('common.logout')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    )
  }

  return null
}

