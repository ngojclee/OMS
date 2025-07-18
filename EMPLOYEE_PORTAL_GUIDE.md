# 🔐 Employee Portal - Hướng dẫn sử dụng

## Tổng quan
Employee Portal cho phép nhân viên truy cập vào hệ thống thông qua token-based authentication để:
- Xem các task được giao cho mình
- Đánh dấu hoàn thành/bỏ hoàn thành task
- Upload hình ảnh kết quả
- Tra cứu task theo ngày và filter trạng thái

## 🚀 Cài đặt và Cấu hình

### 1. Chuẩn bị Settings Sheet
Trong Google Sheets, đảm bảo có sheet tên `setting` với cấu trúc:
- **Column F (index 5)**: Employee Name (My Nguyen, Tuyen Phan, etc.)
- **Column G (index 6)**: Sheet Name (Task_My Nguyen, Task_Tuyen Phan, etc.)
- **Column H (index 7)**: Status (Active/Inactive)
- **Column I (index 8)**: Role (Artist, Manager, etc.)
- **Column N (index 13)**: Employee Token (sẽ được tạo tự động)

### 2. Tạo Tokens cho Nhân viên
Chạy function `generateEmployeeTokens()` trong Apps Script:

```javascript
// Trong Apps Script Editor
function runGenerateTokens() {
  const result = generateEmployeeTokens();
  console.log(result);
}
```

Hoặc từ trang admin employee-tasks.html, thêm button:
```html
<button onclick="generateTokens()" class="btn-panel">🔑 Tạo tokens</button>
```

### 3. Phân phối Links/QR Codes
Sau khi tạo tokens, bạn sẽ nhận được:
- **URL**: `?page=employee-portal&token=abc123def456`
- **QR Data**: Full URL để tạo QR code
- **Employee Info**: Tên và token tương ứng

## 📱 Cách Nhân viên Sử dụng

### 1. Truy cập Portal
Nhân viên có thể truy cập bằng:
- **Link trực tiếp**: Click vào link được gửi
- **QR Code**: Scan QR code bằng điện thoại
- **Manual**: Gõ URL với token

### 2. Giao diện Employee Portal
- **Header**: Hiển thị tên nhân viên và vai trò
- **Controls**: Chọn ngày, filter trạng thái
- **Stats**: Tổng quan task (tổng, chưa xong, đã xong, quá hạn)
- **Task Cards**: Danh sách task với thông tin chi tiết

### 3. Tính năng có sẵn
- ✅ **Xem task riêng**: Chỉ thấy task của mình
- ✅ **Đánh dấu hoàn thành**: Click vào trạng thái hoặc chọn nhiều task
- ✅ **Upload kết quả**: Upload hình ảnh kết quả (max 10MB)
- ✅ **Tra cứu ngày**: Filter theo khoảng thời gian
- ✅ **Filter trạng thái**: Chưa xong, đã xong, tất cả
- ✅ **Responsive**: Tối ưu cho mobile

### 4. Tính năng KHÔNG có (khác với admin)
- ❌ **Xác nhận giao đơn**: Chỉ admin mới có
- ❌ **Xem task người khác**: Chỉ thấy task của mình
- ❌ **Quản lý nhân viên**: Chỉ admin mới có

## 🔧 Quản lý Admin

### 1. Tạo mới Token
```javascript
// Tạo token cho một nhân viên cụ thể
const token = generateEmployeeToken("My Nguyen");
console.log(`Token cho My Nguyen: ${token}`);
```

### 2. Validate Token
```javascript
// Kiểm tra token có hợp lệ không
const result = validateEmployeeToken("abc123def456");
if (result.success) {
  console.log(`Token hợp lệ cho: ${result.data.name}`);
} else {
  console.log(`Token không hợp lệ: ${result.error}`);
}
```

### 3. Deactivate Nhân viên
Thay đổi **Column H** trong Settings sheet từ "Active" thành "Inactive"

### 4. Thay đổi Token
Chạy lại `generateEmployeeTokens()` để tạo token mới

## 🔐 Bảo mật

### 1. Token Security
- Token được tạo dựa trên tên nhân viên + timestamp
- Encoded bằng Base64 (có thể nâng cấp lên stronger hashing)
- Chỉ nhân viên có token mới truy cập được

### 2. Data Protection
- Mỗi nhân viên chỉ thấy task của mình
- Validate token trước mỗi action
- Không thể xem/sửa task của người khác

### 3. Access Control
- Token có thể được vô hiệu hóa bằng cách thay đổi Status
- Admin kiểm soát hoàn toàn việc tạo và quản lý token

## 🛠️ Troubleshooting

### 1. Token không hoạt động
- Kiểm tra Column N trong Settings sheet có token không
- Đảm bảo Status = "Active"
- Thử tạo lại token

### 2. Không thể upload hình
- Kiểm tra file size < 10MB
- Đảm bảo là file hình ảnh (jpg, png, gif)
- Kiểm tra permissions Google Drive

### 3. Không thấy task
- Kiểm tra ngày filter
- Đảm bảo có task trong sheet của nhân viên đó
- Kiểm tra tên sheet trong Settings (Column G)

## 📊 Monitoring

### 1. Logs
Tất cả actions được log với format:
```javascript
logWithContext('EmployeePortal', 'Message', 'LEVEL');
```

### 2. Debug Functions
```javascript
// Test connectivity
testBasicConnectivity();

// Debug employee system
debugEmployeeSystemComplete();
```

## 🔄 Workflow

### 1. Setup (One-time)
1. Cấu hình Settings sheet (Column F, G, H, I)
2. Chạy `generateEmployeeTokens()`
3. Phân phối links/QR codes cho nhân viên

### 2. Daily Usage
1. Nhân viên truy cập portal bằng link/QR
2. Xem task được giao
3. Đánh dấu hoàn thành và upload kết quả
4. Admin theo dõi progress từ employee-tasks.html

### 3. Management
1. Thêm nhân viên mới → Update Settings → Generate tokens
2. Thay đổi token → Chạy lại `generateEmployeeTokens()`
3. Vô hiệu hóa → Đổi Status thành "Inactive"

## 🎯 Best Practices

### 1. Security
- Thay đổi token định kỳ
- Chỉ share token qua kênh bảo mật
- Monitor access logs

### 2. User Experience
- Tạo QR code cho mobile users
- Bookmark link cho desktop users
- Hướng dẫn nhân viên cách sử dụng

### 3. Maintenance
- Backup Settings sheet thường xuyên
- Test system sau mỗi update
- Monitor error logs

## 📞 Support

### 1. Common Issues
- **Token expired**: Tạo lại token
- **Can't see tasks**: Kiểm tra Settings sheet
- **Upload failed**: Kiểm tra file size và format

### 2. Contact Admin
- Báo lỗi qua email/chat
- Cung cấp token và error message
- Screenshot nếu có thể

---

## 🔗 Quick Links

- **Admin Portal**: `?page=employee-tasks`
- **Employee Portal**: `?page=employee-portal&token=YOUR_TOKEN`
- **Settings Sheet**: Column F-N
- **Debug Console**: Browser F12 → Console

---

*Hệ thống Employee Portal - Phiên bản 1.0 - Tạo ngày 2025-07-18*