import { useState, useEffect } from 'react'
import { Droplet, Calendar, AlertTriangle, TrendingDown, CheckCircle, Brain, TrendingUp } from 'lucide-react'
import { fetchStoragePlanning, fetchStations, type StoragePlanning, type Station } from '@/utils/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAppStore } from '@/store/useAppStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

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
  const [horizonDays, setHorizonDays] = useState(30)

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
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-slate-700 bg-slate-900 flex flex-col hidden sm:flex">
        <nav className="flex-1 px-4 space-y-2 mt-8">
          <p className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-4">
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
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.recommendationEngine')}</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('trend')
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
              decisionSupportViewMode === 'trend'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.trendAnalysis')}</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('storage')
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
              decisionSupportViewMode === 'storage'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <Droplet className="w-5 h-5" />
            <span className="text-sm font-bold hidden lg:block">{t('decisionSupport.storagePlanning')}</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('mitigation')
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
              decisionSupportViewMode === 'mitigation'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.riskMitigation')}</span>
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-900 p-8 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-black text-white">Storage Planning</h1>
          </div>
          <p className="text-slate-400">Reservoir capacity planning and supply management</p>
        </div>

        {/* Input Controls */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Station</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold"
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
              <label className="block text-sm font-bold text-slate-400 mb-2">Current Level (%)</label>
              <input
                type="number"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Daily Consumption (m³)</label>
              <input
                type="number"
                value={dailyConsumption}
                onChange={(e) => setDailyConsumption(parseFloat(e.target.value))}
                min="0"
                step="10"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">Total Capacity (m³)</label>
              <input
                type="number"
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(parseFloat(e.target.value))}
                min="0"
                step="1000"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-slate-400">Loading storage planning data...</div>
          </div>
        ) : !storageData ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-red-500">Failed to load storage planning data</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Level & Days Remaining */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Reservoir Status</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-slate-400">Current Reservoir Level</span>
                      <span className="text-primary">{storageData.current_level_percent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${storageData.current_level_percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {((storageData.current_level_percent / 100) * totalCapacity).toFixed(0)} m³ of {totalCapacity.toLocaleString()} m³
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl border ${getDaysRemainingBg(storageData.days_of_supply)}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase">Days of Supply Remaining</h4>
                      <Calendar className={`w-5 h-5 ${getDaysRemainingColor(storageData.days_of_supply)}`} />
                    </div>
                    <div className={`text-5xl font-black mb-2 ${getDaysRemainingColor(storageData.days_of_supply)}`}>
                      {storageData.days_of_supply}
                    </div>
                    <div className="text-xs text-slate-500 mb-1">days</div>
                    {storageData.shortfall_date && (
                      <div className="flex items-center gap-2 mt-4 text-xs font-bold text-red-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Shortfall expected by {new Date(storageData.shortfall_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                    {!storageData.shortfall_date && storageData.days_of_supply > 30 && (
                      <div className="flex items-center gap-2 mt-4 text-xs font-bold text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span>Supply sufficient for forecast period</span>
                      </div>
                    )}
                  </div>

                  {/* Safe Window */}
                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplet className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-amber-400 uppercase">Safe Operational Window</span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {storageData.safe_window_days} days until salinity exceeds safe threshold
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Chart */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Projected Reservoir Level</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
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
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h4 className="text-sm font-bold text-amber-400 uppercase">Optimal Fill Date</h4>
                  </div>
                  <div className="text-2xl font-black text-white mb-2">
                    {new Date(storageData.optimal_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-slate-400">
                    Last safe window to fill reservoirs before salinity increases
                  </div>
                </div>
              )}

              {/* Storage Requirements */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Storage Requirements</h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Required Capacity</div>
                    <div className="text-lg font-black text-white">
                      {storageData.storage_requirements.required_capacity_m3.toLocaleString()} m³
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Critical Period</div>
                    <div className="text-lg font-black text-white">
                      {storageData.storage_requirements.critical_period_days} days
                    </div>
                  </div>
                  {storageData.storage_requirements.recommended_fill_date && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Recommended Fill Date</div>
                      <div className="text-sm font-bold text-primary">
                        {new Date(storageData.storage_requirements.recommended_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {storageData.recommendations && storageData.recommendations.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Recommendations</h4>
                  <div className="space-y-3">
                    {storageData.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          rec.priority === 'urgent'
                            ? 'bg-red-500/10 border-red-500/20'
                            : rec.priority === 'high'
                            ? 'bg-orange-500/10 border-orange-500/20'
                            : 'bg-yellow-500/10 border-yellow-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle
                            className={`w-4 h-4 ${
                              rec.priority === 'urgent' ? 'text-red-500' : rec.priority === 'high' ? 'text-orange-500' : 'text-yellow-500'
                            }`}
                          />
                          <span className="text-xs font-bold uppercase">{rec.priority}</span>
                        </div>
                        <div className="text-sm font-bold text-white mb-1">{rec.message}</div>
                        {rec.deadline && (
                          <div className="text-xs text-slate-400">
                            Deadline: {new Date(rec.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
