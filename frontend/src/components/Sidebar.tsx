import { useAppStore } from '@/store/useAppStore'
import { mockFarms, mockCooperatives, getCooperativeById } from '@/data/mockFarms'
import { ProductionModel, RiskLevel } from '@/types'
import { X, Filter, TrendingUp, MapPin, Users } from 'lucide-react'

export default function Sidebar() {
  const {
    selectedDate,
    setSelectedDate,
    selectedCooperative,
    setSelectedCooperative,
    selectedProductionModel,
    setSelectedProductionModel,
    selectedRiskLevel,
    setSelectedRiskLevel,
    showBoundaries,
    setShowBoundaries,
    showRiskHeatmap,
    setShowRiskHeatmap,
    showFarms,
    setShowFarms,
    selectedFarm,
    setSelectedFarm,
  } = useAppStore()

  const selectedCoopData = selectedCooperative ? getCooperativeById(selectedCooperative) : null
  const coopFarms = selectedCooperative ? mockFarms.filter(f => f.cooperativeId === selectedCooperative) : []

  // Calculate filtered farms
  let filteredFarms = mockFarms
  if (selectedCooperative) {
    filteredFarms = filteredFarms.filter(f => f.cooperativeId === selectedCooperative)
  }
  if (selectedProductionModel) {
    filteredFarms = filteredFarms.filter(f => f.productionModel === selectedProductionModel)
  }
  if (selectedRiskLevel) {
    filteredFarms = filteredFarms.filter(f => f.riskLevel === selectedRiskLevel)
  }

  // Calculate statistics
  const totalFarms = filteredFarms.length
  const totalArea = filteredFarms.reduce((sum, f) => sum + f.area, 0)
  const avgRisk = filteredFarms.length > 0
    ? Math.round(filteredFarms.reduce((sum, f) => sum + (f.currentRiskScore || 0), 0) / filteredFarms.length)
    : 0
  const highRiskFarms = filteredFarms.filter(f => (f.currentRiskScore || 0) >= 50).length

  const getRiskColor = (risk: number) => {
    if (risk >= 75) return 'text-red-600 bg-red-50'
    if (risk >= 50) return 'text-orange-600 bg-orange-50'
    if (risk >= 25) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Controls</h2>
        
        {/* Date Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Forecast Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min={new Date().toISOString().split('T')[0]}
            max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          />
        </div>

        {/* Layer Toggles */}
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBoundaries}
              onChange={(e) => setShowBoundaries(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Show Salt Boundaries</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRiskHeatmap}
              onChange={(e) => setShowRiskHeatmap(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Show Risk Heatmap</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFarms}
              onChange={(e) => setShowFarms(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Show Farms</span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </h3>
        
        {/* Cooperative Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Cooperative
          </label>
          <select
            value={selectedCooperative || ''}
            onChange={(e) => setSelectedCooperative(e.target.value || null)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Cooperatives</option>
            {mockCooperatives.map(coop => (
              <option key={coop.id} value={coop.id}>{coop.name}</option>
            ))}
          </select>
        </div>

        {/* Production Model Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Production Model
          </label>
          <select
            value={selectedProductionModel || ''}
            onChange={(e) => setSelectedProductionModel(e.target.value as ProductionModel || null)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Models</option>
            <option value="rice">Rice</option>
            <option value="shrimp">Shrimp</option>
            <option value="rice-shrimp">Rice-Shrimp</option>
            <option value="fruit">Fruit</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Risk Level Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Risk Level
          </label>
          <select
            value={selectedRiskLevel || ''}
            onChange={(e) => setSelectedRiskLevel(e.target.value as RiskLevel || null)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Statistics
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Farms:</span>
            <span className="font-medium">{totalFarms}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Area:</span>
            <span className="font-medium">{totalArea.toFixed(1)} ha</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Avg Risk Score:</span>
            <span className={`font-medium ${getRiskColor(avgRisk).split(' ')[0]}`}>
              {avgRisk}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">High Risk Farms:</span>
            <span className="font-medium text-orange-600">{highRiskFarms}</span>
          </div>
        </div>
      </div>

      {/* Selected Cooperative Info */}
      {selectedCoopData && (
        <div className="p-4 border-b border-gray-200 bg-indigo-50">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              HTX Selected
            </h3>
            <button
              onClick={() => setSelectedCooperative(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{selectedCoopData.name}</p>
            <p className="text-gray-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {selectedCoopData.location}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Total Farms</p>
                <p className="font-semibold text-gray-900">{selectedCoopData.totalFarms}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Area</p>
                <p className="font-semibold text-gray-900">{selectedCoopData.totalArea} ha</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Risk Score</p>
                <p className={`font-semibold ${getRiskColor(selectedCoopData.averageRiskScore || 0).split(' ')[0]}`}>
                  {selectedCoopData.averageRiskScore || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Affected Farms</p>
                <p className="font-semibold text-orange-600">{selectedCoopData.affectedFarms || 0}</p>
              </div>
            </div>
            {coopFarms.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Households ({coopFarms.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {coopFarms.slice(0, 10).map(farm => (
                    <div
                      key={farm.id}
                      onClick={() => {
                        setSelectedFarm(farm)
                        setSelectedCooperative(null)
                      }}
                      className="p-1.5 rounded bg-white hover:bg-gray-50 cursor-pointer border border-gray-200"
                    >
                      <p className="text-xs font-medium text-gray-900">{farm.name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-gray-500">{farm.area} ha</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getRiskColor(farm.currentRiskScore || 0)}`}>
                          {farm.currentRiskScore || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                  {coopFarms.length > 10 && (
                    <p className="text-xs text-gray-400 text-center mt-1">
                      +{coopFarms.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Farm Info */}
      {selectedFarm && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Selected Farm</h3>
            <button
              onClick={() => setSelectedFarm(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-gray-900">{selectedFarm.name}</p>
            <p className="text-gray-600">{selectedFarm.cooperativeName}</p>
            <p className="text-gray-600">Area: {selectedFarm.area} ha</p>
            <p className="text-gray-600">Model: {selectedFarm.productionModel}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-600">Risk:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(selectedFarm.currentRiskScore || 0)}`}>
                {selectedFarm.currentRiskScore || 0} - {selectedFarm.riskLevel?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Farm List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Farms ({filteredFarms.length})
        </h3>
        <div className="space-y-2">
          {filteredFarms.slice(0, 50).map(farm => (
            <div
              key={farm.id}
              onClick={() => setSelectedFarm(farm)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                selectedFarm?.id === farm.id
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{farm.name}</p>
                  <p className="text-xs text-gray-600">{farm.cooperativeName}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRiskColor(farm.currentRiskScore || 0)}`}>
                  {farm.currentRiskScore || 0}
                </span>
              </div>
            </div>
          ))}
          {filteredFarms.length > 50 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Showing first 50 of {filteredFarms.length} farms
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

