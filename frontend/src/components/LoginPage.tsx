import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(phone, password)
      // Redirect based on role
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}')
      if (authUser.role === 'SYSTEM_ADMIN') {
        navigate('/admin/dashboard')
      } else if (authUser.role === 'COOP_ADMIN') {
        navigate('/coop/dashboard')
      } else if (authUser.role === 'FARMER') {
        navigate('/farmer/dashboard')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || t('login.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white mb-6 transition-colors text-sm"
        >
          {t('login.backToHome')}
        </button>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 border shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">{t('login.title')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('login.phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border-slate-700 bg-slate-900/50 px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder={t('login.phonePlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('login.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border-slate-700 bg-slate-900/50 px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder={t('login.passwordPlaceholder')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('login.loggingIn') : t('login.loginButton')}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
              {t('login.demoAccounts')}
            </p>
            <div className="space-y-2 text-xs">
              <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                <p className="text-slate-400 mb-1">{t('login.systemAdmin')}</p>
                <p className="text-slate-300 font-mono">0900000001 / admin123</p>
                <p className="text-slate-500 text-[10px] mt-1">{t('login.or')}: 0900000010 / admin123</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                <p className="text-slate-400 mb-1">{t('login.htxAdmin')}</p>
                <p className="text-slate-300 font-mono">0900000002 / coop123</p>
                <p className="text-slate-500 text-[10px] mt-1">HTX khác: 0900000011, 0900000020, 0900000021</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                <p className="text-slate-400 mb-1">{t('login.farmer')}</p>
                <p className="text-slate-300 font-mono">0900000003 / farmer123</p>
                <p className="text-slate-500 text-[10px] mt-1">{t('login.otherFarmers')}: 0900000004-0005, 0900000012-0013, 0900000022-0023, 0900000030-0031</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

