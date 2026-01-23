import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MapTrifold, Users, ChartBar, Gear, SignOut, User } from '@phosphor-icons/react'
import LanguageSwitcher from './LanguageSwitcher'
import Logo from './Logo'
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
      { path: '/admin/dashboard', label: t('navigation.dashboard'), icon: <ChartBar className="w-5 h-5" /> },
      { path: '/admin/coops', label: t('navigation.htxManagement'), icon: <Users className="w-5 h-5" /> },
      { path: '/admin/map', label: t('navigation.mapView'), icon: <MapTrifold className="w-5 h-5" /> },
    ]

    return (
      <header className="h-16 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-30">
        <div className="flex items-center h-full gap-12">
          <Logo size="md" variant="dark" />
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
            <SignOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    )
  }

  // HTX Admin navigation
  if (user.role === 'COOP_ADMIN') {
    const navItems = [
      { path: '/coop/dashboard', label: t('navigation.dashboard'), icon: <ChartBar className="w-5 h-5" /> },
      { path: '/coop/farmers', label: t('navigation.farmers'), icon: <Users className="w-5 h-5" /> },
      { path: '/coop/alerts', label: t('navigation.alerts'), icon: <Gear className="w-5 h-5" /> },
      { path: '/coop/map', label: t('navigation.map'), icon: <MapTrifold className="w-5 h-5" /> },
    ]

    return (
      <header className="h-16 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-30">
        <div className="flex items-center h-full gap-12">
          <Logo size="md" variant="dark" />
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
            <SignOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    )
  }

  // Farmer navigation
  if (user.role === 'FARMER') {
    const navItems = [
      { path: '/farmer/dashboard', label: t('navigation.dashboard'), icon: <ChartBar className="w-5 h-5" /> },
      { path: '/farmer/map', label: t('navigation.map'), icon: <MapTrifold className="w-5 h-5" /> },
      { path: '/farmer/profile', label: t('navigation.profile'), icon: <User className="w-5 h-5" /> },
    ]

    return (
      <header className="h-16 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-30">
        <div className="flex items-center h-full gap-12">
          <Logo size="md" variant="dark" />
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
            <SignOut className="w-5 h-5" />
          </button>
        </div>
      </header>
    )
  }

  return null
}

