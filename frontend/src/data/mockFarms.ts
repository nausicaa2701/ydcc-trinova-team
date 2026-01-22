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

// TP. Hồ Chí Minh coordinates (center)
const HCM_BASE_LNG = 106.7;
const HCM_BASE_LAT = 10.8;

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
    id: 'htx-hcm-001',
    name: 'HTX Nông nghiệp-Dịch vụ Phước Long',
    location: 'Quận 9, TP. Hồ Chí Minh',
    totalFarms: 25,
    totalArea: 65.5,
    averageRiskScore: 42,
    affectedFarms: 10,
  },
  {
    id: 'htx-hcm-002',
    name: 'HTX Nông nghiệp-Dịch vụ Linh Xuân',
    location: 'Thủ Đức, TP. Hồ Chí Minh',
    totalFarms: 28,
    totalArea: 72.3,
    averageRiskScore: 38,
    affectedFarms: 11,
  },
  {
    id: 'htx-hcm-003',
    name: 'HTX Nông nghiệp-Dịch vụ Hiệp Bình Chánh',
    location: 'Thủ Đức, TP. Hồ Chí Minh',
    totalFarms: 22,
    totalArea: 58.7,
    averageRiskScore: 45,
    affectedFarms: 9,
  },
  {
    id: 'htx-hcm-004',
    name: 'HTX Nông nghiệp-Dịch vụ Bình Chiểu',
    location: 'Thủ Đức, TP. Hồ Chí Minh',
    totalFarms: 30,
    totalArea: 78.2,
    averageRiskScore: 40,
    affectedFarms: 12,
  },
  {
    id: 'htx-hcm-005',
    name: 'HTX Nông nghiệp-Dịch vụ Hiệp Bình Phước',
    location: 'Thủ Đức, TP. Hồ Chí Minh',
    totalFarms: 26,
    totalArea: 68.9,
    averageRiskScore: 43,
    affectedFarms: 11,
  },
  {
    id: 'htx-hcm-006',
    name: 'HTX Sản xuất-Dịch vụ nông nghiệp Bình Lợi',
    location: 'Bình Chánh, TP. Hồ Chí Minh',
    totalFarms: 32,
    totalArea: 85.4,
    averageRiskScore: 52,
    affectedFarms: 16,
  },
  {
    id: 'htx-hcm-007',
    name: 'HTX Nông nghiệp Hoà Lộc',
    location: 'Bình Chánh, TP. Hồ Chí Minh',
    totalFarms: 24,
    totalArea: 62.1,
    averageRiskScore: 48,
    affectedFarms: 11,
  },
  {
    id: 'htx-hcm-008',
    name: 'HTXNN An Bình',
    location: 'Bình Chánh, TP. Hồ Chí Minh',
    totalFarms: 20,
    totalArea: 55.8,
    averageRiskScore: 44,
    affectedFarms: 9,
  },
  {
    id: 'htx-hcm-009',
    name: 'HTX NN Trang trại An Hạ',
    location: 'Bình Chánh, TP. Hồ Chí Minh',
    totalFarms: 18,
    totalArea: 48.3,
    averageRiskScore: 46,
    affectedFarms: 8,
  },
  {
    id: 'htx-hcm-010',
    name: 'HTX Nông nghiệp-Dịch vụ thương mại Phú Lợi',
    location: 'Quận 8, TP. Hồ Chí Minh',
    totalFarms: 27,
    totalArea: 71.6,
    averageRiskScore: 50,
    affectedFarms: 13,
  },
  {
    id: 'htx-hcm-011',
    name: 'HTX Nông nghiệp Chiến Thắng',
    location: 'Quận 8, TP. Hồ Chí Minh',
    totalFarms: 29,
    totalArea: 76.2,
    averageRiskScore: 47,
    affectedFarms: 13,
  },
  {
    id: 'htx-hcm-012',
    name: 'HTX Nông Nghiệp Dịch Vụ Thương Mại Phú Sơn',
    location: 'Quận 8, TP. Hồ Chí Minh',
    totalFarms: 31,
    totalArea: 82.5,
    averageRiskScore: 49,
    affectedFarms: 15,
  },
  {
    id: 'htx-hcm-013',
    name: 'HTX nuôi trồng thuỷ sản Hữu Nghị',
    location: 'Củ Chi, TP. Hồ Chí Minh',
    totalFarms: 22,
    totalArea: 58.4,
    averageRiskScore: 55,
    affectedFarms: 12,
  },
  {
    id: 'htx-hcm-014',
    name: 'HTX Nông nghiệp-Tiểu thủ công nghiệp Mỹ Khánh B',
    location: 'Củ Chi, TP. Hồ Chí Minh',
    totalFarms: 25,
    totalArea: 66.7,
    averageRiskScore: 42,
    affectedFarms: 10,
  },
  {
    id: 'htx-hcm-015',
    name: 'HTX Sản xuất Rau an toàn Tân Phú Trung',
    location: 'Củ Chi, TP. Hồ Chí Minh',
    totalFarms: 28,
    totalArea: 74.3,
    averageRiskScore: 35,
    affectedFarms: 9,
  },
  {
    id: 'htx-hcm-016',
    name: 'HTX nuôi trồng thuỷ sản Hà Quang',
    location: 'Củ Chi, TP. Hồ Chí Minh',
    totalFarms: 23,
    totalArea: 61.2,
    averageRiskScore: 58,
    affectedFarms: 13,
  },
  {
    id: 'htx-hcm-017',
    name: 'HTX Thủy sản Tương Lai',
    location: 'Củ Chi, TP. Hồ Chí Minh',
    totalFarms: 26,
    totalArea: 69.8,
    averageRiskScore: 53,
    affectedFarms: 13,
  },
  {
    id: 'htx-hcm-018',
    name: 'HTX DVNN Ba Lúa Vàng',
    location: 'Củ Chi, TP. Hồ Chí Minh',
    totalFarms: 24,
    totalArea: 63.5,
    averageRiskScore: 45,
    affectedFarms: 10,
  },
  {
    id: 'htx-hcm-019',
    name: 'HTX NN Trần Hưng Đạo',
    location: 'Cần Giờ, TP. Hồ Chí Minh',
    totalFarms: 20,
    totalArea: 52.9,
    averageRiskScore: 62,
    affectedFarms: 12,
  },
  {
    id: 'htx-hcm-020',
    name: 'HTX Nông nghiệp Xuân Lộc',
    location: 'Quận 12, TP. Hồ Chí Minh',
    totalFarms: 27,
    totalArea: 70.4,
    averageRiskScore: 41,
    affectedFarms: 11,
  },
];

const productionModels: ProductionModel[] = ['rice', 'shrimp', 'rice-shrimp', 'fruit', 'other'];

export const mockFarms: Farm[] = [];

// District coordinates for TPHCM (approximate centers)
const DISTRICT_COORDS: Record<string, [number, number]> = {
  'Quận 9': [106.8099, 10.8422],
  'Thủ Đức': [106.7637, 10.8497],
  'Bình Chánh': [106.6067, 10.6994],
  'Quận 8': [106.629, 10.74],
  'Củ Chi': [106.4967, 11.1572],
  'Cần Giờ': [106.9547, 10.4114],
  'Quận 12': [106.6544, 10.8639],
};

// Generate farms for each cooperative in TPHCM
mockCooperatives.forEach((coop, coopIndex) => {
  const farmsPerCoop = coop.totalFarms;
  
  // Extract district from location (format: "Quận/Huyện, TP. Hồ Chí Minh")
  const district = coop.location.split(',')[0].trim();
  const districtCoords = DISTRICT_COORDS[district] || [HCM_BASE_LNG, HCM_BASE_LAT];
  const baseLng = districtCoords[0];
  const baseLat = districtCoords[1];
  
  // Spread farms around district center
  for (let i = 0; i < farmsPerCoop; i++) {
    const row = Math.floor(i / 7);
    const col = i % 7;
    // Smaller spread for TPHCM (more compact)
    const lng = baseLng + (col - 3) * 0.008;
    const lat = baseLat + (row - 2) * 0.008;
    
    const area = 1.5 + Math.random() * 3; // 1.5-4.5 hectares
    const riskScore = Math.round(20 + Math.random() * 60); // 20-80
    
    mockFarms.push({
      id: `farm-${coop.id}-${i + 1}`,
      name: `Hộ ${i + 1}`,
      cooperativeId: coop.id,
      cooperativeName: coop.name,
      location: {
        type: 'Polygon',
        coordinates: generateFarmPolygon(lng, lat, 0.006), // Smaller polygons for TPHCM
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

