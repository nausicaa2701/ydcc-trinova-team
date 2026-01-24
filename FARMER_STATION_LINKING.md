# Hệ thống liên kết Farmer ↔ Station và Recommendations

## Tổng quan

Hệ thống đã được mở rộng để liên kết nông dân (farmers) với các trạm quan trắc (stations) và cung cấp khuyến nghị tự động dựa trên dự báo AI về độ mặn.

## Các thành phần đã thêm

### 1. **Backend Utils: Geo Utils** ([backend/utils/geo_utils.py](backend/utils/geo_utils.py))

Công cụ tính toán địa lý:
- `haversine_distance()`: Tính khoảng cách giữa 2 điểm (lat/lon) theo km
- `find_nearest_stations()`: Tìm N trạm quan trắc gần nhất với vị trí cho trước
- `get_station_location()`: Lấy tọa độ của trạm (hiện tại hardcode HCM01-04)
- `is_location_in_polygon()`: Kiểm tra điểm có nằm trong vùng salinity boundary

### 2. **Models: Farmer Context** ([backend/models.py](backend/models.py))

Mở rộng `User` model với các field cho farmer:
- `lat`, `lon`: Vị trí trang trại
- `station_id`: Trạm quan trắc chính được gán
- `crop_type`: Loại cây trồng/con nuôi (lúa, tôm, rau...)
- `crop_stage`: Giai đoạn sinh trưởng (gieo mạ, đẻ nhánh, ra hoa...)
- `threshold_salinity`: Ngưỡng mặn tùy chỉnh (override coop default)
- `storage_capacity_m3`: Dung tích bể chứa nước

### 3. **Farmer API: Station Linking** ([backend/routers/farmers.py](backend/routers/farmers.py))

Endpoint mới:
```
GET /coops/{coop_id}/farmers/{farmer_id}/suggest-stations?top_n=3
```
- Tìm top N trạm gần nhất với farmer (hoặc coop center nếu farmer chưa có location)
- Trả về: station_id, distance_km, lat, lon
- Giúp admin/farmer chọn trạm phù hợp để theo dõi

### 4. **Recommendations API** ([backend/routers/recommendations.py](backend/routers/recommendations.py))

#### Endpoint cho 1 farmer:
```
GET /api/recommendations/farmers/{farmer_id}?horizon_days=7
```

**Response**: `FarmerRecommendation`
- `risk_level`: low/medium/high/critical
- `days_above_threshold`: Số ngày vượt ngưỡng
- `max_salinity_predicted`: Độ mặn cao nhất dự báo
- `recommendations`: Danh sách hành động gợi ý
- `safe_pumping_windows`: Lịch ngày an toàn/nguy hiểm

**Recommendations** (ActionRecommendation):
- `action`: allow_pumping | postpone_pumping | store_water | alert | harvest_early
- `priority`: low | medium | high | critical
- `reason`: Giải thích bằng tiếng Việt
- `valid_from`, `valid_until`: Khung thời gian áp dụng
- `details`: Thông tin chi tiết (số ngày, ngưỡng, crop...)

#### Endpoint cho toàn HTX:
```
GET /api/recommendations/coops/{coop_id}/farmers?horizon_days=7
```
- Trả về recommendations cho tất cả farmers trong hợp tác xã
- COOP_ADMIN xem farmers trong HTX của mình
- SYSTEM_ADMIN xem bất kỳ HTX nào

## Logic phân tích và gợi ý

### Phân tích độ mặn (`analyze_predictions_for_farmer`):

1. **Đếm ngày vượt ngưỡng**: So sánh predictions với threshold
2. **Xác định risk_level**:
   - low: max ≤ threshold
   - medium: 1-5 ngày vượt
   - high: 6-15 ngày vượt
   - critical: >15 ngày vượt

3. **Tìm safe pumping windows**: Chuỗi ngày liên tiếp an toàn (≤ threshold)

### Gợi ý hành động:

#### 1. **Bơm nước (Pumping)**
- ≤ 0 ngày vượt → `allow_pumping` (priority: low)
- 1-5 ngày vượt → `allow_pumping` trong khung an toàn (priority: medium)
- >5 ngày vượt → `postpone_pumping` (priority: high/critical)

#### 2. **Dự trữ nước (Storage)**
- Nếu farmer có `storage_capacity_m3` và >3 ngày xấu
- → `store_water`: bơm đầy trong 3 ngày an toàn đầu tiên (priority: high)

#### 3. **Cảnh báo theo cây trồng (Crop-specific)**
- **Lúa** nhạy mặn: nếu max > threshold+2 → `alert` (critical)
- **Tôm** cần mặn: nếu min < 2.0 → `alert` (medium)

#### 4. **Thu hoạch/chăm sóc (Crop stage)**
- Giai đoạn nhạy cảm (ra hoa, trổ) + risk high/critical → `alert` (critical)
- Giai đoạn chín + risk high → `harvest_early` (high)

## Cách sử dụng

### Bước 1: Tạo farmer với thông tin đầy đủ

```json
POST /coops/htx-hcm-001/farmers
{
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "lat": 10.75,
  "lon": 106.65,
  "crop_type": "lúa",
  "crop_stage": "đẻ nhánh",
  "threshold_salinity": 3.5,
  "storage_capacity_m3": 500
}
```

### Bước 2: Gợi ý trạm gần nhất

```
GET /coops/htx-hcm-001/farmers/{farmer_id}/suggest-stations?top_n=3

Response:
{
  "farmer_id": "farmer-abc123",
  "target_location": {"lat": 10.75, "lon": 106.65},
  "suggested_stations": [
    {"station_id": "HCM02", "distance_km": 2.34, ...},
    {"station_id": "HCM01", "distance_km": 5.67, ...}
  ],
  "current_station": null
}
```

### Bước 3: Cập nhật station_id cho farmer

```json
PUT /coops/htx-hcm-001/farmers/{farmer_id}
{
  "station_id": "HCM02"
}
```

### Bước 4: Lấy recommendations

```
GET /api/recommendations/farmers/{farmer_id}?horizon_days=30

Response:
{
  "farmer_id": "farmer-abc123",
  "farmer_name": "Nguyễn Văn A",
  "station_id": "HCM02",
  "threshold_salinity": 3.5,
  "crop_type": "lúa",
  "crop_stage": "đẻ nhánh",
  "risk_level": "high",
  "days_above_threshold": 12,
  "max_salinity_predicted": 10.5,
  "recommendations": [
    {
      "action": "postpone_pumping",
      "priority": "high",
      "reason": "Cảnh báo: 12/30 ngày vượt ngưỡng 3.5 g/L",
      "valid_from": "2026-01-28",
      "details": {...}
    },
    {
      "action": "store_water",
      "priority": "high",
      "reason": "Dự trữ nước trong 3 ngày an toàn trước khi mặn tăng",
      "valid_until": "2026-01-27",
      ...
    },
    {
      "action": "alert",
      "priority": "critical",
      "reason": "Giai đoạn nhạy cảm với mặn. Cần hành động ngay.",
      ...
    }
  ],
  "safe_pumping_windows": [
    {"date": "2026-01-24", "salinity": 5.2, "is_safe": false},
    {"date": "2026-01-25", "salinity": 3.1, "is_safe": true},
    ...
  ]
}
```

### Bước 5: Xem toàn bộ farmers trong HTX

```
GET /api/recommendations/coops/htx-hcm-001/farmers?horizon_days=7
```

## Tích hợp với n8n

Agent n8n có thể:

1. **Tự động gợi ý trạm** khi tạo farmer mới
2. **Định kỳ lấy recommendations** (mỗi ngày/tuần)
3. **Gửi thông báo** khi priority = critical/high:
   - SMS/Zalo cho farmer
   - Dashboard alert cho coop admin
4. **Trigger workflow** khi:
   - risk_level thay đổi (low→high)
   - Có action `harvest_early` hoặc `postpone_pumping`

### Ví dụ n8n workflow:

```
Cron (daily 6AM)
  → HTTP Request: GET /api/recommendations/coops/{coop_id}/farmers
  → Filter: priority = "critical" OR "high"
  → Split: foreach farmer
    → If: action = "postpone_pumping" → Send Zalo message
    → If: action = "harvest_early" → Create task for coop admin
    → If: action = "alert" → Log to dashboard
```

## TODO / Cải tiến

1. **Real station coordinates**: Thay vì hardcode, load từ database/CSV với lat/lon chính xác
2. **Dynamic thresholds**: Tự động điều chỉnh ngưỡng theo crop_type/stage từ bảng lookup
3. **Historical accuracy**: Log predictions vs actual để cải thiện confidence
4. **Multi-station support**: Farmer có thể theo dõi nhiều trạm với trọng số khác nhau
5. **Cost-benefit analysis**: Tính toán chi phí/lợi ích của việc bơm vs chờ
6. **Weather integration**: Kết hợp dự báo mưa để điều chỉnh storage recommendations
7. **Cooperative coordination**: Gợi ý phối hợp bơm theo nhóm để tiết kiệm chi phí

## Testing

Để test hệ thống:

```bash
# 1. Khởi động backend
cd backend
uvicorn main:app --reload

# 2. Tạo farmer với context
curl -X POST http://localhost:8000/coops/htx-hcm-001/farmers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Farmer","phone":"0909090909","lat":10.75,"lon":106.65,"station_id":"HCM02","crop_type":"lúa","threshold_salinity":3.5}'

# 3. Lấy recommendations
curl http://localhost:8000/api/recommendations/farmers/{farmer_id}?horizon_days=30 \
  -H "Authorization: Bearer <token>"
```

## Kết luận

Hệ thống đã hoàn chỉnh tính năng liên kết farmer → station và cung cấp recommendations tự động. Agent (n8n hoặc LLM) có thể dùng các endpoint này để:
- Tự động suggest actions cho từng farmer
- Gửi thông báo ưu tiên theo risk level
- Tạo lịch tưới/bơm tối ưu
- Hỗ trợ quyết định thu hoạch/gieo trồng
