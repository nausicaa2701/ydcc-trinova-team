import { useState, useEffect } from 'react'
import { TrendUp, TrendDown, Minus, Brain, Drop, Warning } from '@phosphor-icons/react'
import { fetchTrendAnalysis, fetchStations, type TrendAnalysis, type Station } from '@/utils/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAppStore } from '@/store/useAppStore'
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from 'recharts'

type ViewMode = 'daily' | 'seasonal'

export default function TrendAnalysisView() {
  const { t } = useLanguage()
  const { decisionSupportViewMode, setDecisionSupportViewMode } = useAppStore()
  const [trendData, setTrendData] = useState<TrendAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [analysisDays, setAnalysisDays] = useState(30)

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

  useEffect(() => {
    const loadTrendData = async () => {
      setLoading(true)
      try {
        const data = await fetchTrendAnalysis(selectedStation, analysisDays)
        if (data) {
          setTrendData(data)
        }
      } catch (error) {
        console.error('Error loading trend analysis:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTrendData()
  }, [selectedStation, analysisDays])

  const stationTrend = trendData?.trends[selectedStation]
  const trend = stationTrend?.trend
  const seasonal = stationTrend?.seasonal
  const forecast = stationTrend?.forecast
  const comparison = stationTrend?.comparison

  // Prepare chart data
  const chartData = forecast?.forecast_values.map((value, idx) => ({
    day: idx + 1,
    forecast: value,
    upper: forecast.confidence_upper[idx],
    lower: forecast.confidence_lower[idx],
  })) || []

  // Seasonal chart data
  const seasonalChartData = seasonal?.monthly_average 
    ? Object.entries(seasonal.monthly_average).map(([month, avg]) => ({
        month: parseInt(month),
        monthName: new Date(2000, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' }),
        average: avg,
      }))
    : []

  const getTrendIcon = () => {
    if (!trend) return <Minus className="w-5 h-5" />
    if (trend.trend_direction === 'increasing') {
      return <TrendUp className="w-5 h-5 text-red-500" />
    } else if (trend.trend_direction === 'decreasing') {
      return <TrendDown className="w-5 h-5 text-green-500" />
    }
    return <Minus className="w-5 h-5 text-slate-400" />
  }

  const getTrendColor = () => {
    if (!trend) return 'text-slate-400'
    if (trend.trend_direction === 'increasing') return 'text-red-500'
    if (trend.trend_direction === 'decreasing') return 'text-green-500'
    return 'text-slate-400'
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-slate-700 bg-slate-900 flex flex-col hidden sm:flex">
        <nav className="flex-1 px-4 space-y-2 mt-8">
          <p className="hidden lg:block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-4">
            {t('decisionSupport.aiTools')}
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
            <TrendUp className="w-5 h-5" />
            <span className="text-sm font-bold hidden lg:block">{t('decisionSupport.trendAnalysis')}</span>
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
            <Drop className="w-5 h-5" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.storagePlanning')}</span>
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
            <Warning className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.riskMitigation')}</span>
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-900 p-8 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <TrendUp className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-black text-white">{t('decisionSupport.trendAnalysis')}</h1>
          </div>
          <p className="text-slate-400">{t('decisionSupport.trendAnalysisDescription')}</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-400">{t('decisionSupport.station')}:</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold"
              disabled={stations.length === 0}
            >
              {stations.map((station) => (
                <option key={station.station_id} value={station.station_id}>
                  {station.station_name || station.station_id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-400">{t('decisionSupport.period')}:</label>
            <select
              value={analysisDays}
              onChange={(e) => setAnalysisDays(parseInt(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold"
            >
              <option value={7}>{t('decisionSupport.days7')}</option>
              <option value={30}>{t('decisionSupport.days30')}</option>
              <option value={90}>{t('decisionSupport.days90')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                viewMode === 'daily'
                  ? 'bg-primary text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {t('decisionSupport.dailyOutlook')}
            </button>
            <button
              onClick={() => setViewMode('seasonal')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                viewMode === 'seasonal'
                  ? 'bg-primary text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {t('decisionSupport.seasonal')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-slate-400">{t('decisionSupport.loadingTrendAnalysis')}</div>
          </div>
        ) : !trendData ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-red-500">{t('decisionSupport.failedToLoadTrendData')}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">
                {viewMode === 'daily' ? t('decisionSupport.forecastTrend') : t('decisionSupport.seasonalPattern')}
              </h3>
              {viewMode === 'daily' ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.1}
                      strokeDasharray="5 5"
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke="#1392ec"
                      fill="#1392ec"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.1}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={seasonalChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="monthName" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    />
                    <Bar dataKey="average" fill="#1392ec" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Stats Cards */}
            <div className="space-y-6">
              {/* Trend Direction */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase">Trend Direction</h4>
                  {getTrendIcon()}
                </div>
                <div className={`text-3xl font-black mb-2 ${getTrendColor()}`}>
                  {trend?.trend_direction.toUpperCase() || 'N/A'}
                </div>
                <div className="text-xs text-slate-500">
                  Slope: {trend?.slope.toFixed(4) || '0'} per day
                </div>
                <div className="text-xs text-slate-500">
                  Strength: {(trend?.trend_strength || 0) * 100}%
                </div>
              </div>

              {/* Period Comparison */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Period Comparison</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Change</span>
                      <span className={`font-bold ${comparison?.is_worse ? 'text-red-500' : 'text-green-500'}`}>
                        {comparison?.change_percent ? `${comparison.change_percent > 0 ? '+' : ''}${comparison.change_percent.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${comparison?.is_worse ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, Math.abs(comparison?.change_percent || 0))}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Change: {comparison?.change_absolute?.toFixed(2) || '0'}‰ ({comparison?.change_percent?.toFixed(1) || '0'}%)
                  </div>
                </div>
              </div>

              {/* Seasonal Info */}
              {seasonal && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">{t('decisionSupport.seasonalPattern')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">{t('decisionSupport.peakMonth')}</span>
                      <span className="text-sm font-bold text-red-500">
                        {seasonal.peak_month ? new Date(2000, seasonal.peak_month - 1).toLocaleDateString('en-US', { month: 'long' }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">{t('decisionSupport.lowMonth')}</span>
                      <span className="text-sm font-bold text-green-500">
                        {seasonal.low_month ? new Date(2000, seasonal.low_month - 1).toLocaleDateString('en-US', { month: 'long' }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">{t('decisionSupport.range')}</span>
                      <span className="text-sm font-bold text-white">
                        {seasonal.seasonal_range?.toFixed(2) || '0'}‰
                      </span>
                    </div>
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
