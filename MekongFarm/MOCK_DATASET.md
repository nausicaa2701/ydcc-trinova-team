# Mock Dataset cho Testing

Tài liệu này mô tả bộ dữ liệu mock được sử dụng để test đăng nhập và phân quyền trong hệ thống.

## Tổng quan

Hệ thống có 3 loại người dùng:
- **SYSTEM_ADMIN**: Quản trị viên hệ thống
- **COOP_ADMIN**: Quản trị viên Hợp tác xã (HTX)
- **FARMER**: Nông dân/Hộ sản xuất

## Hợp tác xã (Cooperatives)

| ID | Tên | Tỉnh | Vị trí | Trạng thái |
|---|---|---|---|---|
| htx-tg-001 | Hợp tác xã Nông nghiệp Mỹ Tho | Tiền Giang | 10.36, 106.36 | active |
| htx-tg-002 | Hợp tác xã Tôm - Lúa Cái Bè | Tiền Giang | 10.41, 105.97 | active |
| htx-tg-003 | Hợp tác xã Cây ăn trái Gò Công | Tiền Giang | 10.36, 106.66 | active |
| htx-tg-004 | Hợp tác xã Lúa - Tôm Tân Phú Đông | Tiền Giang | 10.25, 106.50 | active |

## Tài khoản System Admin

| Phone | Password | Tên | Role |
|---|---|---|---|
| 0900000001 | admin123 | Nguyễn Văn Admin | SYSTEM_ADMIN |
| 0900000010 | admin123 | Trần Thị Quản Trị | SYSTEM_ADMIN |

**Quyền hạn:**
- Xem tất cả HTX và nông dân
- Quản lý HTX (CRUD)
- Xem phân tích tổng thể
- Truy cập tất cả routes `/admin/*`

## Tài khoản HTX Admin

| Phone | Password | Tên | HTX | Role |
|---|---|---|---|---|
| 0900000002 | coop123 | Lê Văn HTX Mỹ Tho | htx-tg-001 | COOP_ADMIN |
| 0900000011 | coop123 | Phạm Thị HTX Cái Bè | htx-tg-002 | COOP_ADMIN |
| 0900000020 | coop123 | Hoàng Văn HTX Gò Công | htx-tg-003 | COOP_ADMIN |
| 0900000021 | coop123 | Võ Thị HTX Tân Phú Đông | htx-tg-004 | COOP_ADMIN |

**Quyền hạn:**
- Quản lý nông dân trong HTX của mình
- Cấu hình cảnh báo cho HTX
- Xem dữ liệu và phân tích của HTX
- Truy cập routes `/coop/*`

## Tài khoản Farmer

### HTX Mỹ Tho (htx-tg-001)

| Phone | Password | Tên | HTX | Role |
|---|---|---|---|---|
| 0900000003 | farmer123 | Nguyễn Văn A | htx-tg-001 | FARMER |
| 0900000004 | farmer123 | Trần Thị B | htx-tg-001 | FARMER |
| 0900000005 | farmer123 | Lê Văn C | htx-tg-001 | FARMER |

### HTX Cái Bè (htx-tg-002)

| Phone | Password | Tên | HTX | Role |
|---|---|---|---|---|
| 0900000012 | farmer123 | Phạm Văn D | htx-tg-002 | FARMER |
| 0900000013 | farmer123 | Hoàng Thị E | htx-tg-002 | FARMER |

### HTX Gò Công (htx-tg-003)

| Phone | Password | Tên | HTX | Role |
|---|---|---|---|---|
| 0900000022 | farmer123 | Võ Văn F | htx-tg-003 | FARMER |
| 0900000023 | farmer123 | Đặng Thị G | htx-tg-003 | FARMER |

### HTX Tân Phú Đông (htx-tg-004)

| Phone | Password | Tên | HTX | Role |
|---|---|---|---|---|
| 0900000030 | farmer123 | Bùi Văn H | htx-tg-004 | FARMER |
| 0900000031 | farmer123 | Ngô Thị I | htx-tg-004 | FARMER |

**Quyền hạn:**
- Xem dự báo mặn và rủi ro cho khu vực của mình
- Xem thông tin cá nhân
- Nhận cảnh báo từ HTX
- Truy cập routes `/farmer/*`

## Cấu hình Cảnh báo (Alert Configs)

Mỗi HTX có cấu hình cảnh báo riêng:

| HTX ID | Ngưỡng độ mặn (g/L) | Thông báo tất cả nông dân |
|---|---|---|
| htx-tg-001 | 4.0 | ✅ |
| htx-tg-002 | 3.5 | ✅ |
| htx-tg-003 | 2.0 | ✅ |
| htx-tg-004 | 3.0 | ✅ |

## Cách sử dụng để test

### Test đăng nhập

1. **System Admin:**
   ```
   Phone: 0900000001
   Password: admin123
   ```
   → Sau khi đăng nhập sẽ redirect đến `/admin/dashboard`

2. **HTX Admin:**
   ```
   Phone: 0900000002
   Password: coop123
   ```
   → Sau khi đăng nhập sẽ redirect đến `/coop/dashboard`

3. **Farmer:**
   ```
   Phone: 0900000003
   Password: farmer123
   ```
   → Sau khi đăng nhập sẽ redirect đến `/farmer/dashboard`

### Test phân quyền

- **System Admin** có thể:
  - Xem tất cả HTX trong `/admin/coops`
  - Tạo/sửa/xóa HTX
  - Xem tất cả nông dân

- **HTX Admin** chỉ có thể:
  - Xem và quản lý nông dân trong HTX của mình
  - Cấu hình cảnh báo cho HTX của mình
  - Không thể truy cập `/admin/*`

- **Farmer** chỉ có thể:
  - Xem dự báo mặn và rủi ro
  - Xem thông tin cá nhân
  - Không thể truy cập `/admin/*` hoặc `/coop/*`

## Lưu ý

- Tất cả mật khẩu đều được hash bằng SHA256
- Trong production, nên sử dụng bcrypt hoặc argon2
- Database hiện tại là in-memory, sẽ mất dữ liệu khi restart server
- Cần migrate sang SQLite hoặc PostgreSQL cho production
