import { useState, useEffect } from 'react'
import { Drop, Calendar, Warning, CheckCircle, Brain } from '@phosphor-icons/react'
import { fetchStoragePlanning, fetchStations, type StoragePlanning, type Station } from '@/utils/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAppStore } from '@/store/useAppStore'
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

export default function StoragePlanningView() {
  const { t } = useLanguage()
  const { decisionSupportViewMode, setDecisionSupportViewMode } = useAppStore()
  const [storageData, setStorageData] = useState<StoragePlanning | null>(null)
  const [loading, setLoading] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string>('')

  useEffect(() => {
    const loadStations = async () => {
      const stationsList = await fetchStations()
      setStations(stationsList)
      if (stationsList.length > 0 && !selectedStation) {
        setSelectedStation(stationsList[0].station_id)
      }
    }
    loadStations()
  }, [])
  
  // User inputs
  const [currentLevel, setCurrentLevel] = useState(68.0)
  const [dailyConsumption, setDailyConsumption] = useState(1000.0)
  const [totalCapacity, setTotalCapacity] = useState(50000.0)
  const [horizonDays] = useState(30)

  useEffect(() => {
    const loadStorageData = async () => {
      setLoading(true)
      try {
        const data = await fetchStoragePlanning(
          selectedStation,
          currentLevel,
          dailyConsumption,
          totalCapacity,
          horizonDays
        )
        if (data) {
          setStorageData(data)
        }
      } catch (error) {
        console.error('Error loading storage planning:', error)
      } finally {
        setLoading(false)
      }
    }
    loadStorageData()
  }, [selectedStation, currentLevel, dailyConsumption, totalCapacity, horizonDays])

  const getDaysRemainingColor = (days: number) => {
    if (days < 7) return 'text-red-500'
    if (days < 14) return 'text-orange-500'
    if (days < 30) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getDaysRemainingBg = (days: number) => {
    if (days < 7) return 'bg-red-500/10 border-red-500/20'
    if (days < 14) return 'bg-orange-500/10 border-orange-500/20'
    if (days < 30) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-green-500/10 border-green-500/20'
  }

  // Generate timeline data
  const timelineData = Array.from({ length: Math.min(horizonDays, 30) }, (_, i) => ({
    day: i + 1,
    level: Math.max(0, currentLevel - (i * (dailyConsumption / totalCapacity) * 100)),
    threshold: 20, // Critical threshold
  }))

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col hidden sm:flex shadow-sm">
        <nav className="flex-1 px-4 space-y-2 mt-8">
          <p className="hidden lg:block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-4">
            AI Tools
          </p>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('overview')
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
              decisionSupportViewMode === 'overview'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.recommendationEngine')}</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('storage')
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
              decisionSupportViewMode === 'storage'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            <Drop className="w-5 h-5" />
            <span className="text-sm font-bold hidden lg:block">{t('storagePlanning.storagePlanningTitle')}</span>
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Drop className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-black text-gray-900">{t('storagePlanning.storagePlanningTitle')}</h1>
          </div>
          <p className="text-gray-600">{t('storagePlanning.storagePlanningSubtitle')}</p>
        </div>

        {/* Input Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('storagePlanning.storagePlanningReservoirInfo')}</h3>
          <p className="text-xs text-gray-600 mb-4">{t('storagePlanning.storagePlanningEnterInfo')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('storagePlanning.storagePlanningSelectStation')}</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-bold focus:ring-2 focus:ring-primary focus:border-primary"
                disabled={stations.length === 0}
              >
                {stations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name || station.station_id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('storagePlanning.storagePlanningCurrentLevel')}</label>
              <input
                type="number"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-bold focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">{t('storagePlanning.storagePlanningLevelPercent')}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('storagePlanning.storagePlanningDailyConsumption')}</label>
              <input
                type="number"
                value={dailyConsumption}
                onChange={(e) => setDailyConsumption(parseFloat(e.target.value))}
                min="0"
                step="10"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-bold focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">{t('storagePlanning.storagePlanningDailyUsage')}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">{t('storagePlanning.storagePlanningTotalCapacity')}</label>
              <input
                type="number"
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(parseFloat(e.target.value))}
                min="0"
                step="1000"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm font-bold focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">{t('storagePlanning.storagePlanningMaxCapacity')}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">{t('storagePlanning.storagePlanningLoading')}</div>
          </div>
        ) : !storageData ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-red-600">{t('storagePlanning.storagePlanningLoadError')}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Level & Days Remaining */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('storagePlanning.storagePlanningReservoirStatus')}</h3>
                <p className="text-xs text-gray-600 mb-6">{t('storagePlanning.storagePlanningReservoirInfo2')}</p>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-gray-700">{t('storagePlanning.storagePlanningCurrentWaterLevel')}</span>
                      <span className="text-primary text-lg">{storageData.current_level_percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${storageData.current_level_percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {((storageData.current_level_percent / 100) * totalCapacity).toFixed(0)} m³ / {totalCapacity.toLocaleString()} m³
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl border ${getDaysRemainingBg(storageData.days_of_supply)}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-gray-700">{t('storagePlanning.storagePlanningDaysRemaining')}</h4>
                      <Calendar className={`w-5 h-5 ${getDaysRemainingColor(storageData.days_of_supply)}`} />
                    </div>
                    <div className={`text-5xl font-black mb-2 ${getDaysRemainingColor(storageData.days_of_supply)}`}>
                      {storageData.days_of_supply}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">{t('storagePlanning.storagePlanningDays')}</div>
                    {storageData.shortfall_date && (
                      <div className="flex items-center gap-2 mt-4 text-xs font-bold text-red-600">
                        <Warning className="w-4 h-4" />
                        <span>{t('storagePlanning.storagePlanningShortfallExpected')} {new Date(storageData.shortfall_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    )}
                    {!storageData.shortfall_date && storageData.days_of_supply > 30 && (
                      <div className="flex items-center gap-2 mt-4 text-xs font-bold text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{t('storagePlanning.storagePlanningSufficientWater')}</span>
                      </div>
                    )}
                  </div>

                  {/* Safe Window */}
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Drop className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700 uppercase">{t('storagePlanning.storagePlanningSafeWindow')}</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      {t('storagePlanning.storagePlanningDaysBeforeThreshold', { days: String(storageData.safe_window_days) })}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{t('storagePlanning.storagePlanningSafeWindowDesc')}</p>
                  </div>
                </div>
              </div>

              {/* Timeline Chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('storagePlanning.storagePlanningForecastTitle')}</h3>
                <p className="text-xs text-gray-600 mb-6">{t('storagePlanning.storagePlanningForecastDesc')}</p>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="level"
                      stroke="#1392ec"
                      fill="#1392ec"
                      fillOpacity={0.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="threshold"
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recommendations & Requirements */}
            <div className="space-y-6">
              {/* Optimal Fill Date */}
              {storageData.optimal_fill_date && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <h4 className="text-sm font-bold text-amber-700 uppercase">{t('storagePlanning.storagePlanningOptimalFill')}</h4>
                  </div>
                  <div className="text-2xl font-black text-gray-900 mb-2">
                    {new Date(storageData.optimal_fill_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed">
                    {t('storagePlanning.storagePlanningOptimalFillDesc')}
                  </div>
                </div>
              )}

              {/* Storage Requirements */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-4">{t('storagePlanning.storagePlanningRequirements')}</h4>
                <p className="text-xs text-gray-600 mb-4">{t('storagePlanning.storagePlanningRequirementsDesc')}</p>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">{t('storagePlanning.storagePlanningRequiredCapacity')}</div>
                    <div className="text-xl font-black text-gray-900">
                      {storageData.storage_requirements.required_capacity_m3.toLocaleString()} m³
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('storagePlanning.storagePlanningMinWater')}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">{t('storagePlanning.storagePlanningCriticalPeriod')}</div>
                    <div className="text-xl font-black text-gray-900">
                      {storageData.storage_requirements.critical_period_days} {t('storagePlanning.storagePlanningDays')}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('storagePlanning.storagePlanningCriticalPeriodDesc')}</p>
                  </div>
                  {storageData.storage_requirements.recommended_fill_date && (
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">{t('storagePlanning.storagePlanningRecommendedFill')}</div>
                      <div className="text-lg font-bold text-primary">
                        {new Date(storageData.storage_requirements.recommended_fill_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}
                      </div>
                      <p className="text-xs text-gray-700 mt-1">{t('storagePlanning.storagePlanningStartCollection')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {storageData.recommendations && storageData.recommendations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">{t('storagePlanning.storagePlanningCoopRecommendations')}</h4>
                  <p className="text-xs text-gray-600 mb-4">{t('storagePlanning.storagePlanningActionsBasedOnStatus')}</p>
                  <div className="space-y-3">
                    {storageData.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          rec.priority === 'urgent'
                            ? 'bg-red-50 border-red-200'
                            : rec.priority === 'high'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Warning
                            className={`w-4 h-4 ${
                              rec.priority === 'urgent' ? 'text-red-600' : rec.priority === 'high' ? 'text-orange-600' : 'text-yellow-600'
                            }`}
                          />
                          <span className="text-xs font-bold uppercase text-gray-900">
                            {rec.priority === 'urgent' ? t('storagePlanning.storagePlanningEmergency') : rec.priority === 'high' ? t('storagePlanning.storagePlanningHigh') : t('storagePlanning.storagePlanningMedium')}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-gray-900 mb-2">{rec.message}</div>
                        {rec.deadline && (
                          <div className="text-xs text-gray-600">
                            {t('storagePlanning.storagePlanningDeadline')} {new Date(rec.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}