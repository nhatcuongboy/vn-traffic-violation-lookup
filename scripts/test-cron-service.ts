/**
 * CronService Test Script
 * Tests CronService scheduling and execution
 */

import { initializeDatabase, closeDatabase } from '@/database';
import { UserService, CronJobService } from '@/services/userService';
import { CronService } from '@/services/cronService';
import TelegramBot from 'node-telegram-bot-api';
import config from '@/config';

async function testCronService(): Promise<void> {
  console.log('🧪 Starting CronService tests...\n');

  try {
    // Initialize database
    initializeDatabase(config.database);
    console.log('✅ Database initialized\n');

    // Initialize services
    const userService = new UserService();
    const cronJobService = new CronJobService();

    // Test 1: Create test user and cron job
    console.log('📝 Test 1: Setting up test user and cron job...');
    const userResult = await userService.registerOrGetUser({
      chatId: 111222333,
      username: 'testcron',
      firstName: 'Cron',
      lastName: 'Test',
    });

    if (!userResult.success) {
      throw new Error(`Failed to register user: ${userResult.error}`);
    }

    const cronJobResult = await cronJobService.setupCronJob({
      userId: userResult.data!.id,
      plate: '51K88888',
      vehicleType: '1',
    });

    if (!cronJobResult.success) {
      throw new Error(`Failed to setup cron job: ${cronJobResult.error}`);
    }

    console.log('✅ Test user and cron job created');
    console.log('   User ID:', userResult.data!.id);
    console.log('   Cron Job ID:', cronJobResult.data!.id);
    console.log('   Plate:', cronJobResult.data!.plate);

    // Test 2: Initialize CronService
    console.log('\n📝 Test 2: Initializing CronService...');

    if (!config.telegram.token) {
      console.log('⚠️ Warning: TELEGRAM_BOT_TOKEN not set, using dummy bot');
      // Create a dummy bot for testing (won't actually send messages)
      const dummyBot = {
        sendMessage: async () => console.log('   [Dummy] Message would be sent to Telegram'),
      } as unknown as TelegramBot;

      const cronService = new CronService(dummyBot, {
        schedule: '* * * * *', // Every minute for testing
        enabled: true,
      });

      console.log('✅ CronService initialized');
      console.log('   Schedule:', cronService.getConfig().schedule);
      console.log('   Timezone:', cronService.getConfig().timezone);

      // Test 3: Get initial stats
      console.log('\n📝 Test 3: Getting CronService stats...');
      const initialStats = cronService.getStats();
      console.log('✅ Initial stats:', initialStats);

      // Test 4: Manual execution
      console.log('\n📝 Test 4: Triggering manual execution...');
      console.log('   This will execute all active cron jobs immediately...\n');

      await cronService.executeNow();

      // Test 5: Get updated stats
      console.log('\n📝 Test 5: Getting updated stats...');
      const updatedStats = cronService.getStats();
      console.log('✅ Updated stats:', updatedStats);

      // Test 6: Start scheduled execution
      console.log('\n📝 Test 6: Starting scheduled execution...');
      cronService.start();
      console.log('✅ Scheduled execution started');
      console.log('   Next execution:', cronService.getNextExecutionTime());

      // Wait a bit to show it's running
      console.log('\n⏳ Waiting 5 seconds to demonstrate scheduled execution...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Test 7: Stop service
      console.log('\n📝 Test 7: Stopping CronService...');
      cronService.stop();
      console.log('✅ CronService stopped');

      // Test 8: Final stats
      console.log('\n📝 Test 8: Getting final stats...');
      const finalStats = cronService.getStats();
      console.log('✅ Final stats:', finalStats);

      console.log('\n🎉 All CronService tests completed!');
      console.log('\n📊 Summary:');
      console.log('   Total executions:', finalStats.totalExecutions);
      console.log('   Successful executions:', finalStats.successfulExecutions);
      console.log('   Failed executions:', finalStats.failedExecutions);
      console.log('   Is running:', finalStats.isRunning);
    } else {
      console.log('✅ TELEGRAM_BOT_TOKEN is set');
      console.log('⚠️ For full integration test, run the application with: npm start');
      console.log('⚠️ The CronService will start automatically and execute at 9 AM daily');
    }
  } catch (error) {
    console.error('❌ CronService test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    closeDatabase();
    console.log('\n📊 Database connection closed');
  }
}

// Run tests
testCronService().catch(console.error);
