import app from './app';
import config from './config';

const server = app.listen(config.port, () => {
  console.log(`🚀 Server is running on port ${config.port}`);
  console.log(`\n🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `🔍 Captcha Method: ${config.captcha.defaultMethod} (Tesseract: ✅, Autocaptcha: ${config.captcha.autocaptcha.key ? '✅' : '❌'})`,
  );
  console.log(`🤖 Telegram Bot: ${config.telegram.token ? '✅ Configured' : '❌ Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default server;
