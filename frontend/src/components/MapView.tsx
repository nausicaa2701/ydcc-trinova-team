import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useAppStore } from '@/store/useAppStore'
import { getBoundariesForDate, getRiskSurfaceForDate } from '@/data/mockSaltIntrusion'
import { mockFarms, mockCooperatives, getCooperativeById } from '@/data/mockFarms'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/utils/apiClient'
import TimeSlider from './TimeSlider'
import { AlertCircle } from 'lucide-react'

// Set Mapbox token
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
if (mapboxToken && mapboxToken !== 'your_mapbox_token_here' && mapboxToken.startsWith('pk.')) {
  mapboxgl.accessToken = mapboxToken
  console.log('Mapbox token loaded successfully')
} else {
  console.warn('VITE_MAPBOX_TOKEN is not set or invalid. Map may not display correctly.')
  console.warn('Token value:', mapboxToken ? `${mapboxToken.substring(0, 10)}...` : 'undefined')
}

export default function MapView() {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [cooperativeData, setCooperativeData] = useState<any>(null)
  
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
        zoom = 12
        const latOffset = 0.05
        const lonOffset = 0.05
        bounds = [
          [center[0] - lonOffset, center[1] - latOffset],
          [center[0] + lonOffset, center[1] + latOffset],
        ]
      } else {
        const coop = getCooperativeById(user.coop_id)
        if (coop) {
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
        const farm = userFarms[0]
        const coords = farm.location.coordinates[0][0]
        center = [coords[0], coords[1]]
        zoom = 13
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
      let errorMsg = 'Mapbox token is missing or invalid.'
      if (!mapboxToken) {
        errorMsg += ' Please set VITE_MAPBOX_TOKEN in your .env file.'
      } else if (mapboxToken === 'your_mapbox_token_here') {
        errorMsg += ' Please replace the placeholder with your actual Mapbox token.'
      } else if (!mapboxToken.startsWith('pk.')) {
        errorMsg += ' Token should start with "pk."'
      }
      errorMsg += ' After updating .env, please restart the dev server.'
      setMapError(errorMsg)
      return
    }

    try {
      const mapConfig = getMapConfig()
      // TP. Hồ Chí Minh center: [106.7, 10.8] (default, adjusted by role)
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        maxBounds: mapConfig.bounds,
      })

      map.current.on('load', () => {
        setMapLoaded(true)
        // Update map view based on role after load
        const mapConfig = getMapConfig()
        if (map.current) {
          map.current.flyTo({
            center: mapConfig.center,
            zoom: mapConfig.zoom,
          })
          map.current.setMaxBounds(mapConfig.bounds)
        }
        
        // Add river layer styling
        if (map.current) {
          // Style water features (rivers, streams) in blue
          const layers = map.current.getStyle().layers
          const waterLayerIndex = layers?.findIndex(layer => layer.id === 'water')
          
          if (waterLayerIndex !== undefined && waterLayerIndex !== -1) {
            // Modify existing water layer
            map.current.setPaintProperty('water', 'fill-color', '#3b82f6')
            map.current.setPaintProperty('water', 'fill-opacity', 0.6)
          } else {
            // Add water layer if it doesn't exist
            map.current.addLayer({
              id: 'river-water',
              type: 'fill',
              source: {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8',
              },
              'source-layer': 'water',
              paint: {
                'fill-color': '#3b82f6',
                'fill-opacity': 0.6,
              },
            })
          }
          
          // Also style water outlines
          const waterOutlineLayerIndex = layers?.findIndex(layer => layer.id === 'water-line')
          if (waterOutlineLayerIndex !== undefined && waterOutlineLayerIndex !== -1) {
            map.current.setPaintProperty('water-line', 'line-color', '#0369a1')
            map.current.setPaintProperty('water-line', 'line-opacity', 0.8)
            map.current.setPaintProperty('water-line', 'line-width', 2)
          }
        }
        setMapLoaded(true)
        setMapError(null)
      })

      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e)
        let errorMsg = 'Failed to load map.'
        if (e.error?.message) {
          errorMsg += ` Error: ${e.error.message}`
        } else if (e.type === 'style') {
          errorMsg += ' Style loading failed. Please check your Mapbox token permissions.'
        } else {
          errorMsg += ' Please check your Mapbox token and ensure it has access to Mapbox styles.'
        }
        setMapError(errorMsg)
        setMapLoaded(false)
      })
    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('Failed to initialize map. Please check your configuration.')
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update boundaries layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const boundaries = getBoundariesForDate(selectedDate)
    
    // Remove existing boundary sources
    if (map.current.getSource('salt-boundaries-1')) {
      map.current.removeLayer('salt-boundaries-1-fill')
      map.current.removeLayer('salt-boundaries-1-line')
      map.current.removeSource('salt-boundaries-1')
    }
    if (map.current.getSource('salt-boundaries-4')) {
      map.current.removeLayer('salt-boundaries-4-fill')
      map.current.removeLayer('salt-boundaries-4-line')
      map.current.removeSource('salt-boundaries-4')
    }

    if (showBoundaries) {
      // Add 1‰ boundary
      const boundary1 = boundaries.find(b => b.salinity === 1)
      if (boundary1) {
        map.current.addSource('salt-boundaries-1', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: boundary1.geometry,
            properties: { salinity: 1 },
          },
        })

        map.current.addLayer({
          id: 'salt-boundaries-1-fill',
          type: 'fill',
          source: 'salt-boundaries-1',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2,
          },
        })

        map.current.addLayer({
          id: 'salt-boundaries-1-line',
          type: 'line',
          source: 'salt-boundaries-1',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        })
      }

      // Add 4‰ boundary
      const boundary4 = boundaries.find(b => b.salinity === 4)
      if (boundary4) {
        map.current.addSource('salt-boundaries-4', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: boundary4.geometry,
            properties: { salinity: 4 },
          },
        })

        map.current.addLayer({
          id: 'salt-boundaries-4-fill',
          type: 'fill',
          source: 'salt-boundaries-4',
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.3,
          },
        })

        map.current.addLayer({
          id: 'salt-boundaries-4-line',
          type: 'line',
          source: 'salt-boundaries-4',
          paint: {
            'line-color': '#ef4444',
            'line-width': 2,
          },
        })
      }
    }
  }, [selectedDate, showBoundaries, mapLoaded])

  // Update farms layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing farms source
    if (map.current.getSource('farms')) {
      map.current.removeLayer('farms-fill')
      map.current.removeLayer('farms-line')
      map.current.removeSource('farms')
    }

    if (showFarms) {
      // Filter farms based on user role
      let farmsToShow = mockFarms
      if (user?.role === 'COOP_ADMIN' && user.coop_id) {
        farmsToShow = mockFarms.filter(f => f.cooperativeId === user.coop_id)
      } else if (user?.role === 'FARMER' && user.coop_id) {
        farmsToShow = mockFarms.filter(f => f.cooperativeId === user.coop_id)
      }
      // SYSTEM_ADMIN sees all farms

      const farmsGeoJSON = {
        type: 'FeatureCollection' as const,
        features: farmsToShow.map(farm => ({
          type: 'Feature' as const,
          geometry: farm.location,
          properties: {
            id: farm.id,
            name: farm.name,
            cooperativeId: farm.cooperativeId,
            cooperativeName: farm.cooperativeName,
            area: farm.area,
            productionModel: farm.productionModel,
            riskScore: farm.currentRiskScore || 0,
            riskLevel: farm.riskLevel,
          },
        })),
      }

      map.current.addSource('farms', {
        type: 'geojson',
        data: farmsGeoJSON,
      })

      map.current.addLayer({
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

      map.current.addLayer({
        id: 'farms-line',
        type: 'line',
        source: 'farms',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1,
        },
      })

      // Add click handler
      map.current.on('click', 'farms-fill', (e) => {
        if (e.features && e.features[0] && e.features[0].properties) {
          const props = e.features[0].properties
          const farm = mockFarms.find(f => f.id === props.id)
          if (farm) {
            setSelectedFarm(farm)
            setSelectedCooperative(null) // Clear cooperative selection when farm is selected
            
            // Fly to farm
            const coordinates = e.lngLat
            map.current?.flyTo({
              center: [coordinates.lng, coordinates.lat],
              zoom: 12,
            })
          }
        }
      })

      // Change cursor on hover
      map.current.on('mouseenter', 'farms-fill', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer'
        }
      })

      map.current.on('mouseleave', 'farms-fill', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = ''
        }
      })
    }

    // Add cooperative markers (only for SYSTEM_ADMIN)
    if (user?.role === 'SYSTEM_ADMIN' && map.current && mapLoaded) {
      // Remove existing cooperative source if it exists
      if (map.current.getSource('cooperatives')) {
        map.current.removeLayer('cooperatives-circles')
        map.current.removeLayer('cooperatives-labels')
        map.current.removeSource('cooperatives')
      }

      // District coordinates for TPHCM
      const DISTRICT_COORDS: Record<string, [number, number]> = {
        'Quận 9': [106.8099, 10.8422],
        'Thủ Đức': [106.7637, 10.8497],
        'Bình Chánh': [106.6067, 10.6994],
        'Quận 8': [106.629, 10.74],
        'Củ Chi': [106.4967, 11.1572],
        'Cần Giờ': [106.9547, 10.4114],
        'Quận 12': [106.6544, 10.8639],
      }

      const cooperativesGeoJSON = {
        type: 'FeatureCollection' as const,
        features: mockCooperatives.map(coop => {
          const district = coop.location.split(',')[0].trim()
          const coords = DISTRICT_COORDS[district] || [106.7, 10.8]
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: coords,
            },
            properties: {
              id: coop.id,
              name: coop.name,
              location: coop.location,
              totalFarms: coop.totalFarms,
              totalArea: coop.totalArea,
              averageRiskScore: coop.averageRiskScore || 0,
              affectedFarms: coop.affectedFarms || 0,
            },
          }
        }),
      }

      map.current.addSource('cooperatives', {
        type: 'geojson',
        data: cooperativesGeoJSON,
      })

      // Add cooperative circles
      map.current.addLayer({
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

      // Add cooperative labels
      map.current.addLayer({
        id: 'cooperatives-labels',
        type: 'symbol',
        source: 'cooperatives',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
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

      // Add click handler for cooperatives
      map.current.on('click', 'cooperatives-circles', (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties
          const coop = getCooperativeById(props.id)
          if (coop && map.current) {
            setSelectedCooperative(coop.id)
            setSelectedFarm(null) // Clear farm selection when cooperative is selected
            const coordinates = e.lngLat
            map.current.flyTo({ center: [coordinates.lng, coordinates.lat], zoom: 12 })
          }
        }
      })

      // Change cursor on hover
      map.current.on('mouseenter', 'cooperatives-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer'
        }
      })
      map.current.on('mouseleave', 'cooperatives-circles', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = ''
        }
      })
    }
  }, [showFarms, mapLoaded, setSelectedFarm, setSelectedCooperative, user])

  // Highlight selected farm
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedFarm) return

    // Remove existing highlight
    if (map.current.getSource('selected-farm')) {
      map.current.removeLayer('selected-farm-fill')
      map.current.removeLayer('selected-farm-line')
      map.current.removeSource('selected-farm')
    }

    // Add highlight
    map.current.addSource('selected-farm', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: selectedFarm.location,
        properties: {},
      },
    })

    map.current.addLayer({
      id: 'selected-farm-fill',
      type: 'fill',
      source: 'selected-farm',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.3,
      },
    })

    map.current.addLayer({
      id: 'selected-farm-line',
      type: 'line',
      source: 'selected-farm',
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
      },
    })

    // Center on selected farm
    const coordinates = selectedFarm.location.coordinates[0][0]
    const mapConfig = getMapConfig()
    map.current.flyTo({
      center: [coordinates[0], coordinates[1]],
      zoom: Math.max(14, mapConfig.zoom + 2), // At least zoom 14, or role-based zoom + 2
    })
  }, [selectedFarm, mapLoaded])

  // Risk heatmap (simplified - using circles for now)
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    if (map.current.getSource('risk-heatmap')) {
      map.current.removeLayer('risk-heatmap-circles')
      map.current.removeSource('risk-heatmap')
    }

    if (showRiskHeatmap) {
      const riskSurface = getRiskSurfaceForDate(selectedDate)
      if (riskSurface) {
        const heatmapData = {
          type: 'FeatureCollection' as const,
          features: riskSurface.riskScores.map(point => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: point.coordinates,
            },
            properties: {
              riskScore: point.riskScore,
            },
          })),
        }

        map.current.addSource('risk-heatmap', {
          type: 'geojson',
          data: heatmapData,
        })

        map.current.addLayer({
          id: 'risk-heatmap-circles',
          type: 'circle',
          source: 'risk-heatmap',
          paint: {
            'circle-radius': 8,
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'riskScore'],
              0, '#22c55e',
              25, '#eab308',
              50, '#ea580c',
              75, '#dc2626',
            ],
            'circle-opacity': 0.6,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
          },
        })
      }
    }
  }, [selectedDate, showRiskHeatmap, mapLoaded])

  return (
    <div className="relative w-full h-full" style={{ minHeight: '100%' }}>
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ minHeight: '400px', position: 'relative' }}
      />
      
      {/* Error Message */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Map Error</h3>
            </div>
            <p className="text-gray-700 mb-4">{mapError}</p>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p className="font-medium mb-2">To fix this:</p>
              <ol className="list-decimal list-inside space-y-1 mb-3">
                <li>Open <code className="bg-gray-200 px-1 rounded">frontend/.env</code> file</li>
                <li>Ensure it contains: <code className="bg-gray-200 px-1 rounded">VITE_MAPBOX_TOKEN=pk.eyJ...</code></li>
                <li>Get your token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mapbox Access Tokens</a></li>
                <li><strong>Important:</strong> Restart the dev server after updating .env</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p className="text-xs text-gray-500">
                  <strong>Debug info:</strong> Token detected: {mapboxToken ? 'Yes' : 'No'} 
                  {mapboxToken && ` (starts with: ${mapboxToken.substring(0, 10)}...)`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Legend</h3>
        <div className="space-y-2 text-xs">
          {showBoundaries && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 opacity-30 border-2 border-blue-500 border-dashed"></div>
                <span>1‰ Salt Boundary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 opacity-30 border-2 border-red-500"></div>
                <span>4‰ Salt Boundary</span>
              </div>
            </>
          )}
          {showFarms && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 opacity-50"></div>
                <span>Low Risk Farm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 opacity-50"></div>
                <span>Medium Risk Farm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 opacity-50"></div>
                <span>High Risk Farm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 opacity-50"></div>
                <span>Critical Risk Farm</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Time Slider */}
      <div className="absolute top-4 right-4 z-10">
        <TimeSlider />
      </div>
    </div>
  )
}

