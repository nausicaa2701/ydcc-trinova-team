import { useState } from 'react'
import RoleBasedHeader from '@/components/RoleBasedHeader'
import FarmerLocationInput from '@/components/FarmerLocationInput'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/utils/apiClient'
import { User, Phone, Key, FloppyDisk } from '@phosphor-icons/react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function FarmerProfile() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (newPassword !== confirmPassword) {
      setMessage(t('farmer.newPasswordsDoNotMatch'))
      return
    }

    if (newPassword.length < 6) {
      setMessage(t('farmer.passwordMustBeAtLeast6'))
      return
    }

    setSaving(true)
    try {
      const response = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      })

      if (response.ok) {
        setMessage(t('farmer.passwordChangedSuccessfully'))
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const error = await response.json()
        setMessage(error.detail || t('farmer.errorChangingPassword'))
      }
    } catch (error) {
      setMessage(t('farmer.errorChangingPassword'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">{t('farmer.myProfile')}</h2>

          {/* User Info */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('farmer.accountInformation')}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">{t('admin.name')}</label>
                <p className="text-white font-medium">{user?.name}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t('farmer.phoneNumber')}
                </label>
                <p className="text-white font-medium">{user?.phone}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">{t('farmer.role')}</label>
                <p className="text-white font-medium">{t('roles.farmer')} ({t('roles.hoSanXuat')})</p>
              </div>
            </div>
          </div>

          {/* Farmer Location & Station Selection */}
          {user?.id && user?.coop_id && (
            <div className="mb-6">
              <FarmerLocationInput
                farmerId={user.id}
                coopId={user.coop_id}
                currentLat={(user as any).lat}
                currentLon={(user as any).lon}
                currentStationId={(user as any).station_id}
                onLocationUpdated={() => {
                  // Optionally reload user data
                  window.location.reload()
                }}
              />
            </div>
          )}

          {/* Change Password */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t('farmer.changePassword')}
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {message && (
                <div className={`p-3 rounded-lg ${
                  message.includes('successfully') || message.includes('thành công')
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('farmer.currentPassword')}</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('farmer.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('farmer.confirmNewPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FloppyDisk className="w-5 h-5" />
                {saving ? t('farmer.changing') : t('farmer.changePasswordButton')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

