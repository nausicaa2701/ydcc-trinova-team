import { create } from 'zustand';
import { Farm, Cooperative, RiskLevel, ProductionModel } from '@/types';

export type ActiveTab = 'salinity-map' | 'producers-coops' | 'decision-support';

interface AppState {
  // Active tab
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  
  // Selected date for forecast
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  
  // Selected farm
  selectedFarm: Farm | null;
  setSelectedFarm: (farm: Farm | null) => void;
  
  // Filters
  selectedCooperative: string | null;
  setSelectedCooperative: (id: string | null) => void;
  
  selectedProductionModel: ProductionModel | null;
  setSelectedProductionModel: (model: ProductionModel | null) => void;
  
  selectedRiskLevel: RiskLevel | null;
  setSelectedRiskLevel: (level: RiskLevel | null) => void;
  
  // Map view state
  showBoundaries: boolean;
  setShowBoundaries: (show: boolean) => void;
  
  showRiskHeatmap: boolean;
  setShowRiskHeatmap: (show: boolean) => void;
  
  showFarms: boolean;
  setShowFarms: (show: boolean) => void;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  decisionSupportViewMode: 'overview' | 'trend' | 'storage' | 'mitigation';
  setDecisionSupportViewMode: (mode: 'overview' | 'trend' | 'storage' | 'mitigation') => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'salinity-map',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  selectedFarm: null,
  setSelectedFarm: (farm) => set({ selectedFarm: farm }),
  
  selectedCooperative: null,
  setSelectedCooperative: (id) => set({ selectedCooperative: id }),
  
  selectedProductionModel: null,
  setSelectedProductionModel: (model) => set({ selectedProductionModel: model }),
  
  selectedRiskLevel: null,
  setSelectedRiskLevel: (level) => set({ selectedRiskLevel: level }),
  
  showBoundaries: true,
  setShowBoundaries: (show) => set({ showBoundaries: show }),
  
  showRiskHeatmap: true,
  setShowRiskHeatmap: (show) => set({ showRiskHeatmap: show }),
  
  showFarms: true,
  setShowFarms: (show) => set({ showFarms: show }),
  
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  decisionSupportViewMode: 'overview',
  setDecisionSupportViewMode: (mode) => set({ decisionSupportViewMode: mode }),
}));

