# 🚦 Vietnam Traffic Violation Lookup

Vietnam traffic violation lookup tool with automatic captcha solving.

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

1. Start chat with bot
2. Send `/start`
3. Enter vehicle type (1=Car, 2=Motorcycle, 3=Electric bicycle)
4. Enter license plate number

## ⚠️ Notes

- Uses Tesseract OCR by default (free, no API key required)
- Autocaptcha API optional for higher accuracy
- Do not use for commercial purposes without permission

## 📄 License

MIT
