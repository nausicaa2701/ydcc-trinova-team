// Centralized type definitions

export type ProductionModel = 'rice' | 'shrimp' | 'rice-shrimp' | 'fruit' | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SaltIntrusionBoundary {
  date: string;
  salinity: number; // 1 or 4 (‰)
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  confidence?: number;
}

export interface RiskSurface {
  date: string;
  riskScores: {
    coordinates: [number, number];
    riskScore: number;
  }[];
}

export interface SaltIntrusionData {
  boundaries: SaltIntrusionBoundary[];
  riskSurface: RiskSurface[];
  forecastHorizon: number; // days
  lastUpdated: string;
}

export interface Farm {
  id: string;
  name: string;
  cooperativeId: string;
  cooperativeName: string;
  location: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area: number;
  productionModel: ProductionModel;
  currentRiskScore?: number;
  riskLevel?: RiskLevel;
}

export interface Cooperative {
  id: string;
  name: string;
  location: string;
  totalFarms: number;
  totalArea: number;
  averageRiskScore?: number;
  affectedFarms?: number;
}

