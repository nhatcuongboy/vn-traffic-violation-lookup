import server from './server';
import { TelegramService } from './services/telegramService';
import config from './config';

// Start Telegram Bot if token is configured
let telegramService: TelegramService | null = null;
if (config.telegram.token) {
  try {
    telegramService = new TelegramService();
    telegramService.start();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to start Telegram Bot:', errorMessage);
  }
} else {
  console.log('⚠️ Telegram Bot not started - TELEGRAM_BOT_TOKEN not configured');
}

// Graceful shutdown
const shutdown = (): void => {
  console.log('\n🛑 Shutting down...');

  if (telegramService) {
    telegramService.stop();
  }

  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
