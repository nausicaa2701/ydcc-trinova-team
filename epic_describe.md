

# EPIC: AI-DRIVEN SALT INTRUSION MAP

## Integrated Farm & Cooperative Management Platform for Mekong Delta

---

## 1. Epic Overview

### Epic Name

**AI-Driven Salt Intrusion Map with Farm & Cooperative Management**

### Epic Goal

Xây dựng một nền tảng web ứng dụng tích hợp AI giúp **dự báo xâm nhập mặn theo không gian – thời gian**, liên kết trực tiếp với **thông tin hộ sản xuất và hợp tác xã**, nhằm hỗ trợ doanh nghiệp và địa phương **ra quyết định sản xuất sớm, chính xác và dựa trên dữ liệu**.

---

## 2. Problem Statement (Context)

Đồng bằng Sông Cửu Long đang chịu ảnh hưởng ngày càng nghiêm trọng của xâm nhập mặn do:

* Biến đổi khí hậu
* Mực nước biển dâng
* Suy giảm dòng chảy thượng nguồn

Hiện nay:

* Dữ liệu mặn tồn tại rời rạc (trạm đo, bản tin)
* Thiếu công cụ tổng hợp theo **không gian – thời gian**
* Thiếu liên kết giữa **dự báo thủy văn** và **đối tượng sản xuất thực tế (hộ/HTX)**

➡️ Doanh nghiệp và HTX **khó phản ứng kịp thời**, dẫn đến thiệt hại kinh tế và rủi ro sản xuất cao.

---

## 3. Solution Overview

Hệ thống đề xuất là một **AI-Driven Salt Intrusion Map**, tích hợp vào webapp Farm / nền tảng quản trị vùng nguyên liệu, gồm 3 trụ cột chính:

1. **AI Prediction Layer** – Dự báo và lượng hóa rủi ro mặn
2. **Farm & Cooperative Management Layer** – Quản lý hộ, HTX, vùng sản xuất
3. **Frontend Visualization Layer** – Trực quan hóa bản đồ và rủi ro để hỗ trợ quyết định

---

# 4. EPIC STRUCTURE

---

## EPIC 1: AI / ML PREDICTION LAYER

### 4.1 Description

AI layer chịu trách nhiệm:

* Thu thập và xử lý dữ liệu thủy văn – khí hậu – GIS
* Ứng dụng mô hình **time-series** và **spatio-temporal AI**
* Dự báo:

  * Ranh mặn **1‰ và 4‰**
  * Theo **ngày / tuần**
* Tính toán **risk score (0–100)** cho từng vùng trong **7–30 ngày**
* Expose kết quả qua **API chuẩn hóa** để FE và n8n sử dụng

AI layer là **lõi trí tuệ độc lập**, không chứa logic nghiệp vụ hộ/HTX.

---

### 4.2 AI Tech Stack

**Core**

* Python 3.10+
* PyTorch, PyTorch Lightning

**Models**

* LSTM / GRU
* Temporal Transformer
* ConvLSTM
* Graph Neural Network (PyTorch Geometric)

**Data & GIS**

* Pandas, NumPy
* GeoPandas, Shapely, Rasterio

**Model Ops**

* MLflow (tracking & versioning)
* Docker (model serving)
* FastAPI (inference API)

---

### 4.3 Acceptance Criteria – AI Layer

####  Data & Preprocessing

* [ ] Ingest được dữ liệu mặn, mực nước, lưu lượng, mưa, triều
* [ ] Hỗ trợ dữ liệu không gian (GIS)
* [ ] Dữ liệu được đồng bộ theo thời gian và không gian

####  Prediction

* [ ] Dự báo được ranh mặn 1‰ và 4‰
* [ ] Hỗ trợ horizon tối thiểu 7 ngày, tối đa 30 ngày
* [ ] Áp dụng spatio-temporal modeling

####  Risk Scoring

* [ ] Sinh risk score (0–100)
* [ ] Risk score phản ánh cường độ + thời gian phơi nhiễm mặn
* [ ] Có thể truy vấn theo thời gian và khu vực

####  API Output

* [ ] API trả về:

  * GeoJSON ranh mặn
  * Risk surface / risk score
  * Confidence metadata
* [ ] API có thể được n8n consume trực tiếp

---

## EPIC 2: FARM & COOPERATIVE (HỘ / HTX) MANAGEMENT

### 5.1 Description

Module này quản lý **đối tượng sản xuất thực tế**, đóng vai trò cầu nối giữa AI và quyết định vận hành.

Chức năng:

* Quản lý **Hợp tác xã**
* Quản lý **Hộ sản xuất**
* Gắn mỗi hộ với:

  * Polygon vùng canh tác/ao nuôi
  * Mô hình sản xuất (lúa, tôm, lúa–tôm…)
* Liên kết kết quả AI để:

  * Tính **risk score ở cấp hộ**
  * Tổng hợp rủi ro theo HTX

---

### 5.2 Tech Stack (Business Layer)

* Backend service: FastAPI / Node.js
* Database:

  * PostgreSQL + PostGIS
* Spatial processing:

  * GeoJSON, spatial join
* API-first design

---

### 5.3 Acceptance Criteria – Hộ / HTX

####  Data Model

* [ ] Mỗi HTX có ID, tên, địa bàn
* [ ] Mỗi hộ có:

  * ID
  * Thuộc HTX
  * Polygon vị trí
  * Diện tích
  * Mô hình sản xuất

####  AI Integration

* [ ] Gán được risk score cho từng hộ
* [ ] Risk score tính dựa trên:

  * Polygon hộ
  * Kết quả AI
* [ ] Truy vấn được risk theo hộ / HTX / thời gian

####  Aggregation

* [ ] Tổng hợp:

  * Số hộ bị ảnh hưởng
  * Tổng diện tích rủi ro
* [ ] So sánh rủi ro giữa các HTX

---

## EPIC 3: FRONTEND VISUALIZATION (VITE + REACT)

### 6.1 Description

Frontend là lớp:

* Trực quan hóa kết quả AI
* Hiển thị rủi ro theo bản đồ
* Hỗ trợ người dùng hiểu và ra quyết định

FE **không xử lý AI logic, không xử lý alert**.

---

### 6.2 Frontend Tech Stack

* Vite + React 18
* TypeScript
* State:

  * Zustand
  * TanStack Query
* GIS:

  * Mapbox GL JS
  * Deck.gl
* UI:

  * Tailwind CSS
  * shadcn/ui
* Charts:

  * Recharts / D3.js

---

### 6.3 Acceptance Criteria – FE

####  Core UI

* [ ] Dashboard web responsive
* [ ] Tách rõ map view, risk view, farm view

####  Map Visualization

* [ ] Hiển thị ranh mặn 1‰, 4‰
* [ ] Heatmap mặn theo thời gian
* [ ] Time slider cho forecast

####  Hộ / HTX Interaction

* [ ] Hiển thị polygon hộ
* [ ] Click hộ → xem thông tin + risk
* [ ] Filter theo HTX, mô hình sản xuất, mức rủi ro

####  Data Handling

* [ ] Consume AI API
* [ ] Loading & error state rõ ràng

---

## 7. Out of Scope (Explicit)

*  Alert rule engine
*  Notification channels
 Được xử lý bên ngoài bằng **n8n** thông qua API

---

## 8. Impact & Future Vision Alignment

* Giảm thiệt hại do xâm nhập mặn
* Tối ưu quản lý vùng nguyên liệu
* Làm nền tảng cho:

  * ESG reporting
  * Policy & planning module
  * Climate adaptation & mangrove restoration

---

## 🔑 EPIC SUMMARY (1 câu)

> **Hệ thống kết hợp AI dự báo xâm nhập mặn với quản lý hộ và HTX, giúp biến dữ liệu khí hậu phức tạp thành quyết định sản xuất cụ thể, kịp thời và bền vững cho ĐBSCL.**
