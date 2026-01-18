import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useAppStore } from '@/store/useAppStore'
import { fetchBoundariesForDate, fetchRiskSurfaceForDate, fetchSalinityPrediction, TIEN_GIANG_STATIONS, getTiengiangStationCoords } from '@/utils/api'
import { mockFarms } from '@/data/mockFarms'
import { Plus, Minus, Navigation, Layers, Play, Pause, TrendingUp, Droplet, Brain, Download } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
if (mapboxToken && mapboxToken !== 'your_mapbox_token_here' && mapboxToken.startsWith('pk.')) {
  mapboxgl.accessToken = mapboxToken
}

export default function SalinityMapView() {
  const { t } = useLanguage()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [forecastHorizon, setForecastHorizon] = useState(7) // 1-30 days
  const [predictions, setPredictions] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const {
    selectedDate,
    setSelectedDate,
    showBoundaries,
    showRiskHeatmap,
    showFarms,
    selectedFarm,
    setSelectedFarm,
  } = useAppStore()

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    if (!mapboxToken || mapboxToken === 'your_mapbox_token_here' || !mapboxToken.startsWith('pk.')) {
      setMapError(t('map.mapboxTokenMissing'))
      return
    }

    try {
      // Tiền Giang center: [106.3, 10.35]
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [106.3, 10.35], // Tiền Giang center
        zoom: 10, // Closer zoom for Tiền Giang
        maxBounds: [
          [105.5, 10.0], // Southwest
          [107.0, 10.7], // Northeast
        ] as [[number, number], [number, number]],
      })

      map.current.on('load', () => {
        setMapLoaded(true)
        setMapError(null)
      })

      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e)
        setMapError(t('map.failedToLoadMap'))
        setMapLoaded(false)
      })
    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('Failed to initialize map.')
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update boundaries and layers from API
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const currentMap = map.current
    if (!currentMap) return

    const loadBoundaries = async () => {
      try {
        const boundaries = await fetchBoundariesForDate(selectedDate)
        
        if (!Array.isArray(boundaries)) return
    
        // Remove existing sources
        const sourceIds = ['salt-boundaries-1', 'salt-boundaries-4', 'farms', 'risk-heatmap', 'tiengiang-stations']
        sourceIds.forEach(sourceId => {
          if (currentMap.getSource(sourceId)) {
            const layers = ['fill', 'line', 'circles'].map(type => `${sourceId}-${type}`)
            layers.forEach(layerId => {
              if (currentMap.getLayer(layerId)) {
                currentMap.removeLayer(layerId)
              }
            })
            currentMap.removeSource(sourceId)
          }
        })

        // Add Tiền Giang stations
        const stationsGeoJSON = {
          type: 'FeatureCollection' as const,
          features: TIEN_GIANG_STATIONS.map(station => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [station.lon, station.lat] },
            properties: {
              station_id: station.station_id,
              station_name: station.station_name,
              distance_to_sea_km: station.distance_to_sea_km,
            },
          })),
        }

        currentMap.addSource('tiengiang-stations', {
          type: 'geojson',
          data: stationsGeoJSON,
        })

        currentMap.addLayer({
          id: 'tiengiang-stations-circles',
          type: 'circle',
          source: 'tiengiang-stations',
          paint: {
            'circle-radius': 6,
            'circle-color': '#1392ec',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8,
          },
        })

        // Add station labels
        currentMap.addLayer({
          id: 'tiengiang-stations-labels',
          type: 'symbol',
          source: 'tiengiang-stations',
          layout: {
            'text-field': ['get', 'station_name'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-size': 11,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2,
          },
        })

        if (showBoundaries && currentMap) {
          const boundary1 = boundaries.find(b => b.salinity === 1)
          if (boundary1) {
            currentMap.addSource('salt-boundaries-1', {
              type: 'geojson',
              data: { type: 'Feature', geometry: boundary1.geometry, properties: { salinity: 1 } },
            })
            currentMap.addLayer({
              id: 'salt-boundaries-1-fill',
              type: 'fill',
              source: 'salt-boundaries-1',
              paint: { 'fill-color': '#00f2ff', 'fill-opacity': 0.2 },
            })
            currentMap.addLayer({
              id: 'salt-boundaries-1-line',
              type: 'line',
              source: 'salt-boundaries-1',
              paint: { 'line-color': '#00f2ff', 'line-width': 2, 'line-dasharray': [2, 2] },
            })
          }

          const boundary4 = boundaries.find(b => b.salinity === 4)
          if (boundary4) {
            currentMap.addSource('salt-boundaries-4', {
              type: 'geojson',
              data: { type: 'Feature', geometry: boundary4.geometry, properties: { salinity: 4 } },
            })
            currentMap.addLayer({
              id: 'salt-boundaries-4-fill',
              type: 'fill',
              source: 'salt-boundaries-4',
              paint: { 'fill-color': '#ff4d4d', 'fill-opacity': 0.3 },
            })
            currentMap.addLayer({
              id: 'salt-boundaries-4-line',
              type: 'line',
              source: 'salt-boundaries-4',
              paint: { 'line-color': '#ff4d4d', 'line-width': 2 },
            })
          }
        }

        if (showFarms && currentMap) {
          const farmsGeoJSON = {
            type: 'FeatureCollection' as const,
            features: mockFarms.map(farm => ({
              type: 'Feature' as const,
              geometry: farm.location,
              properties: {
                id: farm.id,
                name: farm.name,
                cooperativeId: farm.cooperativeId,
                riskScore: farm.currentRiskScore || 0,
                riskLevel: farm.riskLevel,
              },
            })),
          }

          currentMap.addSource('farms', {
            type: 'geojson',
            data: farmsGeoJSON,
          })

          currentMap.addLayer({
            id: 'farms-fill',
            type: 'fill',
            source: 'farms',
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'riskLevel'], 'critical'], '#dc2626',
                ['==', ['get', 'riskLevel'], 'high'], '#ea580c',
                ['==', ['get', 'riskLevel'], 'medium'], '#eab308',
                '#22c55e',
              ],
              'fill-opacity': 0.5,
            },
          })

          currentMap.on('click', 'farms-fill', (e) => {
            if (e.features && e.features[0]) {
              const props = e.features[0].properties
              const farm = mockFarms.find(f => f.id === props.id)
              if (farm && map.current) {
                setSelectedFarm(farm)
                const coordinates = e.lngLat
                map.current.flyTo({ center: [coordinates.lng, coordinates.lat], zoom: 12 })
              }
            }
          })
        }

        if (showRiskHeatmap && currentMap) {
          const riskSurface = await fetchRiskSurfaceForDate(selectedDate)
          if (riskSurface) {
            const heatmapData = {
              type: 'FeatureCollection' as const,
              features: riskSurface.riskScores.map(point => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: point.coordinates },
                properties: { riskScore: point.riskScore },
              })),
            }

            currentMap.addSource('risk-heatmap', { type: 'geojson', data: heatmapData })
            currentMap.addLayer({
              id: 'risk-heatmap-circles',
              type: 'circle',
              source: 'risk-heatmap',
              paint: {
                'circle-radius': 8,
                'circle-color': [
                  'interpolate', ['linear'], ['get', 'riskScore'],
                  0, '#22c55e', 25, '#eab308', 50, '#ea580c', 75, '#dc2626',
                ],
                'circle-opacity': 0.6,
              },
            })
          }
        }
      } catch (error) {
        console.error('Error loading map data:', error)
      }
    }

    loadBoundaries()
  }, [selectedDate, showBoundaries, showRiskHeatmap, showFarms, mapLoaded, setSelectedFarm, forecastHorizon])

  const handleZoom = (direction: 'in' | 'out') => {
    if (map.current) {
      const zoom = map.current.getZoom()
      map.current.zoomTo(direction === 'in' ? zoom + 1 : zoom - 1, { duration: 300 })
    }
  }

  const handleLocate = () => {
    if (map.current) {
      map.current.flyTo({ center: [106.3, 10.35], zoom: 10 }) // Tiền Giang center
    }
  }

  // Fetch predictions from API
  useEffect(() => {
    const loadPredictions = async () => {
      setLoading(true)
      try {
        const pred = await fetchSalinityPrediction(forecastHorizon)
        if (pred) {
          setPredictions(pred)
          
          // Update boundaries from API
          if (pred.boundaries && pred.boundaries.features) {
            // Boundaries will be handled in the boundaries update effect
          }
        }
      } catch (error) {
        console.error('Error loading predictions:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadPredictions()
  }, [forecastHorizon])

  const today = new Date()
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const selectedDateObj = new Date(selectedDate)
  const daysFromToday = Math.floor((selectedDateObj.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

  // Calculate statistics from predictions
  const avgRiskScore = predictions?.risk_scores 
    ? Object.values(predictions.risk_scores).reduce((a: number, b: number) => a + b, 0) / Object.keys(predictions.risk_scores).length
    : 0
  
  const avgSalinity = predictions?.predictions
    ? Object.values(predictions.predictions).flat().reduce((a: number, b: number) => a + b, 0) / 
      (Object.values(predictions.predictions).flat().length || 1)
    : 0
  
  const highRiskStations = predictions?.risk_scores
    ? Object.values(predictions.risk_scores).filter((score: number) => score >= 50).length
    : 0

  return (
    <div className="flex flex-1 overflow-hidden relative">
      <div className="flex-1 relative bg-[#0a0f14] overflow-hidden">
        {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 max-w-md mx-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-white">{t('map.mapError')}</h3>
            </div>
            <p className="text-gray-300 mb-4">{mapError}</p>
            <div className="text-sm text-gray-400 bg-slate-900 p-3 rounded">
              <p className="font-medium mb-2 text-white">{t('map.toFixThis')}</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open <code className="bg-slate-800 px-1 rounded">frontend/.env</code></li>
                <li>Ensure: <code className="bg-slate-800 px-1 rounded">VITE_MAPBOX_TOKEN=pk.eyJ...</code></li>
                <li>Get token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mapbox</a></li>
                <li><strong>Restart dev server</strong></li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Map Controls */}
          <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
            <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700 flex flex-col shadow-xl">
              <button onClick={() => handleZoom('in')} className="w-10 h-10 flex items-center justify-center hover:bg-primary/20 text-white rounded-md transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <div className="h-px bg-slate-700 mx-2"></div>
              <button onClick={() => handleZoom('out')} className="w-10 h-10 flex items-center justify-center hover:bg-primary/20 text-white rounded-md transition-colors">
                <Minus className="w-5 h-5" />
              </button>
            </div>
            <button onClick={handleLocate} className="w-10 h-10 bg-slate-900/90 backdrop-blur-md flex items-center justify-center hover:bg-primary/20 text-white rounded-lg border border-slate-700 shadow-xl">
              <Navigation className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-slate-900/90 backdrop-blur-md flex items-center justify-center hover:bg-primary/20 text-white rounded-lg border border-slate-700 shadow-xl">
              <Layers className="w-5 h-5" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-32 right-6 w-48 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl z-10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t('map.salinity')}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-[#ff4d4d]"></div>
                <span className="text-sm font-medium text-white">{t('map.criticalThreshold')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-[#ff9f4d]"></div>
                <span className="text-sm font-medium text-white">{t('map.highThreshold')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-[#00f2ff]"></div>
                <span className="text-sm font-medium text-white">{t('map.moderateThreshold')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm bg-[#0bda5b]"></div>
                <span className="text-sm font-medium text-white">{t('map.lowThreshold')}</span>
              </div>
            </div>
          </div>

          {/* Time Slider */}
          <div className="absolute bottom-6 left-6 right-6 h-20 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl px-6 flex items-center gap-6 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary uppercase">{t('map.current')}</span>
                <span className="text-sm font-medium text-white">
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="flex-1 relative flex flex-col justify-center">
              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-primary/40" style={{ width: `${((daysFromToday + 30) / 60) * 100}%` }}></div>
                <input
                  type="range"
                  min="-48"
                  max="30"
                  value={daysFromToday}
                  onChange={(e) => {
                    const newDate = new Date(today)
                    newDate.setDate(today.getDate() + Number(e.target.value))
                    setSelectedDate(newDate.toISOString().split('T')[0])
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{ left: `${((daysFromToday + 48) / 78) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                <span>{t('map.past48h')}</span>
                <span>-24h</span>
                <span className="text-primary font-bold">{t('map.now')}</span>
                <span>+24h</span>
                <span>+48h</span>
                <span className="text-primary/70">{t('map.aiForecast', { days: '7D' })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => setForecastHorizon(7)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    forecastHorizon === 7 ? 'bg-primary text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  7D
                </button>
                <button 
                  onClick={() => setForecastHorizon(14)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    forecastHorizon === 14 ? 'bg-primary text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  14D
                </button>
                <button 
                  onClick={() => setForecastHorizon(30)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    forecastHorizon === 30 ? 'bg-primary text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  30D
                </button>
              </div>
              {loading && (
                <div className="text-[10px] text-primary font-bold uppercase">{t('map.loading')}</div>
              )}
            </div>
          </div>
        </>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-96 bg-slate-900 border-l border-slate-700 overflow-y-auto p-5 space-y-6 flex flex-col shrink-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">{t('map.regionalAnalysis')}</h3>
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] font-bold uppercase">{t('map.highRisk')}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 rounded-xl p-4 border border-slate-700 bg-slate-800">
              <p className="text-slate-400 text-xs font-medium uppercase">{t('map.avgRiskScore')}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{Math.round(avgRiskScore)}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <p className={`text-xs font-bold flex items-center gap-1 ${
                avgRiskScore >= 75 ? 'text-red-500' : avgRiskScore >= 50 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                <TrendingUp className="w-3 h-3" />
                {highRiskStations} {t('map.stationsAtRisk')}
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-4 border border-slate-700 bg-slate-800">
              <p className="text-slate-400 text-xs font-medium uppercase">{t('map.avgSalinity')}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{avgSalinity.toFixed(1)}</span>
                <span className="text-xs text-slate-400">‰</span>
              </div>
              <p className={`text-xs font-bold flex items-center gap-1 ${
                avgSalinity >= 4 ? 'text-red-500' : avgSalinity >= 1 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                <TrendingUp className="w-3 h-3" />
                {avgSalinity >= 4 ? t('map.critical') : avgSalinity >= 1 ? t('map.moderate') : t('map.low')}
              </p>
            </div>
          </div>
          
          {/* Tiền Giang Stations */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('map.tiengiangStations')}</h4>
            <div className="space-y-2">
              {TIEN_GIANG_STATIONS.map(station => {
                const stationPred = predictions?.predictions?.[station.station_id]
                const stationRisk = predictions?.risk_scores?.[station.station_id] || 0
                const currentSalinity = stationPred?.[0] || 0
                
                return (
                  <div key={station.station_id} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{station.station_name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        stationRisk >= 75 ? 'bg-red-500/20 text-red-500' :
                        stationRisk >= 50 ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-green-500/20 text-green-500'
                      }`}>
                        {Math.round(stationRisk)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{station.distance_to_sea_km}{t('map.kmFromSea')}</span>
                      <span className="text-white font-bold">{currentSalinity.toFixed(1)} ‰</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('map.hydrologicalStatus')}</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-3">
                <Droplet className="w-5 h-5 text-primary" />
                <span className="text-sm text-white">{t('map.waterLevelTide')}</span>
              </div>
              <span className="font-bold text-white">+1.24m</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm text-white">{t('map.riverFlowSpeed')}</span>
              </div>
              <span className="font-bold text-white">0.85 m/s</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-primary/10 border border-primary/30 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Brain className="w-5 h-5" />
            <h4 className="text-sm font-bold uppercase tracking-wider">{t('map.aiForecast', { days: forecastHorizon })}</h4>
          </div>
          {predictions?.predictions ? (
            <div className="h-28 flex items-end justify-between gap-1 px-2">
              {Object.values(predictions.predictions)[0]?.slice(0, Math.min(forecastHorizon, 7)).map((salinity: number, i: number) => {
                const height = Math.min((salinity / 10) * 100, 100)
                return (
                  <div
                    key={i}
                    className="w-full bg-primary rounded-t-sm transition-all"
                    style={{ height: `${height}%` }}
                    title={`Day ${i + 1}: ${salinity.toFixed(1)} ‰`}
                  />
                )
              })}
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center text-slate-400 text-sm">
              {loading ? t('map.loadingPredictions') : t('map.noPredictionsAvailable')}
            </div>
          )}
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{t('map.today')}</span>
            <span>+{forecastHorizon}D</span>
          </div>
          <div className="p-3 bg-black/40 rounded-lg">
            <p className="text-xs text-white/80 leading-relaxed">
              <span className="font-bold text-primary">{t('map.forecastInsight')}</span> Salt wedge expected to advance{' '}
              <span className="text-white font-bold">12km upstream</span> by Thu. Recommend closing sluice gates in Ben Tre.
            </p>
          </div>
        </div>

        <button className="w-full py-3 rounded-lg bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors mt-auto">
          <Download className="w-5 h-5" />
          {t('map.exportRegionalReport')}
        </button>
      </aside>
    </div>
  )
}

