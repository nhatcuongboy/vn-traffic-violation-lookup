# 📱 Telegram Commands - Cron Job Management

## Overview

This document describes the Telegram commands for users to manage automated traffic violation lookup cron jobs.

## 🎯 Available Commands

### 1. **/cron_setup** - Setup Automated Lookup

Set up automated traffic violation lookup for a vehicle.

**Workflow:**

```
User: /cron_setup
Bot: ⏰ SETUP AUTOMATED LOOKUP
     Bot will automatically check for traffic violations of your vehicle daily at 9:00 AM.
     🔻 Select your vehicle type:
     [🚗 Car] [🏍️ Motorcycle] [🚴‍♀️ Electric Bicycle] [❌ Cancel]

User: [Select vehicle type]
Bot: 📋 Vehicle type selected: 🚗 Car
     🔢 Enter your plate number (example: 51K01234):

User: 51K12345
Bot: ⏳ Setting up automated lookup...
     ✅ CRON JOB SUCCESSFULLY SET UP!
     📋 Plate number: 51K12345
     🚗 Vehicle type: Car
     ⏰ Schedule: Daily at 9:00 AM
     🎉 From now on, bot will automatically check for violations...
```

**Features:**

- ✅ User registration tự động
- ✅ Validation biển số xe
- ✅ Confirmation message với thông tin chi tiết
- ✅ Nếu đã có cron job, sẽ update phương tiện mới

### 2. **/cron_status** - View Status

View current cron job status.

**Workflow:**

```
User: /cron_status
Bot: 📋 AUTOMATED LOOKUP STATUS
     📋 Plate number: 51K12345
     🚗 Vehicle type: Car
     ⏰ Schedule: Daily at 9:00 AM
     📊 Status: ✅ Active
     🕐 Last run: 21/10/2025, 09:00
     ⏰ Next run: 22/10/2025, 09:00

     💡 Management commands:
     • /cron_update - Update vehicle
     • /cron_disable - Disable cron job
     • /cron_setup - Set up again
```

**Nếu chưa có cron job:**

```
User: /cron_status
Bot: 📋 TRẠNG THÁI TRA CỨU TỰ ĐỘNG
     ❌ Bạn chưa thiết lập tra cứu tự động.
     💡 Để thiết lập:
     • Gõ /cron_setup để bắt đầu
     [⏰ Thiết lập ngay]
```

### 3. **/cron_update** - Update Vehicle

Change the monitored vehicle.

**Workflow:**

```
User: /cron_update
Bot: 🔄 UPDATE VEHICLE
     📋 Current vehicle: 51K12345 (Type 1)
     🔻 Select new vehicle type:
     [🚗 Car] [🏍️ Motorcycle] [🚴‍♀️ Electric Bicycle] [❌ Cancel]

User: [Chọn loại xe]
Bot: 📋 Loại xe đã chọn: 🏍️ Xe máy
     🔢 Nhập biển số xe của bạn (ví dụ: 51K01234):

User: 30A56789
Bot: ⏳ Đang thiết lập tra cứu tự động...
     ✅ CRON JOB ĐÃ ĐƯỢC THIẾT LẬP!
     📋 Biển số: 30A56789
     🚗 Loại xe: Xe máy
     ⏰ Lịch trình: Hàng ngày lúc 9:00 sáng
```

**Nếu chưa có cron job:**

```
User: /cron_update
Bot: ❌ Bạn chưa có tra cứu tự động nào.
     💡 Sử dụng /cron_setup để thiết lập.
```

### 4. **/cron_disable** - Disable Automated Lookup

Disable the automated lookup cron job.

**Workflow:**

```
User: /cron_disable
Bot: ✅ CRON JOB DISABLED
     📋 Plate number: 51K12345
     🎉 Cron job has been successfully disabled.
        Bot will no longer automatically check for violations for this vehicle.

     💡 To re-enable:
     • Type /cron_setup to set up again
     • Or use the main menu
```

## 📋 Command Reference Table

| Command         | Description               | Required Auth | Creates User |
| --------------- | ------------------------- | ------------- | ------------ |
| `/cron_setup`   | Thiết lập tra cứu tự động | No            | Yes          |
| `/cron_status`  | Xem trạng thái cron job   | No            | No           |
| `/cron_update`  | Cập nhật phương tiện      | Yes\*         | No           |
| `/cron_disable` | Tắt tra cứu tự động       | Yes\*         | No           |

\*Requires existing cron job

## 🔄 User States

### State Machine

```
IDLE
  ↓ /cron_setup
CRON_ASK_VEHICLE_TYPE
  ↓ [Select vehicle type]
CRON_ASK_PLATE
  ↓ [Enter plate number]
CRON_SETUP
  ↓ [Validate & Save]
IDLE (Cron job created)
```

### User State Interface

```typescript
interface UserState {
  step:
    | 'ASK_VEHICLE_TYPE'
    | 'ASK_PLATE'
    | 'FETCHING'
    | 'CRON_ASK_VEHICLE_TYPE'
    | 'CRON_ASK_PLATE'
    | 'CRON_SETUP';
  vehicleType?: string;
  plate?: string;
  action?: 'lookup' | 'cron_setup' | 'cron_update';
}
```

## 🎨 Message Formatting

### Success Messages

```
✅ CRON JOB ĐÃ ĐƯỢC THIẾT LẬP!
📋 Biển số: *51K12345*
🚗 Loại xe: Xe ô tô
⏰ Lịch trình: Hàng ngày lúc 9:00 sáng
```

### Error Messages

```
❌ Có lỗi xảy ra khi thiết lập tra cứu tự động: [error message]
```

### Info Messages

```
⏳ Đang thiết lập tra cứu tự động...
```

## 🔔 Automatic Notifications

Bot tự động gửi thông báo mỗi ngày lúc 9h sáng:

### Có Vi Phạm Mới

```
🚨 CÓ VI PHẠM MỚI!

📋 Biển số: 51K12345
🚗 Loại xe: Xe ô tô
📅 Thời gian tra cứu: 21/10/2025, 09:00

🔍 Tìm thấy 2 vi phạm mới:

1. Vi phạm lúc 15/10/2025 10:30:00
📍 Địa điểm: Đường ABC, Quận XYZ
❌ Loại vi phạm: Vượt đèn đỏ
💰 Số tiền phạt: 1,000,000 VNĐ
📌 Trạng thái: Chưa nộp phạt

2. Vi phạm lúc 18/10/2025 14:45:00
...

💡 Lưu ý: Bạn có thể tra cứu lại bất kỳ lúc nào bằng lệnh /lookup
```

### Không Có Vi Phạm Mới

```
✅ KHÔNG CÓ VI PHẠM MỚI

📋 Biển số: 51K12345
📅 Thời gian tra cứu: 21/10/2025, 09:00

🎉 Không có vi phạm mới nào được phát hiện!

💡 Lưu ý: Bạn có thể tra cứu lại bất kỳ lúc nào bằng lệnh /lookup
```

### Có Vi Phạm Đã Xử Lý

```
✅ VI PHẠM ĐÃ ĐƯỢC XỬ LÝ!

📋 Biển số: 51K12345
📅 Thời gian tra cứu: 21/10/2025, 09:00

🎉 1 vi phạm đã được xử lý:

1. Vi phạm lúc 10/10/2025 08:15:00
📍 Địa điểm: Đường XYZ, Quận ABC
❌ Loại vi phạm: Đỗ xe sai quy định
💰 Số tiền phạt: 500,000 VNĐ
```

### Lỗi Tra Cứu

```
❌ Lỗi tra cứu tự động

Đã xảy ra lỗi khi tra cứu biển số 51K12345:
`Website endpoint may have changed or session expired`

💡 Gợi ý: Thử lại sau vài phút hoặc sử dụng lệnh /lookup
```

## 🔐 Security & Validation

### Plate Number Validation

```typescript
// Validate plate format
if (!plate || plate.trim().length === 0) {
  return { valid: false, error: 'Biển số xe không được để trống' };
}

const cleanPlate = plate.replace(/[\s-]/g, '').toUpperCase();
if (cleanPlate.length < 4 || cleanPlate.length > 12) {
  return { valid: false, error: 'Biển số xe không hợp lệ' };
}
```

### Vehicle Type Validation

```typescript
const validVehicleTypes = ['1', '2', '3'];
if (!validVehicleTypes.includes(vehicleType)) {
  return {
    valid: false,
    error: 'Loại xe không hợp lệ. Phải là 1 (ô tô), 2 (xe máy), hoặc 3 (xe đạp điện)',
  };
}
```

## 📊 User Limits

- ✅ **Cron Jobs per User**: 1 (một user chỉ có thể có 1 cron job active)
- ✅ **Update Frequency**: Unlimited (user có thể update phương tiện bất kỳ lúc nào)
- ✅ **Execution Time**: 9:00 AM daily (có thể customize trong code)

## 🧪 Testing Commands

```bash
# Test cron setup flow
User: /cron_setup
User: [Select vehicle type: 1]
User: 51K12345

# Verify status
User: /cron_status

# Update vehicle
User: /cron_update
User: [Select vehicle type: 2]
User: 30A56789

# Disable
User: /cron_disable
```

## 🎯 Integration Points

### Database

```typescript
// User registration
await userService.registerOrGetUser({ chatId, username, firstName, lastName });

// Cron job creation/update
await cronJobService.setupCronJob({ userId, plate, vehicleType });

// Status check
await cronJobService.getCronJobStatus(chatId);

// Disable
await cronJobService.disableCronJob(userId);
```

### Notification Service

```typescript
// Send setup confirmation
await notificationService.sendCronJobSetupConfirmation(chatId, plate, vehicleType);

// Send status
await notificationService.sendCronJobStatus(chatId, hasCronJob, cronJob, isActive);

// Send disabled confirmation
await notificationService.sendCronJobDisabledConfirmation(chatId, plate);
```

---

**Telegram Commands đã sẵn sàng cho production!** 🚀

User có thể dễ dàng quản lý cron job của mình với các lệnh đơn giản và trực quan.
