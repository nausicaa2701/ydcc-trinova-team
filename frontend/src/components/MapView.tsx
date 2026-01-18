import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { useAppStore } from '@/store/useAppStore'
import { getBoundariesForDate, getRiskSurfaceForDate } from '@/data/mockSaltIntrusion'
import { mockFarms } from '@/data/mockFarms'
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
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  
  const {
    selectedDate,
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
      const farmsGeoJSON = {
        type: 'FeatureCollection' as const,
        features: mockFarms.map(farm => ({
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
        if (e.features && e.features[0]) {
          const props = e.features[0].properties
          const farm = mockFarms.find(f => f.id === props.id)
          if (farm) {
            setSelectedFarm(farm)
            
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
  }, [showFarms, mapLoaded, setSelectedFarm])

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
    map.current.flyTo({
      center: [coordinates[0], coordinates[1]],
      zoom: 12,
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

