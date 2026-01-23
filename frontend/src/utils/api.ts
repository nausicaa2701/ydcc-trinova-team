// API utility functions for Salinity Forecasting

import { SaltIntrusionData, RiskSurface, SaltIntrusionBoundary } from '@/types'
import { Farm, Cooperative } from '@/types'

// All APIs are now integrated into main backend (port 8000)
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const AI_API_BASE_URL = API_BASE_URL  // AI API is now part of main backend

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
    const response = await fetch(`${AI_API_BASE_URL}/api/ai/boundaries?date=${date}`)
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
    const response = await fetch(`${AI_API_BASE_URL}/api/ai/risk?date=${date}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    
    if (data.risk_scores) {
      const riskScores = Object.entries(data.risk_scores).map(([stationId, score]) => {
        const stationCoords = getStationCoords(stationId)
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
    const response = await fetch(`${AI_API_BASE_URL}/api/ai/predict`, {
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

// Stations (all stations from dataset)
export interface Station {
  station_id: string
  station_name?: string
  lat: number
  lon: number
  distance_to_sea_km: number
  elevation_m: number
  province?: string
}

// Legacy name for backward compatibility
export type TiengiangStation = Station
export const MONITORING_STATIONS: Station[] = [] // Will be loaded from API
// Legacy alias
export const TIEN_GIANG_STATIONS = MONITORING_STATIONS

// Cache for stations
let stationsCache: Station[] | null = null

export async function fetchStations(): Promise<Station[]> {
  if (stationsCache && stationsCache.length > 0) {
    return stationsCache
  }
  
  try {
    const response = await fetch(`${AI_API_BASE_URL}/api/ai/stations`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    stationsCache = (data.stations || []) as Station[]
    return stationsCache
  } catch (error) {
    console.error('Error fetching stations:', error)
    // Fallback to empty array
    return []
  }
}

export function getStationCoords(stationId: string): { lat: number; lon: number } {
  // Legacy alias for backward compatibility
  return getTiengiangStationCoords(stationId)
}

function getTiengiangStationCoords(stationId: string): { lat: number; lon: number } {
  // Try to find in cache first
  if (stationsCache) {
    const station = stationsCache.find(s => s.station_id === stationId)
    if (station) {
      return { lat: station.lat, lon: station.lon }
    }
  }
  // Fallback coordinates
  // Default to TPHCM center if station not found
  return { lat: 10.8, lon: 106.7 }
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
  try {
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`${API_BASE_URL}/coops`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch cooperatives')
    }
    
    const data = await response.json()
    // Transform backend data to match Cooperative interface
    return data.map((coop: any) => ({
      id: coop.id,
      name: coop.name,
      location: coop.address || coop.province || '',
      totalFarms: 0, // Not provided by backend, will be calculated
      totalArea: 0, // Not provided by backend, will be calculated
      averageRiskScore: 0, // Not provided by backend
      affectedFarms: 0, // Not provided by backend
      center_lat: coop.center_lat,
      center_lon: coop.center_lon,
      address: coop.address,
      province: coop.province,
    }))
  } catch (error) {
    console.error('Error fetching cooperatives:', error)
    // Fallback to mock data if API fails
    const { mockCooperatives } = await import('@/data/mockFarms')
    return mockCooperatives
  }
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

// Trend Analysis API
export interface TrendAnalysis {
  date: string
  analysis_period_days: number
  trends: Record<string, {
    trend: {
      slope: number
      trend_direction: 'increasing' | 'decreasing' | 'stable'
      trend_strength: number
      p_value: number
    }
    seasonal: {
      monthly_average: Record<number, number>
      peak_month: number | null
      low_month: number | null
      seasonal_range: number
    }
    forecast: {
      forecast_values: number[]
      confidence_upper: number[]
      confidence_lower: number[]
      slope: number
      r_squared: number
    }
    comparison: {
      change_percent: number
      change_absolute: number
      is_worse: boolean
    }
  }>
}

export async function fetchTrendAnalysis(
  stationId?: string,
  days: number = 30
): Promise<TrendAnalysis | null> {
  try {
    const params = new URLSearchParams()
    if (stationId) params.append('station_id', stationId)
    params.append('days', days.toString())
    
    const response = await fetch(`${AI_API_BASE_URL}/api/ai/trend?${params}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching trend analysis:', error)
    return null
  }
}

// Storage Planning API
export interface StoragePlanning {
  date: string
  current_level_percent: number
  days_of_supply: number
  shortfall_date: string | null
  safe_window_days: number
  optimal_fill_date: string | null
  storage_requirements: {
    required_capacity_m3: number
    critical_period_days: number
    recommended_fill_date: string | null
    buffer_days: number
  }
  recommendations: Array<{
    priority: 'urgent' | 'high' | 'medium' | 'low'
    action: string
    message: string
    deadline: string | null
  }>
}

export async function fetchStoragePlanning(
  stationId?: string,
  currentLevelPercent: number = 68.0,
  dailyConsumptionM3: number = 1000.0,
  totalCapacityM3: number = 50000.0,
  horizonDays: number = 30
): Promise<StoragePlanning | null> {
  try {
    const params = new URLSearchParams()
    if (stationId) params.append('station_id', stationId)
    params.append('current_level_percent', currentLevelPercent.toString())
    params.append('daily_consumption_m3', dailyConsumptionM3.toString())
    params.append('total_capacity_m3', totalCapacityM3.toString())
    params.append('horizon_days', horizonDays.toString())
    
    const response = await fetch(`${AI_API_BASE_URL}/api/ai/storage?${params}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching storage planning:', error)
    return null
  }
}

// Risk Mitigation API
export interface MitigationRecommendation {
  priority: 'urgent' | 'high' | 'medium' | 'low'
  category: 'harvest' | 'storage' | 'mitigation' | 'planning'
  action: string
  title: string
  message: string
  deadline: string | null
  icon?: string
}

export interface StationMitigation {
  current_salinity: number
  risk_score: number
  recommendations: MitigationRecommendation[]
  harvest_deadline: {
    deadline_date: string | null
    urgency: 'urgent' | 'high' | 'medium' | 'low'
    days_until_critical: number
    message: string
  } | null
  safe_operational_window: {
    start_date: string
    end_date: string
    duration_days: number
  } | null
}

export interface RiskMitigation {
  date: string
  horizon_days: number
  stations: Record<string, StationMitigation>
}

export async function fetchRiskMitigation(
  stationId?: string,
  horizonDays: number = 30
): Promise<RiskMitigation | null> {
  try {
    const params = new URLSearchParams()
    if (stationId) params.append('station_id', stationId)
    params.append('horizon_days', horizonDays.toString())
    
    const response = await fetch(`${AI_API_BASE_URL}/api/ai/mitigation?${params}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching risk mitigation:', error)
    return null
  }
}

// ===================== Salinity Station Data API =====================
export interface SalinityStationData {
  station_name: string
  river_name?: string | null
  distance_km?: number | null
  smax_observed?: number | null
  observed_period?: string | null
  smax_forecast?: number | null
  forecast_date?: string | null
  temperature?: number | null
  water_level?: number | null
  ec?: number | null
  salinity?: number | null
  do?: number | null
  source_file?: string | null
  extraction_method?: string | null
  extraction_timestamp?: string | null
}

export async function fetchLatestSalinityData(forceRefresh: boolean = false): Promise<SalinityStationData[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/salinity/latest?force_refresh=${forceRefresh}`
    )
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching latest salinity data:', error)
    // Fallback to empty array
    return []
  }
}

export async function fetchSalinityStations(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/salinity/stations`)
    if (!response.ok) {
      return []
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching salinity stations:', error)
    return []
  }
}

export async function fetchStationData(stationName: string): Promise<SalinityStationData[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/salinity/stations/${encodeURIComponent(stationName)}`
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch data for station: ${stationName}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching data for station ${stationName}:`, error)
    return []
  }
}

// ===================== TH2I Data API =====================
export interface TH2IObservation {
  date?: string | null
  station: string
  rain_mm?: number | null
  water_level_m?: number | null
  inflow_m3s?: number | null
  turbine_flow_m3s?: number | null
  discharge_m3s?: number | null
  source_file?: string | null
}

export interface TH2ITideMeasured {
  date?: string | null
  station: string
  peaks: Array<{
    level_m?: number | null
    time?: string | null
  }>
  source_file?: string | null
}

export interface TH2IData {
  observation: TH2IObservation[]
  tide_measured: TH2ITideMeasured[]
  tide_forecast: Record<string, any>
  source_file?: string | null
  extraction_date?: string | null
}

export async function fetchLatestTH2IData(forceRefresh: boolean = false): Promise<TH2IData | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/th2i/latest?force_refresh=${forceRefresh}`
    )
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching latest TH2I data:', error)
    return null
  }
}

export async function fetchTH2IObservation(forceRefresh: boolean = false): Promise<TH2IObservation[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/th2i/observation?force_refresh=${forceRefresh}`
    )
    if (!response.ok) {
      return []
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching TH2I observation:', error)
    return []
  }
}

export async function fetchTH2ITideMeasured(forceRefresh: boolean = false): Promise<TH2ITideMeasured[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/th2i/tide-measured?force_refresh=${forceRefresh}`
    )
    if (!response.ok) {
      return []
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching TH2I tide measured:', error)
    return []
  }
}

export async function fetchTH2ITideForecast(forceRefresh: boolean = false): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/th2i/tide-forecast?force_refresh=${forceRefresh}`
    )
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching TH2I tide forecast:', error)
    return null
  }
}

export async function fetchTH2IStations(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/th2i/stations`)
    if (!response.ok) {
      return []
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching TH2I stations:', error)
    return []
  }
}
