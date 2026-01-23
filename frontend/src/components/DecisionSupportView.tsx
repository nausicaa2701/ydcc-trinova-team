import { useAppStore } from '@/store/useAppStore'
import { Brain, TrendUp, Drop, Calendar, Download, Warning, CheckCircle } from '@phosphor-icons/react'
import { 
  fetchSalinityPrediction, 
  fetchStations,
  fetchTrendAnalysis,
  fetchStoragePlanning,
  fetchRiskMitigation,
  type TrendAnalysis,
  type StoragePlanning,
  type RiskMitigation,
  type Station
} from '@/utils/api'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import TrendAnalysisView from './TrendAnalysisView'
import StoragePlanningView from './StoragePlanningView'
import RiskMitigationView from './RiskMitigationView'

type ViewMode = 'overview' | 'trend' | 'storage' | 'mitigation'

export default function DecisionSupportView() {
  const { t } = useLanguage()
  const selectedDate = useAppStore((s) => s.selectedDate)
  const viewMode: ViewMode = useAppStore((s) => s.decisionSupportViewMode)
  const setDecisionSupportViewMode = useAppStore((s) => s.setDecisionSupportViewMode)
  const [predictions, setPredictions] = useState<any>(null)
  const [, setTrendAnalysis] = useState<TrendAnalysis | null>(null)
  const [storagePlanning, setStoragePlanning] = useState<StoragePlanning | null>(null)
  const [riskMitigation, setRiskMitigation] = useState<RiskMitigation | null>(null)
  const [loading, setLoading] = useState(false)
  const [stations, setStations] = useState<Station[]>([])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [stationsList, pred, trend, storage, mitigation] = await Promise.all([
          fetchStations(),
          fetchSalinityPrediction(30),
          fetchTrendAnalysis(undefined, 30),
          fetchStoragePlanning(undefined, 68.0, 1000.0, 50000.0, 30),
          fetchRiskMitigation(undefined, 30)
        ])
        
        setStations(stationsList)
        if (pred) setPredictions(pred)
        if (trend) setTrendAnalysis(trend)
        if (storage) setStoragePlanning(storage)
        if (mitigation) setRiskMitigation(mitigation)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedDate])

  // Render different views based on viewMode
  if (viewMode === 'trend') {
    return <TrendAnalysisView />
  }
  if (viewMode === 'storage') {
    return <StoragePlanningView />
  }
  if (viewMode === 'mitigation') {
    return <RiskMitigationView />
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
              viewMode === 'overview'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            <Brain className="w-5 h-5" style={viewMode === 'overview' ? { fill: 'currentColor' } : {}} />
            <span className="text-sm font-bold hidden lg:block">{t('decisionSupport.recommendationEngine')}</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('trend')
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left text-slate-500 hover:bg-slate-800"
          >
            <TrendUp className="w-5 h-5" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.trendAnalysis')}</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDecisionSupportViewMode('storage')
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left text-slate-500 hover:bg-slate-800"
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left text-slate-500 hover:bg-slate-800"
          >
            <Warning className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium hidden lg:block">{t('decisionSupport.riskMitigation')}</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-primary">{t('decisionSupport.aiStatus')}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-tight hidden lg:block">
              {t('decisionSupport.processingLiveSensorFeed', { count: stations.length.toString() || '0' })}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-900">
        <div className="p-8 max-w-[1400px] mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase border border-blue-500/30">
                  {t('decisionSupport.decisionSupportMode')}
                </span>
              </div>
              <h2 className="text-4xl font-black tracking-tight text-white mb-2">
                {t('decisionSupport.agriculturalRecommendations')}
              </h2>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('decisionSupport.sync')} {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t('decisionSupport.aiConfidence')} {predictions?.confidence ? Math.round(predictions.confidence * 100) : 85}%
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                <Download className="w-5 h-5" />
                {t('decisionSupport.exportInsights')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Salinity Trend Chart */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      {t('decisionSupport.salinityTrendAnalysis')}
                      <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </h3>
                    <p className="text-xs text-slate-400">{t('decisionSupport.comparisonDescription')}</p>
                  </div>
                  <div className="flex p-1 bg-slate-700 rounded-lg">
                    <button className="px-3 py-1.5 text-xs font-bold rounded-md bg-slate-900 text-white shadow-sm">{t('decisionSupport.dayOutlook')}</button>
                    <button className="px-3 py-1.5 text-xs font-bold rounded-md text-slate-500">{t('decisionSupport.seasonal')}</button>
                  </div>
                </div>
                <div className="h-[400px] w-full relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between opacity-50">
                    <div className="border-t border-slate-700 w-full h-px flex items-center">
                      <span className="text-[10px] -ml-6 text-slate-400">8.0</span>
                    </div>
                    <div className="border-t border-slate-700 w-full h-px flex items-center">
                      <span className="text-[10px] -ml-6 text-slate-400">6.0</span>
                    </div>
                    <div className="border-t border-red-500/20 w-full h-px flex items-center relative">
                      <span className="text-[10px] -ml-6 text-slate-400">4.0</span>
                      <span className="ml-4 text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-1">{t('decisionSupport.criticalThreshold')}</span>
                    </div>
                    <div className="border-t border-slate-700 w-full h-px flex items-center">
                      <span className="text-[10px] -ml-6 text-slate-400">2.0</span>
                    </div>
                    <div className="border-t border-slate-700 w-full h-px flex items-center">
                      <span className="text-[10px] -ml-6 text-slate-400">0.0</span>
                    </div>
                  </div>
                  {/* Chart SVG with predictions data */}
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      {t('decisionSupport.loadingPredictions')}
                    </div>
                  ) : predictions?.predictions ? (
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      {/* Predicted line (dashed) - average across stations */}
                      {(() => {
                        const avgPred = Object.values(predictions.predictions)[0] as number[]
                        if (!avgPred || avgPred.length === 0) return null
                        const maxSalinity = Math.max(...avgPred, 8)
                        const points = avgPred.slice(0, 7).map((val, i) => {
                          const x = (i / 6) * 100
                          const y = 100 - (val / maxSalinity) * 100
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                        }).join(' ')
                        return <path d={points} fill="none" stroke="#9dadb9" strokeDasharray="1" strokeWidth="0.5" />
                      })()}
                      {/* Actual line (solid) - placeholder for now */}
                      <path d="M0,82 Q10,77 20,80 T40,68 T60,55" fill="none" stroke="#1392ec" strokeWidth="1" />
                      <path d="M0,82 Q10,77 20,80 T40,68 T60,55 L60,100 L0,100 Z" fill="#1392ec" fillOpacity="0.05" />
                      <circle cx="60" cy="55" fill="#1392ec" r="1.5" />
                      <line stroke="#1392ec" strokeDasharray="0.5" strokeWidth="0.2" x1="60" x2="60" y1="55" y2="100" />
                    </svg>
                  ) : (
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M0,80 Q10,75 20,78 T40,65 T60,50 T80,30 T100,15" fill="none" stroke="#9dadb9" strokeDasharray="1" strokeWidth="0.5" />
                      <path d="M0,82 Q10,77 20,80 T40,68 T60,55" fill="none" stroke="#1392ec" strokeWidth="1" />
                      <path d="M0,82 Q10,77 20,80 T40,68 T60,55 L60,100 L0,100 Z" fill="#1392ec" fillOpacity="0.05" />
                      <circle cx="60" cy="55" fill="#1392ec" r="1.5" />
                      <line stroke="#1392ec" strokeDasharray="0.5" strokeWidth="0.2" x1="60" x2="60" y1="55" y2="100" />
                    </svg>
                  )}
                  {/* Tooltip */}
                  {predictions?.predictions && (() => {
                    const avgPred = Object.values(predictions.predictions)[0] as number[]
                    const currentSalinity = avgPred?.[0] || 0
                    return (
                      <div className="absolute top-[45%] left-[62%] bg-slate-800 p-3 rounded-xl shadow-2xl border border-slate-700 z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{t('decisionSupport.predicted')} ({new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</p>
                        <p className="text-xl font-black text-primary">{currentSalinity.toFixed(1)} {t('decisionSupport.ppt')}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${
                            currentSalinity >= 4 ? 'bg-red-500' : currentSalinity >= 1 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></span>
                          <p className={`text-[10px] font-bold ${
                            currentSalinity >= 4 ? 'text-red-500' : currentSalinity >= 1 ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                            {currentSalinity >= 4 ? t('decisionSupport.criticalThresholdExceeded') : currentSalinity >= 1 ? t('decisionSupport.moderateRisk') : t('decisionSupport.lowRisk')}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                  {!predictions && (
                    <div className="absolute top-[45%] left-[62%] bg-slate-800 p-3 rounded-xl shadow-2xl border border-slate-700 z-10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('decisionSupport.actual')} ({new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</p>
                      <p className="text-xl font-black text-primary">3.2 {t('decisionSupport.ppt')}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        <p className="text-[10px] text-green-500 font-bold">{t('decisionSupport.inLineWithAIModel')}</p>
                      </div>
                    </div>
                  )}
                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Mar 01</span>
                    <span>Mar 08</span>
                    <span className="text-primary font-black">Mar 15 (Now)</span>
                    <span>Mar 22</span>
                    <span>Mar 29</span>
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-white">{t('decisionSupport.predictedVsActual')}</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                      <span className="h-2 w-2 rounded-full bg-primary"></span> {t('decisionSupport.actual')}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                      <span className="h-2 w-2 rounded-full bg-slate-400 border border-dashed"></span> {t('decisionSupport.predicted')}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900">
                        <th className="px-6 py-4">{t('decisionSupport.station')}</th>
                        <th className="px-6 py-4">{t('decisionSupport.actual')}</th>
                        <th className="px-6 py-4">{t('decisionSupport.predicted')}</th>
                        <th className="px-6 py-4">{t('decisionSupport.variance')}</th>
                        <th className="px-6 py-4 text-right">{t('decisionSupport.actionReq')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      <tr className="hover:bg-slate-900 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-white">Tran De (Soc Trang)</td>
                        <td className="px-6 py-4 text-sm font-black text-white">5.4 ppt</td>
                        <td className="px-6 py-4 text-sm text-slate-500">5.6 ppt</td>
                        <td className="px-6 py-4 text-sm text-green-500 font-bold">-0.2</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-black uppercase">{t('decisionSupport.immediate')}</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-900 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm text-white">Cau Quan (Tra Vinh)</td>
                        <td className="px-6 py-4 text-sm font-black text-white">2.1 {t('decisionSupport.ppt')}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">2.0 {t('decisionSupport.ppt')}</td>
                        <td className="px-6 py-4 text-sm text-red-500 font-bold">+0.1</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 rounded bg-amber-500 text-white text-[10px] font-black uppercase">{t('decisionSupport.plan')}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Recommended Actions */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Brain className="w-5 h-5" style={{ fill: 'currentColor' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{t('decisionSupport.recommendedActions')}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('decisionSupport.aiGeneratedInsights')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {riskMitigation?.stations && Object.values(riskMitigation.stations).map((station, idx) => {
                    const harvestDeadline = station.harvest_deadline
                    const safeWindow = station.safe_operational_window
                    
                    return (
                      <div key={idx}>
                        {harvestDeadline?.deadline_date && (
                          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Warning className="w-5 h-5 text-red-500" />
                                <span className="text-xs font-bold uppercase tracking-tight text-red-400">{t('decisionSupport.harvestDeadline')}</span>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                harvestDeadline.urgency === 'urgent' ? 'bg-red-500 text-white' :
                                harvestDeadline.urgency === 'high' ? 'bg-orange-500 text-white' :
                                'bg-yellow-500 text-white'
                              }`}>{t('decisionSupport.urgent')}</span>
                            </div>
                            <p className="text-sm font-bold mb-1 text-white">
                              {t('decisionSupport.completeBy')} {new Date(harvestDeadline.deadline_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {harvestDeadline.message}
                            </p>
                          </div>
                        )}
                        
                        {storagePlanning?.optimal_fill_date && (
                          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Drop className="w-5 h-5 text-amber-500" />
                                <span className="text-xs font-bold uppercase tracking-tight text-amber-400">{t('decisionSupport.storagePlanning')}</span>
                              </div>
                              <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase">{t('decisionSupport.active')}</span>
                            </div>
                            <p className="text-sm font-bold mb-1 text-white">
                              {t('decisionSupport.fillReservoirsBy')} {new Date(storagePlanning.optimal_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {t('decisionSupport.lastSafeWindow')}
                            </p>
                          </div>
                        )}
                        
                        {safeWindow && (
                          <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 mb-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-green-500" />
                                <span className="text-xs font-bold uppercase tracking-tight text-green-400">{t('decisionSupport.optimalSowing')}</span>
                              </div>
                              <span className="text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded uppercase">{t('decisionSupport.nextSeason')}</span>
                            </div>
                            <p className="text-sm font-bold mb-1 text-white">
                              {new Date(safeWindow.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(safeWindow.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {t('decisionSupport.window')}
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {t('decisionSupport.aiRainStartPredictions')}
                            </p>
                          </div>
                        )}
                        
                        {station.recommendations.slice(0, 3).map((rec, recIdx) => {
                          const getPriorityClasses = (priority: string) => {
                            switch (priority) {
                              case 'urgent':
                                return {
                                  border: 'border-red-500/20 bg-red-500/5',
                                  icon: 'text-red-500',
                                  text: 'text-red-400',
                                  badge: 'bg-red-500 text-white'
                                }
                              case 'high':
                                return {
                                  border: 'border-orange-500/20 bg-orange-500/5',
                                  icon: 'text-orange-500',
                                  text: 'text-orange-400',
                                  badge: 'bg-orange-500 text-white'
                                }
                              case 'medium':
                                return {
                                  border: 'border-amber-500/20 bg-amber-500/5',
                                  icon: 'text-amber-500',
                                  text: 'text-amber-400',
                                  badge: 'bg-amber-500 text-white'
                                }
                              default:
                                return {
                                  border: 'border-green-500/20 bg-green-500/5',
                                  icon: 'text-green-500',
                                  text: 'text-green-400',
                                  badge: 'bg-green-500 text-white'
                                }
                            }
                          }
                          const classes = getPriorityClasses(rec.priority)
                          return (
                            <div key={recIdx} className={`p-4 rounded-xl border ${classes.border} mb-4`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Warning className={`w-5 h-5 ${classes.icon}`} />
                                  <span className={`text-xs font-bold uppercase tracking-tight ${classes.text}`}>{rec.title}</span>
                                </div>
                                <span className={`text-[10px] font-black ${classes.badge} px-2 py-0.5 rounded uppercase`}>{rec.priority}</span>
                              </div>
                              <p className="text-sm font-bold mb-1 text-white">
                                {rec.deadline ? `${t('decisionSupport.completeBy')} ${new Date(rec.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : rec.title}
                              </p>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                {rec.message}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  
                  {(!riskMitigation || Object.keys(riskMitigation.stations).length === 0) && (
                    <>
                      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Warning className="w-5 h-5 text-red-500" />
                            <span className="text-xs font-bold uppercase tracking-tight text-red-400">{t('decisionSupport.harvestDeadline')}</span>
                          </div>
                          <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded uppercase">{t('decisionSupport.urgent')}</span>
                        </div>
                        <p className="text-sm font-bold mb-1 text-white">{t('decisionSupport.completeBy')} April 10</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t('decisionSupport.salinityProjected')}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Drop className="w-5 h-5 text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-tight text-amber-400">{t('decisionSupport.storagePlanning')}</span>
                          </div>
                          <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase">{t('decisionSupport.active')}</span>
                        </div>
                        <p className="text-sm font-bold mb-1 text-white">{t('decisionSupport.fillReservoirsBy')} March 20</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t('decisionSupport.lastSafeWindow')}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-500" />
                            <span className="text-xs font-bold uppercase tracking-tight text-green-400">{t('decisionSupport.optimalSowing')}</span>
                          </div>
                          <span className="text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded uppercase">{t('decisionSupport.nextSeason')}</span>
                        </div>
                        <p className="text-sm font-bold mb-1 text-white">May 12 - May 18 {t('decisionSupport.window')}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t('decisionSupport.aiRainStartPredictions')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <button className="mt-6 w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('decisionSupport.addCustomMitigationPlan')}
                </button>
              </div>

              {/* Storage Capacity */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold mb-4 text-white">{t('decisionSupport.storageCapacityEstimator')}</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-400">{t('decisionSupport.currentReservoirLevel')}</span>
                      <span className="text-primary">
                        {storagePlanning?.current_level_percent?.toFixed(0) || 68}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300" 
                        style={{ width: `${storagePlanning?.current_level_percent || 68}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{t('decisionSupport.daysOfSupplyRemaining')}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-white">
                        {storagePlanning?.days_of_supply || 18}
                      </span>
                      <span className="text-xs text-slate-500 mb-1">{t('decisionSupport.days')}</span>
                    </div>
                    {storagePlanning?.shortfall_date && (
                      <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1">
                        <Warning className="w-3 h-3" />
                        {t('decisionSupport.shortfallExpectedBy')} {new Date(storagePlanning.shortfall_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    {!storagePlanning?.shortfall_date && storagePlanning && (
                      <p className="text-[10px] text-green-500 font-bold mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {t('decisionSupport.supplySufficient')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

