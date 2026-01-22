import { useState, useEffect } from 'react'
import { AlertTriangle, Calendar, Shield, CheckCircle, Clock, Droplet, TrendingUp, Brain } from 'lucide-react'
import { fetchRiskMitigation, fetchStations, type RiskMitigation, type Station } from '@/utils/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAppStore } from '@/store/useAppStore'

export default function RiskMitigationView() {
  const { t } = useLanguage()
  const { decisionSupportViewMode, setDecisionSupportViewMode } = useAppStore()
  const [mitigationData, setMitigationData] = useState<RiskMitigation | null>(null)
  const [loading, setLoading] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [horizonDays, setHorizonDays] = useState(30)

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
    const loadMitigationData = async () => {
      setLoading(true)
      try {
        const data = await fetchRiskMitigation(selectedStation, horizonDays)
        if (data) {
          setMitigationData(data)
        }
      } catch (error) {
        console.error('Error loading risk mitigation:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMitigationData()
  }, [selectedStation, horizonDays])

  const stationData = mitigationData?.stations[selectedStation]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: 'text-red-500', badge: 'bg-red-500' }
      case 'high':
        return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: 'text-orange-500', badge: 'bg-orange-500' }
      case 'medium':
        return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-500', badge: 'bg-amber-500' }
      default:
        return { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: 'text-green-500', badge: 'bg-green-500' }
    }
  }

  const getRiskLevel = (score: number) => {
    if (score >= 75) return { level: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10' }
    if (score >= 50) return { level: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10' }
    if (score >= 25) return { level: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/10' }
    return { level: 'Low', color: 'text-green-500', bg: 'bg-green-500/10' }
  }

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
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold hidden lg:block">{t('decisionSupport.riskMitigation')}</span>
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-900 p-8 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-black text-white">Risk Mitigation</h1>
          </div>
          <p className="text-slate-400">Strategic recommendations for risk reduction and operational planning</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-400">Station:</label>
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
            <label className="text-sm font-bold text-slate-400">Forecast Horizon:</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(parseInt(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-bold"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-slate-400">Loading risk mitigation data...</div>
          </div>
        ) : !stationData ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-red-500">Failed to load risk mitigation data</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Risk Status */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Current Risk Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${getRiskLevel(stationData.risk_score).bg}`}>
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Risk Score</div>
                    <div className={`text-4xl font-black mb-1 ${getRiskLevel(stationData.risk_score).color}`}>
                      {stationData.risk_score.toFixed(0)}
                    </div>
                    <div className={`text-sm font-bold ${getRiskLevel(stationData.risk_score).color}`}>
                      {getRiskLevel(stationData.risk_score).level}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/50">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Current Salinity</div>
                    <div className="text-4xl font-black mb-1 text-white">
                      {stationData.current_salinity.toFixed(2)}
                    </div>
                    <div className="text-sm font-bold text-slate-400">‰</div>
                  </div>
                </div>
              </div>

              {/* Harvest Deadline */}
              {stationData.harvest_deadline && stationData.harvest_deadline.deadline_date && (
                <div className={`bg-slate-800 border rounded-xl p-6 ${getPriorityColor(stationData.harvest_deadline.urgency).border}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-6 h-6 ${getPriorityColor(stationData.harvest_deadline.urgency).icon}`} />
                      <h3 className="text-lg font-bold text-white">Harvest Deadline</h3>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded uppercase ${getPriorityColor(stationData.harvest_deadline.urgency).badge} text-white`}>
                      {stationData.harvest_deadline.urgency}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-bold text-slate-400 mb-2">Complete harvest by:</div>
                      <div className="text-3xl font-black text-white mb-2">
                        {new Date(stationData.harvest_deadline.deadline_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {stationData.harvest_deadline.days_until_critical} days until critical salinity threshold
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="text-sm text-slate-300">{stationData.harvest_deadline.message}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Mitigation Recommendations</h3>
                <div className="space-y-4">
                  {stationData.recommendations && stationData.recommendations.length > 0 ? (
                    stationData.recommendations.map((rec, idx) => {
                      const colors = getPriorityColor(rec.priority)
                      const getIcon = () => {
                        switch (rec.category) {
                          case 'harvest':
                            return <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />
                          case 'storage':
                            return <Droplet className={`w-5 h-5 ${colors.icon}`} />
                          case 'planning':
                            return <Calendar className={`w-5 h-5 ${colors.icon}`} />
                          default:
                            return <Shield className={`w-5 h-5 ${colors.icon}`} />
                        }
                      }
                      return (
                        <div
                          key={idx}
                          className={`p-5 rounded-xl border ${colors.border} ${colors.bg}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getIcon()}
                              <div>
                                <h4 className={`text-sm font-bold uppercase ${colors.text}`}>{rec.title}</h4>
                                <div className="text-xs text-slate-500 mt-1">{rec.category}</div>
                              </div>
                            </div>
                            <span className={`text-xs font-black px-2 py-1 rounded uppercase ${colors.badge} text-white`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm text-white mb-3">{rec.message}</p>
                          {rec.deadline && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Clock className="w-4 h-4" />
                              <span>Deadline: {new Date(rec.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <div className="text-sm font-bold">No urgent recommendations at this time</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Safe Operational Window */}
              {stationData.safe_operational_window && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <h4 className="text-sm font-bold text-green-400 uppercase">Safe Operational Window</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Start Date</div>
                      <div className="text-lg font-black text-white">
                        {new Date(stationData.safe_operational_window.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">End Date</div>
                      <div className="text-lg font-black text-white">
                        {new Date(stationData.safe_operational_window.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-green-500/20">
                      <div className="text-xs text-slate-400 mb-1">Duration</div>
                      <div className="text-2xl font-black text-green-500">
                        {stationData.safe_operational_window.duration_days} days
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                    <div className="text-xs text-slate-300">
                      Ideal time for sowing and other agricultural operations
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Timeline */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Risk Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Current</span>
                    <span className={`text-sm font-bold ${getRiskLevel(stationData.risk_score).color}`}>
                      {stationData.risk_score.toFixed(0)}/100
                    </span>
                  </div>
                  {stationData.harvest_deadline && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Critical Threshold</span>
                      <span className="text-sm font-bold text-red-500">
                        {stationData.harvest_deadline.days_until_critical} days
                      </span>
                    </div>
                  )}
                  {stationData.safe_operational_window && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Safe Window</span>
                      <span className="text-sm font-bold text-green-500">
                        {stationData.safe_operational_window.duration_days} days
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all">
                    Export Report
                  </button>
                  <button className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600 transition-all">
                    Set Alert
                  </button>
                  <button className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600 transition-all">
                    Share Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
