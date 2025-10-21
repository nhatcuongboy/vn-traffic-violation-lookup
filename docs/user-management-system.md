# 👥 User Management System - Cron Job Integration

## Overview

The User Management System provides services to manage user and cron job operations, integrated with the existing database and ViolationService.

## 🏗️ Services Architecture

### 1. **UserService**

Manages user information and related operations:

```typescript
class UserService {
  // Register or get current user
  async registerOrGetUser(data: UserRegistrationData): Promise<DatabaseResult<User>>;

  // Get user by chatId
  async getUserByChatId(chatId: number): Promise<DatabaseResult<User>>;

  // Update user information
  async updateUser(chatId: number, updates: Partial<User>): Promise<DatabaseResult<User>>;

  // Check if user exists
  async userExists(chatId: number): Promise<boolean>;

  // Get user statistics
  async getUserStats(chatId: number): Promise<UserStats>;
}
```

### 2. **CronJobService**

Manages cron job operations:

```typescript
class CronJobService {
  // Set up cron job for user
  async setupCronJob(data: CronJobSetupData): Promise<DatabaseResult<CronJob>>;

  // Get cron job by userId
  async getCronJobByUserId(userId: number): Promise<DatabaseResult<CronJob>>;

  // Get cron job by chatId
  async getCronJobByChatId(chatId: number): Promise<DatabaseResult<CronJob>>;

  // Update cron job
  async updateCronJob(userId: number, updates: CronJobUpdateData): Promise<DatabaseResult<CronJob>>;

  // Disable/enable cron job
  async disableCronJob(userId: number): Promise<DatabaseResult<CronJob>>;
  async enableCronJob(userId: number): Promise<DatabaseResult<CronJob>>;

  // Validate cron job data
  validateCronJobData(data: CronJobSetupData): { valid: boolean; error?: string };

  // Get cron job status
  async getCronJobStatus(chatId: number): Promise<CronJobStatus>;
}
```

### 3. **CronJobExecutionService**

Executes cron jobs and compares results:

```typescript
class CronJobExecutionService {
  // Execute cron job for a user
  async executeCronJob(cronJob: CronJob): Promise<CronJobExecutionResult>;

  // Compare with previous lookup
  async compareWithPreviousLookup(
    cronJobId: number,
    currentResult: LookupResult,
  ): Promise<CronJobComparisonResult>;

  // Execute all active cron jobs
  async executeAllActiveCronJobs(): Promise<CronJobExecutionResult[]>;

  // Get execution statistics
  async getExecutionStats(): Promise<ExecutionStats>;
}
```

### 4. **NotificationService**

Gửi thông báo qua Telegram:

```typescript
class NotificationService {
  // Gửi thông báo kết quả cron job
  async sendCronJobNotification(data: NotificationData): Promise<void>;

  // Gửi thông báo vi phạm mới
  private async sendNewViolationsNotification(
    chatId: number,
    plate: string,
    violations: Violation[],
  ): Promise<void>;

  // Gửi thông báo vi phạm đã xử lý
  private async sendRemovedViolationsNotification(
    chatId: number,
    plate: string,
    violations: Violation[],
  ): Promise<void>;

  // Gửi thông báo không có thay đổi
  private async sendNoChangesNotification(chatId: number, plate: string): Promise<void>;

  // Gửi thông báo lỗi
  private async sendErrorNotification(chatId: number, plate: string, error: string): Promise<void>;

  // Gửi xác nhận thiết lập cron job
  async sendCronJobSetupConfirmation(
    chatId: number,
    plate: string,
    vehicleType: string,
  ): Promise<void>;

  // Gửi trạng thái cron job
  async sendCronJobStatus(
    chatId: number,
    hasCronJob: boolean,
    cronJob?: CronJob,
    isActive?: boolean,
  ): Promise<void>;

  // Gửi xác nhận tắt cron job
  async sendCronJobDisabledConfirmation(chatId: number, plate: string): Promise<void>;
}
```

## 📊 Data Types

### UserRegistrationData

```typescript
interface UserRegistrationData {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}
```

### CronJobSetupData

```typescript
interface CronJobSetupData {
  userId: number;
  plate: string;
  vehicleType: string;
}
```

### CronJobExecutionResult

```typescript
interface CronJobExecutionResult {
  success: boolean;
  cronJob: CronJob;
  lookupResult?: LookupResult;
  hasNewViolations: boolean;
  error?: string;
}
```

### CronJobComparisonResult

```typescript
interface CronJobComparisonResult {
  hasChanges: boolean;
  newViolations: Violation[];
  removedViolations: Violation[];
  totalViolations: number;
  totalPaidViolations: number;
  totalUnpaidViolations: number;
}
```

## 🔄 Workflow

### 1. **User Registration**

```typescript
// Đăng ký user mới hoặc lấy user hiện tại
const userResult = await userService.registerOrGetUser({
  chatId: 123456789,
  username: 'username',
  firstName: 'John',
  lastName: 'Doe',
});
```

### 2. **Cron Job Setup**

```typescript
// Thiết lập cron job
const cronJobResult = await cronJobService.setupCronJob({
  userId: userResult.data!.id,
  plate: '51K12345',
  vehicleType: '1',
});
```

### 3. **Cron Job Execution**

```typescript
// Thực thi cron job
const executionResult = await cronJobExecutionService.executeCronJob(cronJob);

if (executionResult.success) {
  // Gửi thông báo
  await notificationService.sendCronJobNotification({
    chatId: user.chatId,
    plate: cronJob.plate,
    executionResult,
    comparisonResult,
  });
}
```

### 4. **Violation Comparison**

```typescript
// So sánh với lần tra cứu trước
const comparisonResult = await cronJobExecutionService.compareWithPreviousLookup(
  cronJob.id,
  lookupResult,
);

// Kiểm tra có vi phạm mới không
if (comparisonResult.hasChanges) {
  if (comparisonResult.newViolations.length > 0) {
    // Có vi phạm mới
  }
  if (comparisonResult.removedViolations.length > 0) {
    // Có vi phạm đã được xử lý
  }
}
```

## 🧪 Testing

### Test Script

```bash
npm run test:user-management
```

### Test Coverage

- ✅ User registration và retrieval
- ✅ Cron job setup và validation
- ✅ Cron job status checking
- ✅ User statistics
- ✅ Cron job updates
- ✅ Active cron jobs listing
- ✅ Cron job execution (mock)
- ✅ Execution statistics
- ✅ Cron job disable/enable

## 🔧 Integration Points

### 1. **Database Integration**

- Sử dụng `getDatabaseManager()` để truy cập database
- Tất cả operations đều có error handling
- Type-safe với TypeScript interfaces

### 2. **ViolationService Integration**

- Tích hợp với `ViolationService.lookupByPlate()`
- Sử dụng cùng retry logic và error handling
- Tương thích với existing violation lookup flow

### 3. **TelegramService Integration**

- `NotificationService` sử dụng `TelegramBot` instance
- Tích hợp với existing Telegram bot commands
- Consistent message formatting và error handling

## 📈 Performance & Scalability

### 1. **Database Optimization**

- Prepared statements cho tất cả queries
- Indexes cho performance
- Connection pooling với better-sqlite3

### 2. **Execution Management**

- Sequential execution để tránh overwhelm system
- Delay giữa các executions
- Error handling và retry logic

### 3. **Memory Management**

- Efficient data structures
- Proper cleanup và resource management
- Type-safe operations

## 🚀 Ready for Next Step

User Management System đã sẵn sàng cho **Bước 3: CronService Implementation**!

Các services đã được test và hoạt động hoàn hảo:

- User registration và management
- Cron job setup và validation
- Execution và comparison logic
- Notification system foundation

---

**Bước tiếp theo sẽ implement CronService để chạy tra cứu tự động hàng ngày!** 🎯
