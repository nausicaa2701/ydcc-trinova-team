// Mock data for farms and cooperatives
// This will be replaced by API later

export type ProductionModel = 'rice' | 'shrimp' | 'rice-shrimp' | 'fruit' | 'other';

export interface Farm {
  id: string;
  name: string;
  cooperativeId: string;
  cooperativeName: string;
  location: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area: number; // hectares
  productionModel: ProductionModel;
  currentRiskScore?: number; // 0-100, calculated from AI
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Cooperative {
  id: string;
  name: string;
  location: string; // Administrative area
  totalFarms: number;
  totalArea: number; // hectares
  averageRiskScore?: number;
  affectedFarms?: number; // Farms with risk > 50
}

// Tiền Giang coordinates
const TIEN_GIANG_BASE_LNG = 106.3;
const TIEN_GIANG_BASE_LAT = 10.35;

function generateFarmPolygon(baseLng: number, baseLat: number, size: number = 0.01): number[][][] {
  return [[
    [baseLng, baseLat],
    [baseLng + size, baseLat],
    [baseLng + size, baseLat + size],
    [baseLng, baseLat + size],
    [baseLng, baseLat],
  ]];
}

function getRiskLevel(riskScore: number): Farm['riskLevel'] {
  if (riskScore >= 75) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
}

export const mockCooperatives: Cooperative[] = [
  {
    id: 'htx-tg-001',
    name: 'Hợp tác xã Nông nghiệp Mỹ Tho',
    location: 'Tiền Giang - Mỹ Tho',
    totalFarms: 32,
    totalArea: 98.5,
    averageRiskScore: 45,
    affectedFarms: 12,
  },
  {
    id: 'htx-tg-002',
    name: 'Hợp tác xã Tôm - Lúa Cái Bè',
    location: 'Tiền Giang - Cái Bè',
    totalFarms: 28,
    totalArea: 85.2,
    averageRiskScore: 58,
    affectedFarms: 15,
  },
  {
    id: 'htx-tg-003',
    name: 'Hợp tác xã Cây ăn trái Chợ Gạo',
    location: 'Tiền Giang - Chợ Gạo',
    totalFarms: 24,
    totalArea: 72.8,
    averageRiskScore: 38,
    affectedFarms: 6,
  },
  {
    id: 'htx-tg-004',
    name: 'Hợp tác xã Nuôi trồng thủy sản Cửa Tiểu',
    location: 'Tiền Giang - Cửa Tiểu',
    totalFarms: 18,
    totalArea: 65.3,
    averageRiskScore: 72,
    affectedFarms: 14,
  },
];

const productionModels: ProductionModel[] = ['rice', 'shrimp', 'rice-shrimp', 'fruit', 'other'];

export const mockFarms: Farm[] = [];

// Generate farms for each cooperative in Tiền Giang
mockCooperatives.forEach((coop, coopIndex) => {
  const farmsPerCoop = coop.totalFarms;
  // Spread farms around Tiền Giang region (106.0-106.8, 10.1-10.6)
  const baseLng = TIEN_GIANG_BASE_LNG + (coopIndex % 2 === 0 ? -0.15 : 0.15);
  const baseLat = TIEN_GIANG_BASE_LAT + (coopIndex < 2 ? -0.1 : 0.1);
  
  for (let i = 0; i < farmsPerCoop; i++) {
    const row = Math.floor(i / 7);
    const col = i % 7;
    const lng = baseLng + (col * 0.012);
    const lat = baseLat + (row * 0.012);
    
    const area = 1.5 + Math.random() * 3; // 1.5-4.5 hectares
    const riskScore = Math.round(20 + Math.random() * 60); // 20-80
    
    mockFarms.push({
      id: `farm-${coop.id}-${i + 1}`,
      name: `Hộ ${i + 1}`,
      cooperativeId: coop.id,
      cooperativeName: coop.name,
      location: {
        type: 'Polygon',
        coordinates: generateFarmPolygon(lng, lat, 0.008),
      },
      area: Math.round(area * 10) / 10,
      productionModel: productionModels[Math.floor(Math.random() * productionModels.length)],
      currentRiskScore: riskScore,
      riskLevel: getRiskLevel(riskScore),
    });
  }
});

// Helper functions
export function getFarmsByCooperative(cooperativeId: string): Farm[] {
  return mockFarms.filter(f => f.cooperativeId === cooperativeId);
}

export function getFarmsByProductionModel(model: ProductionModel): Farm[] {
  return mockFarms.filter(f => f.productionModel === model);
}

export function getFarmsByRiskLevel(level: Farm['riskLevel']): Farm[] {
  return mockFarms.filter(f => f.riskLevel === level);
}

export function getCooperativeById(id: string): Cooperative | undefined {
  return mockCooperatives.find(c => c.id === id);
}

