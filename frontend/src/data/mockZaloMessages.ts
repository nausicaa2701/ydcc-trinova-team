export interface ZaloMessage {
  id: string
  farmerName: string
  farmerPhone: string
  lat: number
  lon: number
  stationId: string
  businessType: string[]
  sentDate: string
  predictions: number[] // 7 ngày dự báo độ mặn (g/L)
  newsHighlights: string[]
  daysAboveThreshold: number // Số ngày vượt ngưỡng
  maxSalinityDay: number // Ngày có độ mặn cao nhất (1-7)
  maxSalinityValue: number // Giá trị mặn cao nhất
  dangerLevel: 'low' | 'medium' | 'high' | 'critical'
  actionPlan: ActionPlan[]
}

export interface ActionPlan {
  action: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  recommendedDays: number[] // Các ngày nên thực hiện (1-7)
  avoidDays: number[] // Các ngày nên tránh (1-7)
}

const THRESHOLD_1PPT = 1.0 // Ngưỡng cảnh báo
const THRESHOLD_4PPT = 4.0 // Ngưỡng nguy hiểm

function calculateDangerLevel(predictions: number[]): 'low' | 'medium' | 'high' | 'critical' {
  const maxSalinity = Math.max(...predictions)
  const daysAbove4 = predictions.filter(p => p >= THRESHOLD_4PPT).length
  const daysAbove1 = predictions.filter(p => p >= THRESHOLD_1PPT).length

  if (maxSalinity >= THRESHOLD_4PPT || daysAbove4 >= 3) {
    return 'critical'
  }
  if (maxSalinity >= THRESHOLD_4PPT || daysAbove4 >= 1) {
    return 'high'
  }
  if (daysAbove1 >= 3 || maxSalinity >= THRESHOLD_1PPT) {
    return 'medium'
  }
  return 'low'
}

function generateActionPlan(predictions: number[], dangerLevel: string): ActionPlan[] {
  const actions: ActionPlan[] = []
  const safeDays = predictions.map((p, i) => p < THRESHOLD_1PPT ? i + 1 : 0).filter(d => d > 0)
  const dangerDays = predictions.map((p, i) => p >= THRESHOLD_4PPT ? i + 1 : 0).filter(d => d > 0)

  // Water Intake - Bơm nước
  if (safeDays.length > 0) {
    actions.push({
      action: 'Bơm nước',
      priority: dangerLevel === 'critical' ? 'CRITICAL' : dangerLevel === 'high' ? 'HIGH' : 'MEDIUM',
      description: 'Bơm nước ngọt vào hồ chứa trong các ngày an toàn',
      recommendedDays: safeDays.slice(0, 3),
      avoidDays: dangerDays
    })
  }

  // Water Storage - Dự trữ nước
  if (dangerLevel === 'critical' || dangerLevel === 'high') {
    actions.push({
      action: 'Dự trữ nước',
      priority: 'CRITICAL',
      description: 'Bơm đầy hồ chứa trước khi độ mặn tăng cao. Ước tính cần 50-100 m³',
      recommendedDays: safeDays.slice(0, 2),
      avoidDays: dangerDays
    })
  }

  // Flood Prevention - Phòng chống ngập
  if (dangerLevel === 'high' || dangerLevel === 'critical') {
    actions.push({
      action: 'Phòng chống ngập',
      priority: 'HIGH',
      description: 'Kiểm tra kênh, cống xả, hệ thống thoát nước để tránh nước mặn tràn vào',
      recommendedDays: [1, 2],
      avoidDays: []
    })
  }

  // Irrigation - Điều chỉnh tưới
  if (dangerDays.length > 0) {
    actions.push({
      action: 'Điều chỉnh tưới',
      priority: 'HIGH',
      description: 'Giảm tưới khi độ mặn cao, sử dụng nước dự trữ',
      recommendedDays: safeDays,
      avoidDays: dangerDays
    })
  }

  // Salinity Management - Kiểm soát nước mặn
  if (dangerLevel === 'medium' || dangerLevel === 'high' || dangerLevel === 'critical') {
    actions.push({
      action: 'Kiểm soát nước mặn',
      priority: dangerLevel === 'critical' ? 'CRITICAL' : 'HIGH',
      description: 'Trộn nước ngọt nếu có, xả nước mặn ra khỏi hệ thống',
      recommendedDays: safeDays,
      avoidDays: dangerDays
    })
  }

  // Harvest Plan - Chuẩn bị thu hoạch
  if (dangerLevel === 'critical') {
    actions.push({
      action: 'Chuẩn bị thu hoạch',
      priority: 'CRITICAL',
      description: 'Nếu nguy cấp, cân nhắc thu hoạch sớm để tránh thiệt hại',
      recommendedDays: safeDays.slice(0, 2),
      avoidDays: []
    })
  }

  return actions
}

// Mock data generators
const farmerNames = [
  'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Văn Cường', 'Phạm Thị Dung',
  'Hoàng Văn Em', 'Vũ Thị Phương', 'Đặng Văn Giang', 'Bùi Thị Hoa',
  'Đỗ Văn Hùng', 'Ngô Thị Lan', 'Phan Văn Minh', 'Võ Thị Nga'
]

const businessTypes = [
  ['trồng lúa', 'nuôi tôm'],
  ['trồng lúa'],
  ['nuôi tôm'],
  ['trồng lúa', 'nuôi cá'],
  ['nuôi tôm', 'nuôi cá']
]

const stations = ['ST001', 'ST002', 'ST003', 'ST004', 'ST005']

const newsHighlights = [
  'Triều cường dự báo tăng cao vào cuối tuần',
  'Lượng mưa giảm, nguồn nước ngọt hạn chế',
  'Cảnh báo độ mặn tăng tại các cửa sông',
  'Khuyến nghị tích trữ nước ngọt sớm',
  'Hệ thống cảnh báo sớm đã phát hiện nguy cơ'
]

function generateMockPredictions(): number[] {
  // Tạo dự báo 7 ngày với xu hướng tăng dần
  const base = Math.random() * 0.5 + 0.2
  const trend = Math.random() * 0.1 - 0.05
  return Array.from({ length: 7 }, (_, i) => {
    const value = base + trend * i + (Math.random() * 0.3 - 0.15)
    return Math.max(0.1, Math.min(5.0, value))
  })
}

export function generateMockZaloMessages(count: number = 10): ZaloMessage[] {
  const messages: ZaloMessage[] = []
  const today = new Date()

  for (let i = 0; i < count; i++) {
    const predictions = generateMockPredictions()
    const maxSalinity = Math.max(...predictions)
    const maxDay = predictions.indexOf(maxSalinity) + 1
    const daysAboveThreshold = predictions.filter(p => p >= THRESHOLD_1PPT).length
    const dangerLevel = calculateDangerLevel(predictions)
    const actionPlan = generateActionPlan(predictions, dangerLevel)

    // Random date trong 7 ngày qua
    const daysAgo = Math.floor(Math.random() * 7)
    const sentDate = new Date(today)
    sentDate.setDate(today.getDate() - daysAgo)

    messages.push({
      id: `msg-${i + 1}`,
      farmerName: farmerNames[Math.floor(Math.random() * farmerNames.length)],
      farmerPhone: `0${Math.floor(Math.random() * 900000000) + 100000000}`,
      lat: 10.0 + Math.random() * 0.5,
      lon: 106.0 + Math.random() * 0.5,
      stationId: stations[Math.floor(Math.random() * stations.length)],
      businessType: businessTypes[Math.floor(Math.random() * businessTypes.length)],
      sentDate: sentDate.toISOString().split('T')[0],
      predictions,
      newsHighlights: newsHighlights.slice(0, Math.floor(Math.random() * 3) + 1),
      daysAboveThreshold,
      maxSalinityDay: maxDay,
      maxSalinityValue: maxSalinity,
      dangerLevel,
      actionPlan
    })
  }

  return messages.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime())
}

export const mockZaloMessages: ZaloMessage[] = generateMockZaloMessages(15)
