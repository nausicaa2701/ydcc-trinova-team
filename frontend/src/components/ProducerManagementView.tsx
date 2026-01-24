import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { mockFarms, mockCooperatives } from '@/data/mockFarms'
import { MagnifyingGlass, CheckCircle, Warning, WarningCircle, Funnel, MapPin, User, Users, RadioButton } from '@phosphor-icons/react'
import MapView from './MapView'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ProducerManagementView() {
  const { t } = useLanguage()
  const { selectedFarm, setSelectedFarm, selectedRiskLevel, setSelectedRiskLevel } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCoop, setSelectedCoop] = useState<string | null>(null)

  // Filter farms
  let filteredFarms = mockFarms
  if (searchQuery) {
    filteredFarms = filteredFarms.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cooperativeName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }
  if (selectedCoop) {
    filteredFarms = filteredFarms.filter(f => f.cooperativeId === selectedCoop)
  }
  if (selectedRiskLevel) {
    filteredFarms = filteredFarms.filter(f => f.riskLevel === selectedRiskLevel)
  }

  const getRiskBadge = (level: string | undefined) => {
    switch (level) {
      case 'critical':
        return { bg: 'bg-rose-500', text: 'text-white', label: 'Critical', icon: WarningCircle }
      case 'high':
        return { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Warning', icon: Warning }
      case 'medium':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'Warning', icon: Warning }
      default:
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'Safe', icon: CheckCircle }
    }
  }

  const getProductionIcon = (model: string) => {
    switch (model) {
      case 'shrimp':
        return '🌊'
      case 'rice':
        return '🌾'
      case 'rice-shrimp':
        return '🌊🌾'
      case 'fruit':
        return '🍊'
      default:
        return '🌱'
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[400px] flex flex-col border-r border-slate-700 bg-slate-900 shrink-0">
        <div className="p-4 border-b border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{t('producerManagement.title')}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{t('producerManagement.province')}</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
              {mockFarms.length} {t('producerManagement.registered')}
            </span>
          </div>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              className="w-full rounded-lg border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder={t('producerManagement.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRiskLevel(selectedRiskLevel === 'low' ? null : 'low')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                selectedRiskLevel === 'low'
                  ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                  : 'bg-slate-800 text-white hover:bg-slate-700 border-transparent'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              {t('producerManagement.safe')}
            </button>
            <button
              onClick={() => setSelectedRiskLevel(selectedRiskLevel === 'medium' ? null : 'medium')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                selectedRiskLevel === 'medium'
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                  : 'bg-slate-800 text-white hover:bg-slate-700 border-transparent'
              }`}
            >
              <Warning className="w-4 h-4 text-amber-500" />
              {t('producerManagement.warning')}
            </button>
            <button
              onClick={() => setSelectedRiskLevel(selectedRiskLevel === 'critical' ? null : 'critical')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                selectedRiskLevel === 'critical'
                  ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                  : 'bg-slate-800 text-white hover:bg-slate-700 border-transparent'
              }`}
            >
              <WarningCircle className="w-4 h-4 text-rose-500" />
              {t('producerManagement.critical')}
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 text-xs font-medium">
              <Funnel className="w-4 h-4" />
              TP. Hồ Chí Minh
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Cooperative filter dropdown */}
          <div className="mb-4">
            <select
              value={selectedCoop || ''}
              onChange={(e) => setSelectedCoop(e.target.value || null)}
              className="w-full rounded-lg border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">{t('producerManagement.allCooperatives')}</option>
              {mockCooperatives.map(coop => (
                <option key={coop.id} value={coop.id}>{coop.name}</option>
              ))}
            </select>
          </div>
          
          {filteredFarms.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">{t('producerManagement.noFarmsFound')}</p>
            </div>
          ) : (
            filteredFarms.slice(0, 20).map((farm) => {
            const riskBadge = getRiskBadge(farm.riskLevel)
            return (
              <div
                key={farm.id}
                onClick={() => setSelectedFarm(farm)}
                className={`group cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/50 active:scale-[0.98] ${
                  selectedFarm?.id === farm.id
                    ? 'border-primary bg-primary/10'
                    : farm.riskLevel === 'critical'
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-slate-700 bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {farm.cooperativeId.startsWith('htx') ? (
                        <Users className="w-4 h-4 text-amber-400" />
                      ) : (
                        <User className="w-4 h-4 text-rose-400" />
                      )}
                      <h3 className="font-bold text-white">{farm.name}</h3>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {farm.cooperativeName}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${riskBadge.bg} ${riskBadge.text}`}>
                    {riskBadge.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-500">{t('producerManagement.productionModel')}</p>
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <span>{getProductionIcon(farm.productionModel)}</span>
                      {farm.productionModel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500">{farm.cooperativeId.startsWith('htx') ? t('producerManagement.members') : t('producerManagement.totalArea')}</p>
                    <p className="font-medium text-slate-200">
                      {farm.cooperativeId.startsWith('htx')
                        ? `${mockFarms.filter(f => f.cooperativeId === farm.cooperativeId).length} ${t('producerManagement.households')}`
                        : `${farm.area} ${t('producerManagement.hectares')}`}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-400">{t('producerManagement.riskScore')}</span>
                    <span className={`text-xs font-bold ${riskBadge.text}`}>
                      {farm.currentRiskScore || 0}/100
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${riskBadge.bg.replace('/20', '').replace('/5', '')}`}
                      style={{ width: `${farm.currentRiskScore || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          }))}
        </div>
        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={() => {
              // TODO: Implement broadcast alert functionality
              alert(t('producerManagement.broadcastAlertToRegion') + ' - Feature coming soon')
            }}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <RadioButton className="w-5 h-5" />
            {t('producerManagement.broadcastAlertToRegion')}
          </button>
        </div>
      </aside>

      {/* Map Section */}
      <section className="flex-1 relative bg-[#0b0c0e]">
        <div className="w-full h-full">
          <MapView />
        </div>
        {selectedFarm && (
          <div className="absolute bottom-6 left-6 right-[400px] flex gap-4 pointer-events-none z-10">
            <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl rounded-xl border-l-4 border-rose-500 p-5 shadow-2xl flex-1 max-w-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{t('producerManagement.mitigationRecommendation')}</h2>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    {t('producerManagement.aiAnalysis')} {selectedFarm.cooperativeName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFarm(null)}
                  className="text-slate-500 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20 mb-4">
                <p className="text-sm text-slate-200 leading-relaxed">
                  <span className="font-bold text-rose-400">{t('producerManagement.actionRequired')}</span> {t('producerManagement.predictedSalinityPeak', { hours: '48' })} {' '}
                  <span className="font-mono">{(selectedFarm.currentRiskScore || 0) / 5} ppt</span>.
                  {t('producerManagement.immediateGateClosure')}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    // TODO: Implement view details functionality
                    console.log('View details for farm:', selectedFarm.id)
                  }}
                  className="flex-1 rounded-lg bg-slate-800 border border-slate-700 py-2 text-xs font-bold text-white hover:bg-slate-700 transition-all"
                >
                  {t('producerManagement.viewDetails')}
                </button>
                <button 
                  onClick={() => {
                    // TODO: Implement notify producer functionality
                    alert(t('producerManagement.notifyProducer') + ' - Feature coming soon')
                  }}
                  className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all"
                >
                  {t('producerManagement.notifyProducer')}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

