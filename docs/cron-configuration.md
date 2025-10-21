# Cron Job Configuration Guide

## 📋 Overview

The cron job system allows automatic daily violation lookups for registered users. This document explains how to configure the cron schedule and other related settings.

---

## 🔧 Configuration Locations

### 1. **Central Configuration** (`src/config/index.ts`)

The main configuration file where all cron settings are defined:

```typescript
cron: {
  schedule: process.env.CRON_SCHEDULE || '0 9 * * *', // Default: 9 AM daily
  timezone: process.env.CRON_TIMEZONE || 'Asia/Ho_Chi_Minh',
  enabled: process.env.CRON_ENABLED !== 'false', // Enable by default
}
```

### 2. **Environment Variables** (`.env`)

You can override the default configuration using environment variables:

```bash
# Cron schedule (cron expression)
CRON_SCHEDULE=0 9 * * *

# Timezone
CRON_TIMEZONE=Asia/Ho_Chi_Minh

# Enable/disable cron service
CRON_ENABLED=true
```

### 3. **Database** (SQLite)

Cron jobs are stored in the database:

- Table: `cronJobs`
- All jobs use the same global schedule configured in CronService

---

## 📅 Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

---

## 🕐 Common Schedules

| Expression     | Description                         | Example      |
| -------------- | ----------------------------------- | ------------ |
| `0 9 * * *`    | Every day at 9:00 AM                | Default      |
| `0 8 * * *`    | Every day at 8:00 AM                |              |
| `30 9 * * *`   | Every day at 9:30 AM                |              |
| `0 12 * * *`   | Every day at 12:00 PM (noon)        |              |
| `0 18 * * *`   | Every day at 6:00 PM                |              |
| `0 9 * * 1-5`  | Weekdays (Mon-Fri) at 9:00 AM       |              |
| `0 9 * * 0`    | Sundays only at 9:00 AM             |              |
| `0 9 1 * *`    | First day of every month at 9:00 AM |              |
| `0 0 * * *`    | Every day at midnight               |              |
| `*/30 * * * *` | Every 30 minutes                    | Testing only |

---

## 🌍 Supported Timezones

Default: `Asia/Ho_Chi_Minh` (UTC+7)

Other common timezones:

- `Asia/Bangkok` - Thailand (UTC+7)
- `Asia/Singapore` - Singapore (UTC+8)
- `Asia/Tokyo` - Japan (UTC+9)
- `America/New_York` - US Eastern (UTC-5/-4)
- `Europe/London` - UK (UTC+0/+1)

Full list: [IANA Time Zone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

---

## 🚀 How to Change Cron Schedule

### Method 1: Environment Variables (Recommended)

1. Create or edit `.env` file:

```bash
CRON_SCHEDULE=0 8 * * *
CRON_TIMEZONE=Asia/Ho_Chi_Minh
```

2. Restart the application:

```bash
npm run dev
```

### Method 2: Modify Config File

Edit `src/config/index.ts`:

```typescript
cron: {
  schedule: '0 8 * * *', // Change to 8 AM
  timezone: 'Asia/Ho_Chi_Minh',
  enabled: true,
}
```

### Method 3: Per-Job Configuration

Currently, all jobs use the same schedule. To implement per-job schedules, you would need to modify:

- `CronService` to handle multiple schedules
- Database to store individual schedules per job

---

## 🧪 Testing Cron Jobs

### Option 1: Trigger Manually

Use the test script:

```bash
npm run test:cron-service
```

### Option 2: Set Short Interval for Testing

Temporarily change schedule to run every minute:

```bash
CRON_SCHEDULE="* * * * *"
```

⚠️ **Warning**: Don't use this in production! It will trigger lookups every minute.

### Option 3: Manual Trigger via Code

```typescript
const cronService = new CronService(bot);
await cronService.triggerExecution(); // Execute immediately
```

---

## 📊 Monitoring Cron Jobs

### Check Status

Use the Telegram bot command:

```
/cron_status
```

### View Logs

The cron service logs execution information:

```
🚀 Starting scheduled cron job execution...
📋 Found 5 active cron jobs
✅ Cron job 1 executed successfully
🎉 Scheduled cron job execution completed!
```

### Database Queries

Check cron job statistics:

```sql
SELECT * FROM cronJobs WHERE isActive = 1;
SELECT * FROM lookupHistory ORDER BY createdAt DESC LIMIT 10;
```

---

## ⚙️ Advanced Configuration

### Disable Cron Service

```bash
CRON_ENABLED=false
```

Or in code:

```typescript
const cronService = new CronService(bot, { enabled: false });
```

### Custom Schedule per Job (Future Feature)

To implement custom schedules per user:

1. Add schedule field to cron job setup
2. Modify `CronService` to create multiple `cron.schedule()` instances
3. Update UI to allow users to choose schedule

Example:

```typescript
// In TelegramService
/cron_setup -> select vehicle -> select time (9 AM, 12 PM, 6 PM, etc.)
```

---

## 🔍 Troubleshooting

### Cron jobs not running

1. Check if cron service is enabled:

```typescript
console.log(cronService.getConfig().enabled);
```

2. Verify cron expression is valid:

```bash
npm install -g cron-validate
cron-validate "0 9 * * *"
```

3. Check timezone setting matches your location

4. Review logs for errors

### Jobs running at wrong time

1. Verify timezone configuration
2. Check server time: `date`
3. Confirm cron expression is correct

### Multiple executions

- Ensure only one CronService instance is created
- Check for duplicate entries in database

---

## 📝 Best Practices

1. **Use Environment Variables**: Don't hardcode schedules in code
2. **Set Reasonable Intervals**: Daily is recommended, avoid too frequent lookups
3. **Monitor Performance**: Check execution logs and database size
4. **Timezone Awareness**: Always set timezone explicitly
5. **Test Before Deploy**: Use test scripts to verify schedule changes
6. **Backup Database**: Regular backups of `cron_jobs.db`

---

## 📚 Related Documentation

- [Cron Service Architecture](./cron-service.md)
- [Database Setup](./database-setup.md)
- [User Management](./user-management-system.md)
- [Telegram Commands](./telegram-commands.md)

---

## 🔗 External Resources

- [Cron Expression Generator](https://crontab.guru/)
- [Node-cron Documentation](https://www.npmjs.com/package/node-cron)
- [IANA Timezone Database](https://www.iana.org/time-zones)
