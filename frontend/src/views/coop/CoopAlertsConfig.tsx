import { useState, useEffect } from 'react'
import RoleBasedHeader from '@/components/RoleBasedHeader'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/utils/apiClient'
import { Bell, Send, Save } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface AlertConfig {
  coop_id: string
  threshold_salinity: number
  notify_all_farmers: boolean
  farmer_groups: string[]
  message_template: string
}

export default function CoopAlertsConfig() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [config, setConfig] = useState<AlertConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (user?.coop_id) {
      loadConfig()
    }
  }, [user])

  const loadConfig = async () => {
    if (!user?.coop_id) return

    try {
      const response = await apiRequest(`/coops/${user.coop_id}/alerts/config`)
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!user?.coop_id || !config) return

    setSaving(true)
    try {
      const response = await apiRequest(`/coops/${user.coop_id}/alerts/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      })
      if (response.ok) {
        alert('Alert configuration saved successfully!')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Error saving configuration')
    } finally {
      setSaving(false)
    }
  }

  const testAlert = async () => {
    if (!user?.coop_id) return

    setTesting(true)
    try {
      const response = await apiRequest(`/coops/${user.coop_id}/alerts/test`, {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        alert(`Test alert sent! ${data.farmer_count} farmers notified.`)
      }
    } catch (error) {
      console.error('Error testing alert:', error)
      alert('Error sending test alert')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-slate-900">
        <RoleBasedHeader />
        <div className="flex-1 flex items-center justify-center text-slate-400">{t('common.loading')}</div>
      </div>
    )
  }

  if (!config) {
    // Initialize default config
    setConfig({
      coop_id: user?.coop_id || '',
      threshold_salinity: 4.0,
      notify_all_farmers: true,
      farmer_groups: [],
      message_template: 'Cảnh báo: Độ mặn vượt ngưỡng {threshold} g/L tại {coop_name}',
    })
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{t('coop.alertConfiguration')}</h2>
              <p className="text-slate-400">{t('coop.configureZaloNotifications')}</p>
            </div>
            <button
              onClick={testAlert}
              disabled={testing}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {testing ? t('coop.sending') : t('coop.testZaloNotification')}
            </button>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('coop.salinityThreshold')}
              </label>
              <input
                type="number"
                step="0.1"
                value={config.threshold_salinity}
                onChange={(e) => setConfig({ ...config, threshold_salinity: parseFloat(e.target.value) })}
                className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">{t('coop.alertWillTrigger')}</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <input
                  type="checkbox"
                  checked={config.notify_all_farmers}
                  onChange={(e) => setConfig({ ...config, notify_all_farmers: e.target.checked })}
                  className="rounded"
                />
                {t('coop.notifyAllFarmers')}
              </label>
              <p className="text-xs text-slate-400 ml-6">{t('coop.sendAlertToAll')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('coop.messageTemplate')}
              </label>
              <textarea
                value={config.message_template}
                onChange={(e) => setConfig({ ...config, message_template: e.target.value })}
                className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white h-24"
                placeholder="Cảnh báo: Độ mặn vượt ngưỡng {threshold} g/L tại {coop_name}"
              />
              <p className="text-xs text-slate-400 mt-1">
                {t('coop.usePlaceholders')}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? t('coop.saving') : t('coop.saveConfiguration')}
              </button>
            </div>
          </div>

          <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400 mb-1">{t('coop.howItWorks')}</h4>
                <p className="text-xs text-slate-300">
                  {t('coop.howItWorksDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

