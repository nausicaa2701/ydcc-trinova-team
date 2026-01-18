// Mock data for salt intrusion predictions
// This will be replaced by AI API later

export interface SaltIntrusionBoundary {
  date: string; // ISO date string
  salinity: number; // 1 or 4 (‰)
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  confidence?: number; // 0-1
}

export interface RiskSurface {
  date: string;
  riskScores: {
    coordinates: [number, number]; // [lng, lat]
    riskScore: number; // 0-100
  }[];
}

export interface SaltIntrusionData {
  boundaries: SaltIntrusionBoundary[];
  riskSurface: RiskSurface[];
  forecastHorizon: number; // days
  lastUpdated: string;
}

// Mock data for Mekong Delta region
// Coordinates approximate to Mekong Delta, Vietnam
const BASE_LNG = 105.8;
const BASE_LAT = 9.5;

function generateBoundary(salinity: number, dateOffset: number, baseLng: number, baseLat: number): SaltIntrusionBoundary {
  const date = new Date();
  date.setDate(date.getDate() + dateOffset);
  
  // Simulate salt intrusion moving inland
  const intrusionDistance = 0.3 + (dateOffset * 0.02); // km
  const lngOffset = intrusionDistance * 0.01;
  
  return {
    date: date.toISOString().split('T')[0],
    salinity,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - lngOffset, baseLat - 0.2],
        [baseLng + lngOffset + 0.5, baseLat - 0.2],
        [baseLng + lngOffset + 0.5, baseLat + 0.3],
        [baseLng - lngOffset, baseLat + 0.3],
        [baseLng - lngOffset, baseLat - 0.2],
      ]],
    },
    confidence: 0.85 + Math.random() * 0.1,
  };
}

function generateRiskSurface(dateOffset: number): RiskSurface {
  const date = new Date();
  date.setDate(date.getDate() + dateOffset);
  
  const riskScores: RiskSurface['riskScores'] = [];
  
  // Generate grid of risk scores
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      const lng = BASE_LNG + (i * 0.05) - 0.5;
      const lat = BASE_LAT + (j * 0.05) - 0.5;
      
      // Higher risk closer to coast and further in future
      const distanceFromCoast = Math.abs(lng - BASE_LNG);
      const riskScore = Math.max(0, Math.min(100, 
        80 - (distanceFromCoast * 50) + (dateOffset * 2) + (Math.random() * 20 - 10)
      ));
      
      riskScores.push({
        coordinates: [lng, lat],
        riskScore: Math.round(riskScore),
      });
    }
  }
  
  return {
    date: date.toISOString().split('T')[0],
    riskScores,
  };
}

export const mockSaltIntrusionData: SaltIntrusionData = {
  boundaries: [
    // 1‰ boundaries for next 30 days
    ...Array.from({ length: 30 }, (_, i) => generateBoundary(1, i, BASE_LNG, BASE_LAT)),
    // 4‰ boundaries for next 30 days
    ...Array.from({ length: 30 }, (_, i) => generateBoundary(4, i, BASE_LNG, BASE_LAT)),
  ],
  riskSurface: Array.from({ length: 30 }, (_, i) => generateRiskSurface(i)),
  forecastHorizon: 30,
  lastUpdated: new Date().toISOString(),
};

// Helper function to get boundaries for a specific date
export function getBoundariesForDate(date: string): SaltIntrusionBoundary[] {
  return mockSaltIntrusionData.boundaries.filter(b => b.date === date);
}

// Helper function to get risk surface for a specific date
export function getRiskSurfaceForDate(date: string): RiskSurface | undefined {
  return mockSaltIntrusionData.riskSurface.find(r => r.date === date);
}

// Helper function to get risk score for a point
export function getRiskScoreForPoint(lng: number, lat: number, date: string): number {
  const riskSurface = getRiskSurfaceForDate(date);
  if (!riskSurface) return 0;
  
  // Find nearest point
  let minDistance = Infinity;
  let nearestRisk = 0;
  
  for (const point of riskSurface.riskScores) {
    const distance = Math.sqrt(
      Math.pow(point.coordinates[0] - lng, 2) + 
      Math.pow(point.coordinates[1] - lat, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestRisk = point.riskScore;
    }
  }
  
  return nearestRisk;
}

