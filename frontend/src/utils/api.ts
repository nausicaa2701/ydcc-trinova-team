// API utility functions for Tiền Giang Salinity Forecasting

import { SaltIntrusionData, RiskSurface, SaltIntrusionBoundary } from '@/types'
import { Farm, Cooperative } from '@/types'

const AI_API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || 'http://localhost:8001'

// Salt Intrusion API
export async function fetchSaltIntrusionData(
  _startDate: string,
  _endDate: string
): Promise<SaltIntrusionData> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/salt-intrusion?start_date=${startDate}&end_date=${endDate}`)
  // return response.json()
  
  // For now, return mock data
  const { mockSaltIntrusionData } = await import('@/data/mockSaltIntrusion')
  return mockSaltIntrusionData
}

export async function fetchBoundariesForDate(
  date: string,
  salinity?: number
): Promise<SaltIntrusionBoundary[]> {
  try {
    const response = await fetch(`${AI_API_BASE_URL}/boundaries?date=${date}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    
    if (data.features && Array.isArray(data.features)) {
      const boundaries: SaltIntrusionBoundary[] = data.features.map((feature: any) => ({
        date: feature.properties.date || date,
        salinity: feature.properties.salinity,
        geometry: feature.geometry,
        confidence: feature.properties.confidence || 0.85,
      }))
      return salinity ? boundaries.filter(b => b.salinity === salinity) : boundaries
    }
    
    return []
  } catch (error) {
    console.error('Error fetching boundaries:', error)
    // Fallback to mock data
    const { getBoundariesForDate } = await import('@/data/mockSaltIntrusion')
    const boundaries = getBoundariesForDate(date)
    return salinity ? boundaries.filter(b => b.salinity === salinity) : boundaries
  }
}

export async function fetchRiskSurfaceForDate(
  date: string
): Promise<RiskSurface | null> {
  try {
    const response = await fetch(`${AI_API_BASE_URL}/risk?date=${date}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    
    if (data.risk_scores) {
      const riskScores = Object.entries(data.risk_scores).map(([stationId, score]) => {
        const stationCoords = getTiengiangStationCoords(stationId)
        return {
          coordinates: [stationCoords.lon, stationCoords.lat] as [number, number],
          riskScore: score as number,
        }
      })
      
      return {
        date,
        riskScores,
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching risk surface:', error)
    // Fallback to mock data
    const { getRiskSurfaceForDate } = await import('@/data/mockSaltIntrusion')
    return getRiskSurfaceForDate(date) || null
  }
}

// Tiền Giang Salinity Prediction API
export interface SalinityPrediction {
  date: string
  horizon_days: number
  predictions: Record<string, number[]> // station_id -> [salinity values]
  boundaries: {
    type: 'FeatureCollection'
    features: Array<{
      type: 'Feature'
      geometry: {
        type: 'Polygon'
        coordinates: number[][][]
      }
      properties: {
        salinity: number
        confidence: number
      }
    }>
  }
  risk_scores: Record<string, number>
  confidence: number
}

export async function fetchSalinityPrediction(
  horizonDays: number = 7,
  stationId?: string,
  date?: string
): Promise<SalinityPrediction | null> {
  try {
    const response = await fetch(`${AI_API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        horizon_days: horizonDays,
        station_id: stationId,
        date: date || new Date().toISOString().split('T')[0],
      }),
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching salinity prediction:', error)
    return null
  }
}

// Tiền Giang Stations
export interface TiengiangStation {
  station_id: string
  station_name: string
  lat: number
  lon: number
  distance_to_sea_km: number
  elevation_m: number
}

export const TIEN_GIANG_STATIONS: TiengiangStation[] = [
  { station_id: 'TG01', station_name: 'MyTho', lat: 10.36, lon: 106.36, distance_to_sea_km: 60, elevation_m: 1.0 },
  { station_id: 'TG02', station_name: 'CaiBe', lat: 10.41, lon: 105.97, distance_to_sea_km: 90, elevation_m: 1.2 },
  { station_id: 'TG03', station_name: 'Cua_Tieu', lat: 10.27, lon: 106.74, distance_to_sea_km: 20, elevation_m: 0.8 },
  { station_id: 'TG04', station_name: 'Cua_Dai', lat: 10.28, lon: 106.83, distance_to_sea_km: 10, elevation_m: 0.7 },
  { station_id: 'TG05', station_name: 'ChoGao', lat: 10.40, lon: 106.74, distance_to_sea_km: 35, elevation_m: 0.9 },
]

export function getTiengiangStationCoords(stationId: string): { lat: number; lon: number } {
  const station = TIEN_GIANG_STATIONS.find(s => s.station_id === stationId)
  return station ? { lat: station.lat, lon: station.lon } : { lat: 10.35, lon: 106.3 }
}

// Farm & Cooperative API
export async function fetchFarms(
  filters?: {
    cooperativeId?: string
    productionModel?: string
    riskLevel?: string
  }
): Promise<Farm[]> {
  // TODO: Replace with actual API call
  // const params = new URLSearchParams(filters as any)
  // const response = await fetch(`${API_BASE_URL}/farms?${params}`)
  // return response.json()
  
  // For now, return mock data
  const { mockFarms } = await import('@/data/mockFarms')
  let farms = mockFarms
  
  if (filters?.cooperativeId) {
    farms = farms.filter(f => f.cooperativeId === filters.cooperativeId)
  }
  if (filters?.productionModel) {
    farms = farms.filter(f => f.productionModel === filters.productionModel)
  }
  if (filters?.riskLevel) {
    farms = farms.filter(f => f.riskLevel === filters.riskLevel)
  }
  
  return farms
}

export async function fetchCooperatives(): Promise<Cooperative[]> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/cooperatives`)
  // return response.json()
  
  // For now, return mock data
  const { mockCooperatives } = await import('@/data/mockFarms')
  return mockCooperatives
}

export async function fetchFarmById(id: string): Promise<Farm | null> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/farms/${id}`)
  // return response.json()
  
  // For now, return mock data
  const { mockFarms } = await import('@/data/mockFarms')
  return mockFarms.find(f => f.id === id) || null
}

export async function fetchFarmRiskScore(
  farmId: string,
  _date: string
): Promise<number> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}/farms/${farmId}/risk?date=${date}`)
  // const data = await response.json()
  // return data.riskScore
  
  // For now, return mock data
  const farm = await fetchFarmById(farmId)
  return farm?.currentRiskScore || 0
}

