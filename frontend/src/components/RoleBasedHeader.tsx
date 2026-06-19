import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MapTrifold, Users, ChartBar, SignOut, User, ChatCircle, List, X } from '@phosphor-icons/react'
import LanguageSwitcher from './LanguageSwitcher'
import Logo from './Logo'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RoleBasedHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) return null

  // System Admin navigation
  if (user.role === 'SYSTEM_ADMIN') {
    const navItems = [
      { path: '/admin/map', label: t('navigation.mapView'), icon: <MapTrifold className="w-5 h-5" /> },
      { path: '/admin/dashboard', label: t('navigation.dashboard'), icon: <ChartBar className="w-5 h-5" /> },
      { path: '/admin/coops', label: t('navigation.htxManagement'), icon: <Users className="w-5 h-5" /> },
    ]

    // Check if current path matches map view (default active)
    const isMapActive = location.pathname === '/admin/map' || location.pathname.startsWith('/admin/map')

    return (
      <>
        <header className="h-16 flex-shrink-0 bg-white backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-30 shadow-sm relative">
          <div className="flex items-center h-full gap-4 lg:gap-12">
            <Logo size="md" variant="light" />
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center h-full gap-1">
              {navItems.map((item) => {
                const isActive = item.path === '/admin/map' 
                  ? isMapActive 
                  : location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'text-primary border-primary bg-primary/5'
                        : 'text-gray-600 hover:text-primary border-transparent'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <LanguageSwitcher />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-900">{user.name}</p>
              <p className="text-[10px] text-gray-500">{t('header.systemAdmin')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
              title={t('common.logout')}
            >
              <SignOut className="w-5 h-5" />
            </button>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
          </div>
        </header>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        {/* Mobile Navigation Drawer */}
        <nav className={`
          lg:hidden fixed top-16 right-0 h-[calc(100vh-4rem)]
          w-64 bg-white border-l border-gray-200 shadow-2xl
          z-40 transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-y-auto
        `}>
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.path === '/admin/map' 
                ? isMapActive 
                : location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/10 border border-primary/20'
                      : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </>
    )
  }

  // HTX Admin navigation
  if (user.role === 'COOP_ADMIN') {
    const navItems = [
      { path: '/coop/map', label: t('navigation.map'), icon: <MapTrifold className="w-5 h-5" /> },
      { path: '/coop/dashboard', label: t('navigation.dashboard'), icon: <ChartBar className="w-5 h-5" /> },
      { path: '/coop/farmers', label: t('navigation.farmers'), icon: <Users className="w-5 h-5" /> },
      { path: '/coop/zalo-messages', label: t('header.headerZaloMessageManagement'), icon: <ChatCircle className="w-5 h-5" /> },
    ]

    // Check if current path matches map view (default active)
    const isMapActive = location.pathname === '/coop/map' || location.pathname.startsWith('/coop/map')

    return (
      <>
        <header className="h-16 flex-shrink-0 bg-white backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-30 shadow-sm relative">
          <div className="flex items-center h-full gap-4 lg:gap-12">
            <Logo size="md" variant="light" />
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center h-full gap-1">
              {navItems.map((item) => {
                const isActive = item.path === '/coop/map' 
                  ? isMapActive 
                  : location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'text-amber-600 border-amber-600 bg-amber-50'
                        : 'text-gray-600 hover:text-amber-600 border-transparent'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <LanguageSwitcher />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-900">{user.name}</p>
              <p className="text-[10px] text-gray-500">{t('header.coopAdmin')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
              title={t('common.logout')}
            >
              <SignOut className="w-5 h-5" />
            </button>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
          </div>
        </header>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        {/* Mobile Navigation Drawer */}
        <nav className={`
          lg:hidden fixed top-16 right-0 h-[calc(100vh-4rem)]
          w-64 bg-white border-l border-gray-200 shadow-2xl
          z-40 transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-y-auto
        `}>
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.path === '/coop/map' 
                ? isMapActive 
                : location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-amber-600 bg-amber-50 border border-amber-200'
                      : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </>
    )
  }

  // Farmer navigation
  if (user.role === 'FARMER') {
    const navItems = [
      { path: '/farmer/map', label: t('navigation.map'), icon: <MapTrifold className="w-5 h-5" /> },
      { path: '/farmer/dashboard', label: t('navigation.dashboard'), icon: <ChartBar className="w-5 h-5" /> },
      { path: '/farmer/profile', label: t('navigation.profile'), icon: <User className="w-5 h-5" /> },
    ]

    // Check if current path matches map view (default active)
    const isMapActive = location.pathname === '/farmer/map' || location.pathname.startsWith('/farmer/map')

    return (
      <>
        <header className="h-16 flex-shrink-0 bg-white backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-30 shadow-sm relative">
          <div className="flex items-center h-full gap-4 lg:gap-12">
            <Logo size="md" variant="light" />
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center h-full gap-1">
              {navItems.map((item) => {
                const isActive = item.path === '/farmer/map' 
                  ? isMapActive 
                  : location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'text-green-600 border-green-600 bg-green-50'
                        : 'text-gray-600 hover:text-green-600 border-transparent'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <LanguageSwitcher />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-900">{user.name}</p>
              <p className="text-[10px] text-gray-500">{t('roles.farmer')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
              title={t('common.logout')}
            >
              <SignOut className="w-5 h-5" />
            </button>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
          </div>
        </header>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        {/* Mobile Navigation Drawer */}
        <nav className={`
          lg:hidden fixed top-16 right-0 h-[calc(100vh-4rem)]
          w-64 bg-white border-l border-gray-200 shadow-2xl
          z-40 transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-y-auto
        `}>
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.path === '/farmer/map' 
                ? isMapActive 
                : location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-green-600 bg-green-50 border border-green-200'
                      : 'text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </>
    )
  }

  return null
}

