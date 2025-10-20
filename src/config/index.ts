import 'dotenv/config';
import { Config } from '../types';

const config: Config = {
  // Server config
  port: parseInt(process.env.PORT || '3000', 10),

  // CSGT API config
  csgt: {
    baseUrl: 'https://www.csgt.vn',
    lookupUrl: 'https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html',
    captchaEndpoint: 'https://www.csgt.vn/lib/captcha/captcha.class.php',
    ajaxValidateUrl: 'https://www.csgt.vn/?mod=contact&task=tracuu_post&ajax',
  },

  // Captcha solving config
  captcha: {
    // Default method: 'tesseract' or 'autocaptcha'
    defaultMethod: (process.env.CAPTCHA_METHOD as 'tesseract' | 'autocaptcha') || 'tesseract',

    // Tesseract OCR config
    tesseract: {
      language: 'eng',
      options: {
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyz',
        tessedit_pageseg_mode: '8', // Single word
        tessedit_ocr_engine_mode: '1', // LSTM only
      },
      // Worker pool config
      workerPool: {
        maxWorkers: parseInt(process.env.TESSERACT_MAX_WORKERS || '3', 10),
        enableWorkerPool: process.env.TESSERACT_ENABLE_WORKER_POOL !== 'false',
      },
    },

    // Autocaptcha config (optional)
    autocaptcha: {
      url: 'https://autocaptcha.pro/apiv3/process',
      key: process.env.AUTOCAPTCHA_KEY || '',
      timeout: 90000,
    },
  },

  // Telegram Bot config
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    polling: true,
  },

  // HTTP client config
  http: {
    timeout: 30000,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  },

  // Debug config
  debug: {
    saveCaptcha: process.env.NODE_ENV !== 'production',
    saveResultHtml: process.env.NODE_ENV !== 'production',
  },
};

export default config;
