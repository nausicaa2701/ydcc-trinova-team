import { useAppStore } from '@/store/useAppStore'
import { Brain, Drop, Warning, CheckCircle, Clock } from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { Badge } from 'primereact/badge'
import { 
  fetchSalinityPrediction, 
  fetchStations,
  fetchStoragePlanning,
  fetchRealtimeSalinityPrediction,
  // fetchLatestTH2IData, // Reserved for future use
  type StoragePlanning,
  type Station,
  type RealtimePrediction
  // type TH2IData // Reserved for future use
} from '@/utils/api'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import StoragePlanningView from './StoragePlanningView'

type ViewMode = 'overview' | 'storage'

export default function DecisionSupportView() {
  const { t } = useLanguage()
  const selectedDate = useAppStore((s) => s.selectedDate)
  const viewMode = useAppStore((s) => s.decisionSupportViewMode) as ViewMode
  const setDecisionSupportViewMode = useAppStore((s) => s.setDecisionSupportViewMode)
  const [predictions, setPredictions] = useState<any>(null)
  const [storagePlanning, setStoragePlanning] = useState<StoragePlanning | null>(null)
  const [loading, setLoading] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [realtimeData, setRealtimeData] = useState<RealtimePrediction | null>(null)
  const [forecastHorizon, setForecastHorizon] = useState<7 | 14 | 30>(7)
  const [selectedStation, setSelectedStation] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const stationsList = await fetchStations()
        setStations(stationsList)
        if (stationsList.length > 0 && !selectedStation) {
          setSelectedStation(stationsList[0].station_id)
        }
        
        const [pred, storage, realtime] = await Promise.all([
          fetchSalinityPrediction(forecastHorizon, selectedStation, selectedDate),
          fetchStoragePlanning(selectedStation, 68.0, 1000.0, 50000.0, forecastHorizon),
          selectedStation ? fetchRealtimeSalinityPrediction(selectedStation) : Promise.resolve(null)
        ])
        
        if (pred) setPredictions(pred)
        if (storage) setStoragePlanning(storage)
        if (realtime) setRealtimeData(realtime)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedDate, forecastHorizon, selectedStation])

  // Render different views based on viewMode
  if (viewMode === 'storage') {
    return <StoragePlanningView />
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col hidden sm:flex shadow-sm">
        <nav className="flex-1 px-4 space-y-2 mt-8">
          <p className="hidden lg:block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-4">
            {t('decisionSupport.aiTools')}
          </p>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('overview')
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
              viewMode === 'overview'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Brain className="w-5 h-5" style={viewMode === 'overview' ? { fill: 'currentColor' } : {}} />
            <span className="text-sm font-bold hidden lg:block">{t('decisionSupport.recommendationEngine')}</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('storage')
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
              (viewMode as string) === 'storage'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Drop className="w-5 h-5" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.decisionSupportStoragePlanning')}</span>
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="bg-primary/5 p-3 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-primary">{t('decisionSupport.aiStatus')}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            </div>
            <p className="text-[10px] font-bold text-gray-600 leading-tight hidden lg:block">
              {t('decisionSupport.decisionSupportProcessingData', { count: String(stations.length) })}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8 max-w-[1400px] mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge value={t('decisionSupport.decisionSupportMode')} severity="info" />
              </div>
              <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-2">
                {t('decisionSupport.agriculturalRecommendations')}
              </h2>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('decisionSupport.sync')} {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <Badge
                  value={`${t('decisionSupport.aiConfidence')} ${predictions?.confidence ? Math.round(predictions.confidence * 100) : 85}%`}
                  severity="success"
                  className="flex items-center gap-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                label={t('decisionSupport.exportInsights')}
                icon="pi pi-download"
                className="p-button-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Station Selector */}
              <Card className="shadow-sm">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-gray-700">{t('decisionSupport.station')}:</label>
                  <Dropdown
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.value)}
                    options={stations.map(s => ({ label: s.station_name || s.station_id, value: s.station_id }))}
                    disabled={stations.length === 0 || loading}
                    className="flex-1"
                    placeholder={t('decisionSupport.decisionSupportSelectStation')}
                  />
                </div>
              </Card>

              {/* Realtime Salinity Chart (30-minute resolution) */}
              {realtimeData && (
                <Card className="shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        {t('decisionSupport.decisionSupportRealtimeSalinity')}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('decisionSupport.decisionSupportDataFrom')} {(() => {
                          const now = new Date()
                          const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24h before
                          const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24h after
                          return `${startTime.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })} ${t('decisionSupport.decisionSupportTo')} ${endTime.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}`
                        })()}
                      </p>
                    </div>
                    <Badge
                      value={
                        realtimeData.summary.risk_level === 'danger' ? t('decisionSupport.decisionSupportDanger') :
                        realtimeData.summary.risk_level === 'warning' ? t('decisionSupport.decisionSupportWarning') :
                        realtimeData.summary.risk_level === 'watch' ? t('decisionSupport.decisionSupportWatch') : t('decisionSupport.decisionSupportSafe')
                      }
                      severity={
                        realtimeData.summary.risk_level === 'danger' ? 'danger' :
                        realtimeData.summary.risk_level === 'warning' ? 'warning' :
                        realtimeData.summary.risk_level === 'watch' ? 'info' : 'success'
                      }
                    />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={realtimeData.forecast.slice(0, 48).map((p, i) => {
                        // Calculate timestamp from current date
                        const now = new Date()
                        const forecastTime = new Date(now.getTime() + i * 30 * 60 * 1000) // Each step is 30 minutes
                        return {
                          time: forecastTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                          date: forecastTime.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
                          salinity: Number(p.salinity.toFixed(2)),
                          index: i,
                          fullTimestamp: forecastTime
                        }
                      })}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          interval={7}
                        />
                        <YAxis 
                          label={{ value: t('decisionSupport.decisionSupportSalinity'), angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value: number) => `${value.toFixed(2)}‰`}
                          labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0 && payload[0].payload) {
                              const data = payload[0].payload as any
                              return `${data.date} ${data.time}`
                            }
                            return label
                          }}
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                        />
                        <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `${t('decisionSupport.decisionSupportDanger')} (4‰)`, position: 'top', style: { fill: '#ef4444', fontSize: '10px' } }} />
                        <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `${t('decisionSupport.decisionSupportWarning')} (1‰)`, position: 'top', style: { fill: '#f59e0b', fontSize: '10px' } }} />
                        <Line
                          type="monotone"
                          dataKey="salinity"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">{t('decisionSupport.decisionSupportNow')}</div>
                      <div className="text-xl font-bold text-gray-900">{realtimeData.current_salinity.toFixed(2)}‰</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">{t('decisionSupport.decisionSupportMax6h')}</div>
                      <div className="text-xl font-bold text-yellow-600">{realtimeData.summary.max_salinity_6h.toFixed(2)}‰</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">{t('decisionSupport.decisionSupportMax24h')}</div>
                      <div className="text-xl font-bold text-orange-600">{realtimeData.summary.max_salinity_24h.toFixed(2)}‰</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Forecast Chart (7/14/30 days) */}
              <Card className="shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('decisionSupport.decisionSupportForecastDays', { days: String(forecastHorizon) })}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {t('decisionSupport.decisionSupportFrom')} {new Date(selectedDate).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })} {t('decisionSupport.decisionSupportTo')} {new Date(new Date(selectedDate).getTime() + forecastHorizon * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-700">{t('decisionSupport.decisionSupportStart')}:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          const newDate = e.target.value
                          useAppStore.getState().setSelectedDate(newDate)
                        }}
                        className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-xs font-bold"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-700">{t('decisionSupport.decisionSupportForecast')}:</label>
                      <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button
                          onClick={() => setForecastHorizon(7)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            forecastHorizon === 7 ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary'
                          }`}
                        >
                          {'7 ' + t('decisionSupport.decisionSupportDays')}
                        </button>
                        <button
                          onClick={() => setForecastHorizon(14)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            forecastHorizon === 14 ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary'
                          }`}
                        >
                          {'14 ' + t('decisionSupport.decisionSupportDays')}
                        </button>
                        <button
                          onClick={() => setForecastHorizon(30)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            forecastHorizon === 30 ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary'
                          }`}
                        >
                          {'30 ' + t('decisionSupport.decisionSupportDays')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-80">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      {t('decisionSupport.loadingPredictions')}
                    </div>
                  ) : predictions?.predictions && selectedStation && predictions.predictions[selectedStation] ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={predictions.predictions[selectedStation].slice(0, forecastHorizon).map((val: number, i: number) => {
                        const startDate = new Date(selectedDate)
                        const forecastDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
                        return {
                          day: i + 1,
                          salinity: Number(val.toFixed(2)),
                          dateStr: forecastDate.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
                          dateFull: forecastDate.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                          dateObj: forecastDate
                        }
                      })}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="dateStr"
                          label={{ value: t('decisionSupport.decisionSupportDate'), position: 'insideBottom', offset: -5, style: { fill: '#6b7280' } }}
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                          interval={Math.max(0, Math.floor(forecastHorizon / 7) - 1)}
                        />
                        <YAxis 
                          label={{ value: t('decisionSupport.decisionSupportSalinity'), angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                          tick={{ fill: '#6b7280', fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value: number) => `${value.toFixed(2)}‰`}
                          labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0 && payload[0].payload) {
                              const data = payload[0].payload as any
                              return `${data.dateFull} (Day ${data.day})`
                            }
                            return label
                          }}
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                        />
                        <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `${t('decisionSupport.decisionSupportDanger')} (4‰)`, position: 'top', style: { fill: '#ef4444', fontSize: '10px' } }} />
                        <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `${t('decisionSupport.decisionSupportWarning')} (1‰)`, position: 'top', style: { fill: '#f59e0b', fontSize: '10px' } }} />
                        <Line
                          type="monotone"
                          dataKey="salinity"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      {t('decisionSupport.decisionSupportNoForecast')}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Recommended Actions */}
              <Card className="shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Brain className="w-5 h-5" style={{ fill: 'currentColor' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('decisionSupport.decisionSupportRecommendations')}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{t('decisionSupport.decisionSupportBasedOnAI')}</p>
                  </div>
                </div>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {t('decisionSupport.decisionSupportWhySection')}
                  </p>
                </div>
                <div className="space-y-4">
                  {storagePlanning?.optimal_fill_date && (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Drop className="w-5 h-5 text-amber-600" />
                          <span className="text-sm font-bold text-amber-700">{t('decisionSupport.decisionSupportForCoop')}</span>
                        </div>
                        <Badge value={t('decisionSupport.decisionSupportImportant')} severity="warning" />
                      </div>
                      <p className="text-base font-bold mb-1 text-gray-900">
                        {t('decisionSupport.decisionSupportFillReservoir')}: {new Date(storagePlanning.optimal_fill_date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {t('decisionSupport.decisionSupportLastSafeWindow')}
                      </p>
                    </div>
                  )}
                  
                  {storagePlanning?.recommendations && storagePlanning.recommendations.length > 0 && (
                    <>
                      {storagePlanning.recommendations.slice(0, 3).map((rec, recIdx) => {
                        const getPrioritySeverity = (priority: string): 'danger' | 'warning' | 'info' | 'success' => {
                          switch (priority) {
                            case 'urgent':
                              return 'danger'
                            case 'high':
                              return 'warning'
                            case 'medium':
                              return 'info'
                            default:
                              return 'success'
                          }
                        }
                        const getPriorityLabel = (priority: string): string => {
                          switch (priority) {
                            case 'urgent':
                              return t('decisionSupport.decisionSupportUrgent')
                            case 'high':
                              return t('decisionSupport.decisionSupportHigh')
                            case 'medium':
                              return t('decisionSupport.decisionSupportMedium')
                            default:
                              return t('decisionSupport.decisionSupportLow')
                          }
                        }
                        const severity = getPrioritySeverity(rec.priority)
                        const label = getPriorityLabel(rec.priority)
                        return (
                          <div key={recIdx} className={`p-4 rounded-xl border mb-4 ${
                            severity === 'danger' ? 'border-red-300 bg-red-50' :
                            severity === 'warning' ? 'border-orange-300 bg-orange-50' :
                            severity === 'info' ? 'border-amber-300 bg-amber-50' :
                            'border-green-300 bg-green-50'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Warning className={`w-5 h-5 ${
                                  severity === 'danger' ? 'text-red-600' :
                                  severity === 'warning' ? 'text-orange-600' :
                                  severity === 'info' ? 'text-amber-600' :
                                  'text-green-600'
                                }`} />
                                <span className={`text-sm font-bold ${
                                  severity === 'danger' ? 'text-red-700' :
                                  severity === 'warning' ? 'text-orange-700' :
                                  severity === 'info' ? 'text-amber-700' :
                                  'text-green-700'
                                }`}>{rec.message.split(':')[0] || t('decisionSupport.decisionSupportRecommendation')}</span>
                              </div>
                              <Badge value={label} severity={severity} />
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed mb-2">
                              {rec.message}
                            </p>
                            {rec.deadline && (
                              <p className="text-xs text-gray-600">
                                {t('decisionSupport.decisionSupportDeadline')}: {new Date(rec.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                  
                  {!storagePlanning?.optimal_fill_date && (!storagePlanning?.recommendations || storagePlanning.recommendations.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">{t('decisionSupport.decisionSupportNoRecommendations')}</p>
                      <p className="text-xs mt-2">{t('decisionSupport.decisionSupportAutoGenerate')}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Storage Capacity */}
              <Card className="shadow-sm">
                <h3 className="font-bold mb-4 text-gray-900">{t('decisionSupport.storageCapacityEstimator')}</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-600">{t('decisionSupport.currentReservoirLevel')}</span>
                      <span className="text-primary">
                        {storagePlanning?.current_level_percent?.toFixed(0) || 68}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300" 
                        style={{ width: `${storagePlanning?.current_level_percent || 68}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">{t('decisionSupport.daysOfSupplyRemaining')}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-gray-900">
                        {storagePlanning?.days_of_supply || 18}
                      </span>
                      <span className="text-xs text-gray-600 mb-1">{t('decisionSupport.days')}</span>
                    </div>
                    {storagePlanning?.shortfall_date && (
                      <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1">
                        <Warning className="w-3 h-3" />
                        {t('decisionSupport.shortfallExpectedBy')} {new Date(storagePlanning.shortfall_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    {!storagePlanning?.shortfall_date && storagePlanning && (
                      <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {t('decisionSupport.supplySufficient')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}