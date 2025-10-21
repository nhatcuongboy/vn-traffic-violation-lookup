import { CronExpressionParser } from 'cron-parser';
import { initializeDatabase, getDatabaseManager } from '../src/database';
import config from '../src/config';

async function updateNextRunTimes() {
  // Initialize database
  initializeDatabase();
  const db = getDatabaseManager();

  try {
    console.log('🔄 Updating next run times for all active cron jobs...');
    console.log(`📅 Cron schedule: ${config.cron.schedule}`);

    // Get all active cron jobs
    const result = await db.getAllActiveCronJobs();

    if (!result.success || !result.data || result.data.length === 0) {
      console.log('❌ No active cron jobs found');
      return;
    }

    const cronJobs = result.data;
    console.log(`📋 Found ${cronJobs.length} active cron job(s)\n`);

    // Calculate next run time
    const interval = CronExpressionParser.parse(config.cron.schedule, {
      currentDate: new Date(),
      tz: config.cron.timezone,
    });

    const nextRun = interval.next().toDate();
    console.log(`⏰ Next run time: ${nextRun.toLocaleString('vi-VN')}\n`);

    // Update each cron job
    for (const cronJob of cronJobs) {
      console.log(`Updating cron job ID ${cronJob.id} (User: ${cronJob.user.chatId})...`);

      await db.updateCronJob(cronJob.userId, {
        nextRun: nextRun,
      });

      console.log(`✅ Updated successfully\n`);
    }

    console.log('🎉 All cron jobs updated!');
  } catch (error) {
    console.error('❌ Error updating next run times:', error);
  } finally {
    db.close();
  }
}

updateNextRunTimes();
