# 🚦 Vietnam Traffic Violation Lookup

Vietnam traffic violation lookup tool with automatic captcha solving and scheduled cron job for automatic daily lookups.

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
curl -L -o eng.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and add your API keys
export CAPTCHA_METHOD="tesseract"  # or "autocaptcha"
export AUTOCAPTCHA_KEY="your_key_here"  # optional
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
```

### 3. Run the application

```bash
npm start                   # Run everything (server + telegram bot)
npm run server              # Run only server
npm run cli 51K67179 1      # Run CLI tool
```

## 📝 Usage

### REST API

```bash
GET /api/violations?plate=51K67179&vehicleType=1
GET /api/violations/telegram?plate=51K67179&vehicleType=1
GET /api/violations/html?plate=51K67179&vehicleType=1
POST /api/violations/bulk
    {
    "vehicles": [
        { "plate": "51K67179", "vehicleType": "1" },
        { "plate": "30A12345", "vehicleType": "2" }
    ],
    "captcha": "optional_captcha_text"
    }
```

### CLI

```bash
node src/index.js 51K67179 1                   # Auto-solve captcha
node src/index.js 51K67179 1 ABC123            # Manual captcha
```

## 🤖 Telegram Bot

### One-Time Lookup

1. Start chat with bot
2. Send `/lookup`
3. Select vehicle type (🚗 Car, 🏍️ Motorcycle, 🚴‍♀️ Electric bicycle)
4. Enter license plate number
5. Receive violation results

### ⏰ Automatic Daily Lookup (Cron Job)

Setup automatic violation checks every day at 9:00 AM:

1. Send `/cron_setup`
2. Select vehicle type
3. Enter license plate number
4. Receive confirmation

**Cron Job Commands:**

- `/cron_setup` - Setup automatic daily lookup
- `/cron_status` - Check cron job status
- `/cron_update` - Update vehicle
- `/cron_disable` - Disable automatic lookup

**Features:**

- ✅ Automatic daily violation check at 9:00 AM
- ✅ Get notified only when there are changes
- ✅ Track new violations
- ✅ Track resolved violations
- ✅ One vehicle per user
- ✅ Easy to update or disable

## 🧪 Testing

```bash
npm run test:database          # Test database operations
npm run test:user-management   # Test user & cron job services
npm run test:cron-service      # Test cron service
npm run test:worker-pool       # Test Tesseract worker pool
```

## 📚 Documentation

- [Database Setup](docs/database-setup.md) - SQLite database structure and operations
- [User Management](docs/user-management-system.md) - User and cron job management
- [Cron Service](docs/cron-service.md) - Scheduled execution details
- [Telegram Commands](docs/telegram-commands.md) - Command reference
- [Final Summary](docs/final-summary.md) - Complete implementation overview

## 🏗️ Architecture

```
Telegram Bot
    ↓
TelegramService → CronService (Scheduled at 9 AM daily)
    ↓                  ↓
UserService      CronJobExecutionService
    ↓                  ↓
DatabaseManager ← ViolationService
    ↓
SQLite Database
```

## 📚 Documentation

- [API Endpoints](./docs/api-endpoints.md) - REST API documentation
- [Telegram Commands](./docs/telegram-commands.md) - Telegram bot commands and usage
- [Cron Service](./docs/cron-service.md) - Automatic daily lookup system
- [Cron Configuration](./docs/cron-configuration.md) - How to configure cron schedule
- [User Management](./docs/user-management-system.md) - User and cron job management
- [Database Setup](./docs/database-setup.md) - Database schema and operations

## ⚠️ Notes

- Uses Tesseract OCR by default (free, no API key required)
- Autocaptcha API optional for higher accuracy
- Cron jobs run at 9:00 AM daily (Asia/Ho_Chi_Minh timezone)
- Database stored in `./data/cron_jobs.db`
- Do not use for commercial purposes without permission

## 📄 License

MIT
