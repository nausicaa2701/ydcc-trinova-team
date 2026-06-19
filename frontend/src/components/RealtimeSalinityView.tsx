import { useState, useEffect } from 'react'
import { Card } from 'primereact/card'
import { Badge } from 'primereact/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { fetchRealtimeSalinityPrediction, fetchStations, type RealtimePrediction, type Station } from '@/utils/api'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RealtimeSalinityView() {
  const { t } = useLanguage()
  const [prediction, setPrediction] = useState<RealtimePrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

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
    if (!selectedStation) return

    const loadPrediction = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchRealtimeSalinityPrediction(selectedStation)
        if (data) {
          setPrediction(data)
        } else {
          setError(t('realtimeSalinity.realtimeCannotLoad'))
        }
      } catch (err) {
        setError(t('realtimeSalinity.realtimeLoadError'))
        console.error('Error loading realtime prediction:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPrediction()
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadPrediction, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedStation])

  const getRiskLevelInfo = (level: string) => {
    switch (level) {
      case 'danger':
        return {
          label: t('realtimeSalinity.realtimeDanger'),
          color: '#ef4444',
          bgColor: '#fee2e2',
          textColor: '#dc2626',
          icon: '⚠️',
        }
      case 'warning':
        return {
          label: t('realtimeSalinity.realtimeWarning'),
          color: '#f59e0b',
          bgColor: '#fef3c7',
          textColor: '#d97706',
          icon: '⚡',
        }
      case 'watch':
        return {
          label: t('realtimeSalinity.realtimeWatch'),
          color: '#3b82f6',
          bgColor: '#dbeafe',
          textColor: '#2563eb',
          icon: '👁️',
        }
      default:
        return {
          label: t('realtimeSalinity.realtimeSafe'),
          color: '#10b981',
          bgColor: '#d1fae5',
          textColor: '#059669',
          icon: '✅',
        }
    }
  }

  const getSalinityStatus = (salinity: number) => {
    if (salinity >= 4.0) return { label: t('realtimeSalinity.realtimeDanger'), color: '#ef4444' }
    if (salinity >= 1.0) return { label: t('realtimeSalinity.realtimeWarning'), color: '#f59e0b' }
    return { label: t('realtimeSalinity.realtimeSafe'), color: '#10b981' }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })
  }

  if (loading && !prediction) {
    return (
      <div className="flex items-center justify-center h-96 w-full">
        <div className="text-gray-500">{t('realtimeSalinity.realtimeLoading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 w-full">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (!prediction) {
    return (
      <div className="flex items-center justify-center h-96 w-full">
        <div className="text-gray-500">{t('realtimeSalinity.realtimeNoData')}</div>
      </div>
    )
  }

  const riskInfo = getRiskLevelInfo(prediction.summary.risk_level)
  const currentStatus = getSalinityStatus(prediction.current_salinity)

  // Prepare chart data (next 24 hours, showing every 2 hours)
  const chartData = prediction.forecast
    .filter((_, idx) => idx % 4 === 0) // Every 2 hours (4 steps of 30 min)
    .map((point) => ({
      time: formatTime(point.timestamp),
      salinity: Number(point.salinity.toFixed(2)),
    }))

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Station Selector */}
        <Card className="shadow-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('realtimeSalinity.realtimeSelectStation')}
            </label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
              disabled={stations.length === 0}
            >
              {stations.map((station) => (
                <option key={station.station_id} value={station.station_id}>
                  {station.station_name || station.station_id}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Current Status Card */}
        <Card className="shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('realtimeSalinity.realtimeCurrentStatus')}</h2>
              <Badge
                value={riskInfo.label}
                severity={prediction.summary.risk_level === 'danger' ? 'danger' : prediction.summary.risk_level === 'warning' ? 'warning' : 'success'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current Salinity */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">{t('realtimeSalinity.realtimeCurrentSalinity')}</div>
                <div className="text-3xl font-bold" style={{ color: currentStatus.color }}>
                  {prediction.current_salinity.toFixed(2)}‰
                </div>
                <div className="text-xs text-gray-600 mt-1">{currentStatus.label}</div>
              </div>

              {/* Max 6h */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">{t('realtimeSalinity.realtimeMax6h')}</div>
                <div className="text-3xl font-bold" style={{ color: getSalinityStatus(prediction.summary.max_salinity_6h).color }}>
                  {prediction.summary.max_salinity_6h.toFixed(2)}‰
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {getSalinityStatus(prediction.summary.max_salinity_6h).label}
                </div>
              </div>

              {/* Max 24h */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">{t('realtimeSalinity.realtimeMax24h')}</div>
                <div className="text-3xl font-bold" style={{ color: getSalinityStatus(prediction.summary.max_salinity_24h).color }}>
                  {prediction.summary.max_salinity_24h.toFixed(2)}‰
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {getSalinityStatus(prediction.summary.max_salinity_24h).label}
                </div>
              </div>
            </div>

            {/* Critical Warnings */}
            {(prediction.summary.first_crossing_1ppt || prediction.summary.first_crossing_4ppt) && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex items-start">
                  <div className="text-yellow-600 text-xl mr-3">⚠️</div>
                  <div>
                    <div className="font-semibold text-yellow-800 mb-1">{t('realtimeSalinity.realtimeCriticalWarning')}</div>
                    {prediction.summary.first_crossing_4ppt && (
                      <div className="text-sm text-yellow-700">
                        {t('realtimeSalinity.realtimeWillExceedDanger')}{' '}
                        <strong>{formatTime(prediction.summary.first_crossing_4ppt)}</strong>,{' '}
                        <strong>{formatDate(prediction.summary.first_crossing_4ppt)}</strong>
                      </div>
                    )}
                    {prediction.summary.first_crossing_1ppt && !prediction.summary.first_crossing_4ppt && (
                      <div className="text-sm text-yellow-700">
                        {t('realtimeSalinity.realtimeWillExceedWarning')}{' '}
                        <strong>{formatTime(prediction.summary.first_crossing_1ppt)}</strong>,{' '}
                        <strong>{formatDate(prediction.summary.first_crossing_1ppt)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Forecast Chart */}
        <Card className="shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('realtimeSalinity.realtime24hForecast')}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: t('realtimeSalinity.realtimeSalinity') + ' (‰)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}‰`, t('realtimeSalinity.realtimeSalinity')]}
                labelFormatter={(label) => `${t('realtimeSalinity.realtimeTime')}: ${label}`}
              />
              <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: t('realtimeSalinity.realtimeDanger') + ' (4‰)', position: 'top' }} />
              <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: t('realtimeSalinity.realtimeWarning') + ' (1‰)', position: 'top' }} />
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
        </div>
      </Card>

        {/* Simple Recommendations */}
        <Card className="shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('realtimeSalinity.realtimeRecommendations')}</h3>
          <div className="space-y-3">
            {prediction.summary.risk_level === 'danger' && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="font-semibold text-red-800 mb-1">🚨 {t('realtimeSalinity.realtimeImmediateAction')}</div>
                <div className="text-sm text-red-700">
                  {t('realtimeSalinity.realtimeImmediateActionDesc')}
                </div>
              </div>
            )}
            {prediction.summary.risk_level === 'warning' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <div className="font-semibold text-yellow-800 mb-1">⚡ {t('realtimeSalinity.realtimeWarningTitle')}</div>
                <div className="text-sm text-yellow-700">
                  {t('realtimeSalinity.realtimeWarningDesc')}
                </div>
              </div>
            )}
            {prediction.summary.risk_level === 'watch' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <div className="font-semibold text-blue-800 mb-1">👁️ {t('realtimeSalinity.realtimeWatchTitle')}</div>
                <div className="text-sm text-blue-700">
                  {t('realtimeSalinity.realtimeWatchDesc')}
                </div>
              </div>
            )}
            {prediction.summary.risk_level === 'safe' && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <div className="font-semibold text-green-800 mb-1">✅ {t('realtimeSalinity.realtimeSafeTitle')}</div>
                <div className="text-sm text-green-700">
                  {t('realtimeSalinity.realtimeSafeDesc')}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}