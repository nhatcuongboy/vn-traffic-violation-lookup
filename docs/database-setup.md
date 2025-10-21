# 📊 Database Setup - Cron Job System

## Overview

The database system is designed to support daily traffic violation lookup cron jobs. It uses SQLite with better-sqlite3 to ensure performance and reliability.

## Cấu Trúc Database

### 1. **Users Table**

Lưu trữ thông tin người dùng Telegram:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chatId INTEGER UNIQUE NOT NULL,
  username TEXT,
  firstName TEXT,
  lastName TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. **CronJobs Table**

Lưu trữ thông tin cron job của từng user:

```sql
CREATE TABLE cronJobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  plate TEXT NOT NULL,
  vehicleType TEXT NOT NULL,
  isActive BOOLEAN DEFAULT 1,
  lastRun DATETIME,
  nextRun DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);
```

### 3. **LookupHistory Table**

Lưu trữ lịch sử tra cứu để so sánh thay đổi:

```sql
CREATE TABLE lookupHistory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cronJobId INTEGER NOT NULL,
  violations TEXT NOT NULL,
  totalViolations INTEGER DEFAULT 0,
  totalPaidViolations INTEGER DEFAULT 0,
  totalUnpaidViolations INTEGER DEFAULT 0,
  lookupTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  hasNewViolations BOOLEAN DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cronJobId) REFERENCES cronJobs (id) ON DELETE CASCADE
);
```

## Indexes

Database is optimized with the following indexes:

- `idx_users_chatId` - Search users by chatId
- `idx_cronJobs_userId` - Search cron jobs by userId
- `idx_cronJobs_active` - Filter active cron jobs
- `idx_cronJobs_nextRun` - Sort by next run time
- `idx_lookupHistory_cronJobId` - Search history by cronJobId
- `idx_lookupHistory_lookupTime` - Sort by lookup time

## Cấu Hình

### Environment Variables

```bash
DATABASE_PATH=./data/cron_jobs.db    # Database file path
DATABASE_WAL=true                    # Enable WAL mode (Write-Ahead Logging)
DATABASE_FOREIGN_KEYS=true          # Enable foreign key constraints
```

### Database Config

```typescript
const databaseConfig = {
  path: process.env.DATABASE_PATH || './data/cron_jobs.db',
  enableWAL: process.env.DATABASE_WAL !== 'false',
  enableForeignKeys: process.env.DATABASE_FOREIGN_KEYS !== 'false',
};

## API Operations

### User Operations

- `createUser(chatId, username?, firstName?, lastName?)` - Tạo user mới
- `getUserByChatId(chatId)` - Lấy user theo chatId
- `updateUser(chatId, updates)` - Cập nhật thông tin user

### CronJob Operations

- `createCronJob(userId, plate, vehicleType)` - Tạo cron job
- `getCronJobByUserId(userId)` - Lấy cron job theo userId
- `updateCronJob(userId, updates)` - Cập nhật cron job
- `getAllActiveCronJobs()` - Lấy tất cả cron job đang active

### LookupHistory Operations

- `createLookupHistory(cronJobId, violations, ...)` - Tạo lịch sử tra cứu
- `getLatestLookupHistory(cronJobId)` - Lấy lịch sử tra cứu gần nhất
- `getLookupHistoryByCronJobId(cronJobId, limit)` - Lấy lịch sử theo cronJobId

### Statistics

- `getCronJobStats()` - Thống kê tổng quan hệ thống
- `cleanupOldLookupHistory(daysToKeep)` - Dọn dẹp dữ liệu cũ

## Testing

Run database tests:

```bash
npm run test:database
```

Tests will check:

1. ✅ Create new user
2. ✅ Create cron job
3. ✅ Get user information
4. ✅ Get cron job information
5. ✅ Create lookup history
6. ✅ Get latest history
7. ✅ Update cron job
8. ✅ Get all active cron jobs
9. ✅ System statistics

## Backup & Maintenance

### Backup Database

```bash
cp ./data/cron_jobs.db ./backups/cron_jobs_$(date +%Y%m%d_%H%M%S).db
```

### Cleanup Old Data

```typescript
// Clean up data older than 30 days
await db.cleanupOldLookupHistory(30);
```

### Database Health Check

```typescript
import { checkDatabaseHealth } from './database';

const isHealthy = await checkDatabaseHealth();
console.log('Database health:', isHealthy ? '✅ OK' : '❌ Error');
```

## Performance

- **WAL Mode**: Cải thiện hiệu suất ghi đồng thời
- **Indexes**: Tối ưu hóa truy vấn
- **Foreign Keys**: Đảm bảo tính toàn vẹn dữ liệu
- **Prepared Statements**: Tăng hiệu suất và bảo mật

## Security

- **SQL Injection Protection**: Sử dụng prepared statements
- **Data Validation**: Kiểm tra dữ liệu đầu vào
- **Foreign Key Constraints**: Đảm bảo tính toàn vẹn
- **Graceful Error Handling**: Xử lý lỗi an toàn

---

**Database đã sẵn sàng cho Bước 2: User Management System!** 🚀
