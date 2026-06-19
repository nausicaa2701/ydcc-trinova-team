import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useAppStore } from '@/store/useAppStore'
import { 
  fetchBoundariesForDate, 
  fetchRiskSurfaceForDate, 
  fetchSalinityPrediction, 
  fetchStations, 
  fetchLatestSalinityData,
  type Station, 
  type SalinityPrediction,
  type SalinityStationData
} from '@/utils/api'
import { mockFarms, mockCooperatives, getCooperativeById } from '@/data/mockFarms'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/utils/apiClient'
import { fetchCooperatives } from '@/utils/api'
import { Plus, Minus, Compass, Stack, TrendUp, Download, X, Users, MapPin, WarningCircle, List } from '@phosphor-icons/react'
import { useLanguage } from '@/contexts/LanguageContext'

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
if (mapboxToken && mapboxToken !== 'your_mapbox_token_here' && mapboxToken.startsWith('pk.')) {
  mapboxgl.accessToken = mapboxToken
}

export default function SalinityMapView() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [forecastHorizon, setForecastHorizon] = useState(7) // 1-30 days
  const [predictions, setPredictions] = useState<SalinityPrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooperativeData, setCooperativeData] = useState<any>(null)
  const [cooperatives, setCooperatives] = useState<any[]>([])
  const [salinityStationData, setSalinityStationData] = useState<SalinityStationData[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile sidebar toggle
  
  const {
    selectedDate,
    showBoundaries,
    showRiskHeatmap,
    showFarms,
    selectedFarm,
    setSelectedFarm,
    selectedCooperative,
    setSelectedCooperative,
  } = useAppStore()

  // Calculate map center and bounds based on user role
  const getMapConfig = () => {
    // Default: TPHCM center (for SYSTEM_ADMIN or no user)
    let center: [number, number] = [106.7, 10.8]
    let zoom = 10
    let bounds: [[number, number], [number, number]] = [
      [106.3, 10.3], // Southwest
      [107.2, 11.2], // Northeast
    ]

    if (!user) {
      return { center, zoom, bounds }
    }

    if (user.role === 'COOP_ADMIN' && user.coop_id) {
      // Focus on cooperative location
      if (cooperativeData) {
        center = [cooperativeData.center_lon, cooperativeData.center_lat]
        zoom = 12 // Closer zoom for HTX
        // Smaller bounds around HTX
        const latOffset = 0.05
        const lonOffset = 0.05
        bounds = [
          [center[0] - lonOffset, center[1] - latOffset],
          [center[0] + lonOffset, center[1] + latOffset],
        ]
      } else {
        // Try to get from mock data
        const coop = getCooperativeById(user.coop_id)
        if (coop) {
          // Extract coordinates from location string or use district coords
          const districtCoords: Record<string, [number, number]> = {
            'Quận 9': [106.8099, 10.8422],
            'Thủ Đức': [106.7637, 10.8497],
            'Bình Chánh': [106.6067, 10.6994],
            'Quận 8': [106.629, 10.74],
            'Củ Chi': [106.4967, 11.1572],
            'Cần Giờ': [106.9547, 10.4114],
            'Quận 12': [106.6544, 10.8639],
          }
          const district = coop.location.split(',')[0].trim()
          const coords = districtCoords[district] || [106.7, 10.8]
          center = [coords[0], coords[1]]
          zoom = 12
          const latOffset = 0.05
          const lonOffset = 0.05
          bounds = [
            [center[0] - lonOffset, center[1] - latOffset],
            [center[0] + lonOffset, center[1] + latOffset],
          ]
        }
      }
    } else if (user.role === 'FARMER' && user.coop_id) {
      // Focus on farmer's farm location
      const userFarms = mockFarms.filter(f => f.cooperativeId === user.coop_id)
      if (userFarms.length > 0) {
        // Use first farm's center
        const farm = userFarms[0]
        const coords = farm.location.coordinates[0][0]
        center = [coords[0], coords[1]]
        zoom = 13 // Very close zoom for individual farm
        const latOffset = 0.02
        const lonOffset = 0.02
        bounds = [
          [center[0] - lonOffset, center[1] - latOffset],
          [center[0] + lonOffset, center[1] + latOffset],
        ]
      }
    }

    return { center, zoom, bounds }
  }

  // Fetch cooperatives for SYSTEM_ADMIN
  useEffect(() => {
    if (user?.role === 'SYSTEM_ADMIN') {
      const loadCooperatives = async () => {
        try {
          const data = await fetchCooperatives()
          setCooperatives(data)
        } catch (error) {
          console.error('Error fetching cooperatives:', error)
          // Fallback to mock data if API fails
          setCooperatives(mockCooperatives)
        }
      }
      loadCooperatives()
    } else {
      // Clear cooperatives if not SYSTEM_ADMIN
      setCooperatives([])
    }
  }, [user])

  // Fetch stations
  useEffect(() => {
    const loadStations = async () => {
      try {
        const stationsList = await fetchStations()
        setStations(stationsList)
      } catch (error) {
        console.error('Error fetching stations:', error)
      }
    }
    loadStations()
  }, [])

  // Fetch latest salinity station data from PDF extraction
  useEffect(() => {
    const loadSalinityData = async () => {
      try {
        const data = await fetchLatestSalinityData(false)
        
        // Filter to get only the latest data for each station (by station_name)
        // Group by station_name and keep the one with the latest extraction_timestamp or forecast_date
        const stationMap = new Map<string, SalinityStationData>()
        
        data.forEach(station => {
          const stationName = station.station_name || 'unknown'
          const existing = stationMap.get(stationName)
          
          if (!existing) {
            stationMap.set(stationName, station)
          } else {
            // Compare timestamps to get the latest
            const existingTime = existing.extraction_timestamp || existing.forecast_date || ''
            const currentTime = station.extraction_timestamp || station.forecast_date || ''
            
            if (currentTime > existingTime) {
              stationMap.set(stationName, station)
            }
          }
        })
        
        // Convert map back to array (only latest data for each station)
        const latestData = Array.from(stationMap.values())
        setSalinityStationData(latestData)
      } catch (error) {
        console.error('Error fetching salinity station data:', error)
      }
    }
    loadSalinityData()
  }, [])

  // Fetch cooperative data for COOP_ADMIN
  useEffect(() => {
    if (user?.role === 'COOP_ADMIN' && user.coop_id) {
      const fetchCoopData = async () => {
        try {
          const response = await apiRequest(`/coops/${user.coop_id}`)
          if (response.ok) {
            const data = await response.json()
            setCooperativeData(data)
            // Update map view when cooperative data is loaded
            if (map.current && mapLoaded) {
              const mapConfig = getMapConfig()
              map.current.flyTo({
                center: mapConfig.center,
                zoom: mapConfig.zoom,
              })
              map.current.setMaxBounds(mapConfig.bounds)
            }
          }
        } catch (error) {
          console.error('Error fetching cooperative data:', error)
        }
      }
      fetchCoopData()
    }
  }, [user, mapLoaded])

  // Update map view when user or cooperative data changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      const mapConfig = getMapConfig()
      map.current.flyTo({
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        duration: 1000,
      })
      map.current.setMaxBounds(mapConfig.bounds)
    }
  }, [user, cooperativeData, mapLoaded])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    if (!mapboxToken || mapboxToken === 'your_mapbox_token_here' || !mapboxToken.startsWith('pk.')) {
      setMapError(t('map.mapboxTokenMissing'))
      return
    }

    try {
      const mapConfig = getMapConfig()
      // TP. Hồ Chí Minh center: [106.7, 10.8] (default)
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        maxBounds: mapConfig.bounds,
      })

      map.current.on('load', () => {
        setMapLoaded(true)
        setMapError(null)
        // Update map view based on role after load
        const mapConfig = getMapConfig()
        if (map.current) {
          map.current.flyTo({
            center: mapConfig.center,
            zoom: mapConfig.zoom,
          })
          map.current.setMaxBounds(mapConfig.bounds)
        }
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
    if (!currentMap || !currentMap.isStyleLoaded()) return

    const loadBoundaries = async () => {
      try {
        // ALWAYS remove risk-heatmap first to prevent duplicate source errors
        try {
          if (currentMap.getLayer('risk-heatmap-circles')) {
            currentMap.removeLayer('risk-heatmap-circles')
          }
          if (currentMap.getSource('risk-heatmap')) {
            currentMap.removeSource('risk-heatmap')
          }
        } catch (err) {
          // Ignore errors if source/layer doesn't exist
        }
        
        const boundaries = await fetchBoundariesForDate(selectedDate)
        
        if (!Array.isArray(boundaries)) return
    
        // Remove existing station layers and source FIRST (before other sources)
        // Must remove layers before removing the source they depend on
        try {
          if (currentMap.getLayer('monitoring-stations-labels')) {
            currentMap.removeLayer('monitoring-stations-labels')
          }
          if (currentMap.getLayer('monitoring-stations-circles')) {
            currentMap.removeLayer('monitoring-stations-circles')
          }
          if (currentMap.getSource('monitoring-stations')) {
            currentMap.removeSource('monitoring-stations')
          }
        } catch (err) {
          // Ignore errors if layers/source don't exist
          console.warn('Error removing station layers:', err)
        }

        // Remove existing sources (excluding stations and risk-heatmap which we already handled)
        const sourceIds = ['salt-boundaries-1', 'salt-boundaries-4', 'farms']
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

        // Add stations
        if (stations.length > 0) {
          const stationsGeoJSON = {
            type: 'FeatureCollection' as const,
            features: stations.map(station => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [station.lon, station.lat] },
              properties: {
                station_id: station.station_id,
                station_name: station.station_name || station.station_id,
                distance_to_sea_km: station.distance_to_sea_km,
              },
            })),
          }

          try {
            currentMap.addSource('monitoring-stations', {
              type: 'geojson',
              data: stationsGeoJSON,
            })

            // Add station circles layer
            currentMap.addLayer({
              id: 'monitoring-stations-circles',
              type: 'circle',
              source: 'monitoring-stations',
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
              id: 'monitoring-stations-labels',
              type: 'symbol',
              source: 'monitoring-stations',
              layout: {
                'text-field': ['get', 'station_name'],
                'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
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
          } catch (err) {
            console.error('Error adding station source/layers:', err)
          }
        }

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
            e.preventDefault()
            if (e.features && e.features[0] && e.features[0].properties) {
              const props = e.features[0].properties
              console.log('Clicked farm:', props)
              const farm = mockFarms.find(f => f.id === props?.id)
              if (farm && map.current) {
                console.log('Setting selected farm:', farm.id)
                setSelectedFarm(farm)
                setSelectedCooperative(null) // Clear cooperative selection when farm is selected
                const coordinates = e.lngLat
                map.current.flyTo({ center: [coordinates.lng, coordinates.lat], zoom: 12 })
              }
            }
          })
        }

        // Add cooperative markers (only for SYSTEM_ADMIN)
        if (user?.role === 'SYSTEM_ADMIN' && currentMap && currentMap.isStyleLoaded() && cooperatives.length > 0) {
          // Remove existing cooperative source if it exists
          try {
            if (currentMap.getLayer('cooperatives-labels')) {
              currentMap.removeLayer('cooperatives-labels')
            }
            if (currentMap.getLayer('cooperatives-circles')) {
              currentMap.removeLayer('cooperatives-circles')
            }
            if (currentMap.getSource('cooperatives')) {
              currentMap.removeSource('cooperatives')
            }
          } catch (err) {
            // Ignore errors if layer/source doesn't exist
            console.warn('Error removing cooperative layers:', err)
          }

          const cooperativesGeoJSON = {
            type: 'FeatureCollection' as const,
            features: cooperatives.map(coop => {
              // Use center_lat and center_lon from API, or fallback to district coords
              let coords: [number, number] = [coop.center_lon || 106.7, coop.center_lat || 10.8]
              
              // If no coordinates in API, try to extract from address or location
              if (!coop.center_lat || !coop.center_lon) {
                const DISTRICT_COORDS: Record<string, [number, number]> = {
                  'Quận 9': [106.8099, 10.8422],
                  'Thủ Đức': [106.7637, 10.8497],
                  'Bình Chánh': [106.6067, 10.6994],
                  'Quận 8': [106.629, 10.74],
                  'Củ Chi': [106.4967, 11.1572],
                  'Cần Giờ': [106.9547, 10.4114],
                  'Quận 12': [106.6544, 10.8639],
                }
                const location = coop.address || coop.province || ''
                const district = location.split(',')[0].trim()
                coords = DISTRICT_COORDS[district] || [106.7, 10.8]
              }
              
              return {
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: coords,
                },
                properties: {
                  id: coop.id,
                  name: coop.name,
                  location: coop.address || coop.province || '',
                  totalFarms: coop.totalFarms || 0,
                  totalArea: coop.totalArea || 0,
                  averageRiskScore: coop.averageRiskScore || 0,
                  affectedFarms: coop.affectedFarms || 0,
                },
              }
            }),
          }

          try {
            currentMap.addSource('cooperatives', {
              type: 'geojson',
              data: cooperativesGeoJSON,
            })

            // Add cooperative circles
            currentMap.addLayer({
              id: 'cooperatives-circles',
              type: 'circle',
              source: 'cooperatives',
              paint: {
                'circle-radius': 10,
                'circle-color': '#3b82f6',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8,
              },
            })
          } catch (err) {
            console.error('Error adding cooperative source/layer:', err)
            return // Exit early if we can't add the source
          }

          // Add cooperative labels
          try {
            currentMap.addLayer({
              id: 'cooperatives-labels',
              type: 'symbol',
              source: 'cooperatives',
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
                'text-offset': [0, 2.5],
                'text-anchor': 'top',
                'text-size': 11,
                'text-max-width': 15,
              },
              paint: {
                'text-color': '#1e40af',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
              },
            })
          } catch (err) {
            console.warn('Error adding cooperative labels layer:', err)
          }

          // Remove existing event handlers to avoid duplicates
          currentMap.off('click', 'cooperatives-circles' as any)
          currentMap.off('mouseenter', 'cooperatives-circles' as any)
          currentMap.off('mouseleave', 'cooperatives-circles' as any)

          // Add click handler for cooperatives
          currentMap.on('click', 'cooperatives-circles', (e) => {
            if (e.features && e.features[0] && e.features[0].properties) {
              const props = e.features[0].properties
              console.log('Clicked cooperative:', props)
              // Try to find in cooperatives from API first, then fallback to mock
              const coop = cooperatives.find(c => c.id === props?.id) || getCooperativeById(props?.id)
              if (coop && map.current) {
                console.log('Setting selected cooperative:', coop.id)
                setSelectedCooperative(coop.id)
                setSelectedFarm(null) // Clear farm selection when cooperative is selected
                const coordinates = e.lngLat
                map.current.flyTo({ center: [coordinates.lng, coordinates.lat], zoom: 12 })
              }
            }
          })

          // Change cursor on hover
          currentMap.on('mouseenter', 'cooperatives-circles', () => {
            if (currentMap) {
              currentMap.getCanvas().style.cursor = 'pointer'
            }
          })
          currentMap.on('mouseleave', 'cooperatives-circles', () => {
            if (currentMap) {
              currentMap.getCanvas().style.cursor = ''
            }
          })
        }

        // Handle risk-heatmap (already removed at the start, so just add if needed)
        if (showRiskHeatmap && currentMap) {
          const riskSurface = await fetchRiskSurfaceForDate(selectedDate)
          if (riskSurface && riskSurface.riskScores && riskSurface.riskScores.length > 0) {
            const heatmapData = {
              type: 'FeatureCollection' as const,
              features: riskSurface.riskScores.map(point => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: point.coordinates },
                properties: { riskScore: point.riskScore },
              })),
            }

            // Double-check source doesn't exist before adding
            if (!currentMap.getSource('risk-heatmap')) {
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
            } else {
              // Update existing source data instead
              const source = currentMap.getSource('risk-heatmap') as mapboxgl.GeoJSONSource
              if (source && source.setData) {
                source.setData(heatmapData)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading map data:', error)
      }
    }

    loadBoundaries()
  }, [selectedDate, showBoundaries, showRiskHeatmap, showFarms, mapLoaded, setSelectedFarm, setSelectedCooperative, forecastHorizon, stations, user, cooperatives])

  const handleZoom = (direction: 'in' | 'out') => {
    if (map.current) {
      const zoom = map.current.getZoom()
      map.current.zoomTo(direction === 'in' ? zoom + 1 : zoom - 1, { duration: 300 })
    }
  }

  const handleLocate = () => {
    if (map.current) {
      const mapConfig = getMapConfig()
      map.current.flyTo({ center: mapConfig.center, zoom: mapConfig.zoom })
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

  // Calculate statistics from predictions or real data
  const avgRiskScore = predictions?.risk_scores 
    ? Math.round(Object.values(predictions.risk_scores).reduce((a: number, b: number) => a + b, 0) / Object.keys(predictions.risk_scores).length)
    : salinityStationData.length > 0
    ? Math.round(salinityStationData.reduce((sum, s) => {
        // Use smax_observed or smax_forecast to estimate risk
        const salinity = s.smax_observed || s.smax_forecast || 0
        const risk = salinity >= 4 ? 75 : salinity >= 1 ? 50 : 25
        return sum + risk
      }, 0) / salinityStationData.length)
    : 0
  
  const avgSalinity = predictions?.predictions
    ? Object.values(predictions.predictions).reduce((sum: number[], pred: number[]) => {
        return sum.map((s, i) => s + (pred[i] || 0))
      }, Array(7).fill(0)).map(s => s / Object.keys(predictions.predictions).length)[0] || 0
    : salinityStationData.length > 0
    ? salinityStationData.reduce((sum, s) => {
        const salinity = s.smax_observed || s.smax_forecast || s.salinity || 0
        return sum + salinity
      }, 0) / salinityStationData.length
    : 0
  
  const highRiskStations = predictions?.risk_scores
    ? Object.values(predictions.risk_scores).filter((score: number) => score >= 50).length
    : salinityStationData.filter(s => {
        const salinity = s.smax_observed || s.smax_forecast || s.salinity || 0
        return salinity >= 1
      }).length

  return (
    <div className="flex flex-1 overflow-hidden relative">
      <div className="flex-1 relative bg-[#0a0f14] overflow-hidden">
        {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6 max-w-md mx-4 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <WarningCircle className="w-6 h-6 text-red-500" />
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
          
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden absolute top-6 right-6 z-20 w-12 h-12 bg-slate-900/90 backdrop-blur-md flex items-center justify-center hover:bg-primary/20 text-white rounded-lg border border-slate-700 shadow-xl"
            aria-label="Toggle sidebar"
          >
            <List className="w-6 h-6" />
          </button>
          
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
              <Compass className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-slate-900/90 backdrop-blur-md flex items-center justify-center hover:bg-primary/20 text-white rounded-lg border border-slate-700 shadow-xl">
              <Stack className="w-5 h-5" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-32 right-6 w-48 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl z-10 hidden md:block">
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

          {/* Time Selection Buttons */}
          <div className="absolute bottom-6 left-6 right-6 lg:right-[400px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl px-4 lg:px-6 py-3 lg:py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-6 z-10">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary uppercase">{t('map.current')}</span>
                <span className="text-sm font-medium text-white">
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
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

      {/* Sidebar - Responsive: Hidden on mobile, overlay when open */}
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`
        fixed lg:static
        top-0 right-0 h-full
        w-80 lg:w-96
        bg-slate-900 border-l border-slate-700
        overflow-y-auto p-4 lg:p-5 space-y-4 lg:space-y-6
        flex flex-col shrink-0
        z-30 lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        shadow-2xl lg:shadow-none
      `}>
        {/* Close Button - Mobile Only */}
        <div className="lg:hidden flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">{t('map.mapInfo')}</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Selected Cooperative Info */}
        {selectedCooperative && (() => {
          // Try to find in cooperatives from API first, then fallback to mock
          const coop = cooperatives.find(c => c.id === selectedCooperative) || getCooperativeById(selectedCooperative)
          if (!coop) return null
          const coopFarms = mockFarms.filter(f => f.cooperativeId === selectedCooperative)
          const getRiskColor = (risk: number) => {
            if (risk >= 75) return 'text-red-500 bg-red-500/20'
            if (risk >= 50) return 'text-yellow-500 bg-yellow-500/20'
            if (risk >= 25) return 'text-orange-500 bg-orange-500/20'
            return 'text-green-500 bg-green-500/20'
          }
          return (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('map.selectedCooperative') || 'HTX Selected'}
                </h3>
                <button
                  onClick={() => setSelectedCooperative(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-bold text-white">{coop.name}</p>
                <p className="text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {coop.location}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                  <div>
                    <p className="text-xs text-slate-400">Total Farms</p>
                    <p className="font-bold text-white">{coop.totalFarms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Area</p>
                    <p className="font-bold text-white">{coop.totalArea} ha</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Avg Risk Score</p>
                    <p className={`font-bold ${getRiskColor(coop.averageRiskScore || 0).split(' ')[0]}`}>
                      {coop.averageRiskScore || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Affected Farms</p>
                    <p className="font-bold text-orange-500">{coop.affectedFarms || 0}</p>
                  </div>
                </div>
                {coopFarms.length > 0 && (
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">Households ({coopFarms.length})</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {coopFarms.slice(0, 10).map(farm => (
                        <div
                          key={farm.id}
                          onClick={() => {
                            setSelectedFarm(farm)
                            setSelectedCooperative(null)
                          }}
                          className="p-2 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700"
                        >
                          <p className="text-xs font-medium text-white">{farm.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-slate-400">{farm.area} ha</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getRiskColor(farm.currentRiskScore || 0)}`}>
                              {farm.currentRiskScore || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                      {coopFarms.length > 10 && (
                        <p className="text-xs text-slate-400 text-center mt-1">
                          +{coopFarms.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Selected Farm Info */}
        {selectedFarm && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{t('map.selectedFarm') || 'Selected Farm'}</h3>
              <button
                onClick={() => setSelectedFarm(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-bold text-white">{selectedFarm.name}</p>
              <p className="text-slate-300">{selectedFarm.cooperativeName}</p>
              <p className="text-slate-300">Area: {selectedFarm.area} ha</p>
              <p className="text-slate-300">Model: {selectedFarm.productionModel}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-slate-300">Risk:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  (selectedFarm.currentRiskScore || 0) >= 75 ? 'text-red-500 bg-red-500/20' :
                  (selectedFarm.currentRiskScore || 0) >= 50 ? 'text-yellow-500 bg-yellow-500/20' :
                  (selectedFarm.currentRiskScore || 0) >= 25 ? 'text-orange-500 bg-orange-500/20' :
                  'text-green-500 bg-green-500/20'
                }`}>
                  {selectedFarm.currentRiskScore || 0} - {selectedFarm.riskLevel?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

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
                <TrendUp className="w-3 h-3" />
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
                <TrendUp className="w-3 h-3" />
                {avgSalinity >= 4 ? t('map.critical') : avgSalinity >= 1 ? t('map.moderate') : t('map.low')}
              </p>
            </div>
          </div>
          
          {/* Monitoring Stations */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('map.monitoringStations')}</h4>
            <div className="space-y-2">
              {(() => {
                // Use real station data if available, otherwise use predictions
                // Data is already filtered to latest per station, so we can use station_name as key
                const displayStations = salinityStationData.length > 0 
                  ? salinityStationData.map(s => ({
                      station_id: s.station_name || 'unknown',
                      station_name: s.station_name,
                      distance_to_sea_km: s.distance_km || 0,
                      currentSalinity: s.smax_observed || s.smax_forecast || s.salinity || 0,
                      riskScore: (() => {
                        const sal = s.smax_observed || s.smax_forecast || s.salinity || 0
                        return sal >= 4 ? 75 : sal >= 1 ? 50 : 25
                      })()
                    }))
                  : stations.map(station => {
                      const stationPred = predictions?.predictions?.[station.station_id]
                      const stationRisk = predictions?.risk_scores?.[station.station_id] || 0
                      const currentSalinity = stationPred?.[0] || 0
                      return {
                        station_id: station.station_id,
                        station_name: station.station_name || station.station_id,
                        distance_to_sea_km: station.distance_to_sea_km,
                        currentSalinity,
                        riskScore: stationRisk
                      }
                    })
                
                return displayStations.map(station => (
                  <div key={station.station_id} className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{station.station_name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        station.riskScore >= 75 ? 'bg-red-500/20 text-red-500' :
                        station.riskScore >= 50 ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-green-500/20 text-green-500'
                      }`}>
                        {Math.round(station.riskScore)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{station.distance_to_sea_km}{t('map.kmFromSea')}</span>
                      <span className="text-white font-bold">{station.currentSalinity.toFixed(1)} ‰</span>
                    </div>
                  </div>
                ))
              })()}
            </div>
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

