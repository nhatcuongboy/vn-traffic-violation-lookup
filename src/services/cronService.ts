import * as cron from 'node-cron';
import { CronExpressionParser } from 'cron-parser';
import TelegramBot from 'node-telegram-bot-api';
import { CronJobExecutionService } from './cronJobExecutionService';
import { NotificationService } from './notificationService';
import { getDatabaseManager } from '../database';
import config from '../config';

export interface CronServiceConfig {
  schedule: string; // Cron expression, default: '0 9 * * *' (9 AM daily)
  timezone?: string;
  enabled: boolean;
}

export interface CronServiceStats {
  isRunning: boolean;
  schedule: string;
  lastExecution?: Date;
  nextExecution?: Date;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
}

export class CronService {
  private cronTask: cron.ScheduledTask | null = null;
  private executionService: CronJobExecutionService;
  private notificationService: NotificationService;
  private db = getDatabaseManager();
  private config: CronServiceConfig;
  private stats: {
    lastExecution?: Date;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  };

  constructor(bot: TelegramBot, customConfig?: Partial<CronServiceConfig>) {
    this.config = {
      schedule: customConfig?.schedule || config.cron.schedule,
      timezone: customConfig?.timezone || config.cron.timezone,
      enabled: customConfig?.enabled !== undefined ? customConfig.enabled : config.cron.enabled,
    };

    this.executionService = new CronJobExecutionService();
    this.notificationService = new NotificationService(bot);

    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    };
  }

  /**
   * Start the cron service
   */
  start(): void {
    if (this.cronTask) {
      console.log('⚠️ CronService already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('⚠️ CronService is disabled');
      return;
    }

    try {
      this.cronTask = cron.schedule(
        this.config.schedule,
        async () => {
          await this.executeScheduledJobs();
        },
        {
          timezone: this.config.timezone,
        },
      );

      console.log(`✅ CronService started successfully`);
      console.log(`📅 Schedule: ${this.config.schedule} (${this.config.timezone})`);
      console.log(`⏰ Next execution: ${this.getNextExecutionTime()}`);
    } catch (error) {
      console.error('❌ Failed to start CronService:', error);
      throw error;
    }
  }

  /**
   * Stop the cron service
   */
  stop(): void {
    if (!this.cronTask) {
      console.log('⚠️ CronService is not running');
      return;
    }

    this.cronTask.stop();
    this.cronTask = null;
    console.log('🛑 CronService stopped');
  }

  /**
   * Execute all scheduled jobs
   */
  private async executeScheduledJobs(): Promise<void> {
    console.log('\n🚀 ============================================');
    console.log('🚀 Starting scheduled cron job execution...');
    console.log('🚀 ============================================\n');

    const startTime = new Date();
    this.stats.lastExecution = startTime;
    this.stats.totalExecutions++;

    try {
      // Get all active cron jobs
      const activeJobsResult = await this.db.getAllActiveCronJobs();

      if (!activeJobsResult.success) {
        console.error('❌ Failed to get active cron jobs:', activeJobsResult.error);
        this.stats.failedExecutions++;
        return;
      }

      const activeJobs = activeJobsResult.data!;
      console.log(`📋 Found ${activeJobs.length} active cron jobs to execute\n`);

      if (activeJobs.length === 0) {
        console.log('✅ No active cron jobs to execute');
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Execute each cron job
      for (let i = 0; i < activeJobs.length; i++) {
        const cronJobWithUser = activeJobs[i];
        console.log(`\n[${i + 1}/${activeJobs.length}] Processing cron job...`);
        console.log(`   User: ${cronJobWithUser.user.chatId} (${cronJobWithUser.user.firstName})`);
        console.log(`   Plate: ${cronJobWithUser.plate}`);
        console.log(`   Vehicle Type: ${cronJobWithUser.vehicleType}`);

        try {
          // Execute the cron job
          const executionResult = await this.executionService.executeCronJob(cronJobWithUser);

          if (executionResult.success) {
            successCount++;

            // Get comparison result
            const comparisonResult = await this.executionService.compareWithPreviousLookup(
              cronJobWithUser.id,
              executionResult.lookupResult!,
            );

            // Send notification to user
            await this.notificationService.sendCronJobNotification({
              chatId: cronJobWithUser.user.chatId,
              plate: cronJobWithUser.plate,
              vehicleType: cronJobWithUser.vehicleType,
              executionResult,
              comparisonResult,
            });

            console.log(`   ✅ Success - Has new violations: ${comparisonResult.hasChanges}`);
          } else {
            failureCount++;
            console.log(`   ❌ Failed: ${executionResult.error}`);

            // Send error notification to user
            await this.notificationService.sendCronJobNotification({
              chatId: cronJobWithUser.user.chatId,
              plate: cronJobWithUser.plate,
              vehicleType: cronJobWithUser.vehicleType,
              executionResult,
              comparisonResult: {
                hasChanges: false,
                newViolations: [],
                removedViolations: [],
                totalViolations: 0,
                totalPaidViolations: 0,
                totalUnpaidViolations: 0,
              },
            });
          }

          // Add delay between executions to avoid overwhelming the system
          if (i < activeJobs.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
          }
        } catch (error) {
          failureCount++;
          console.error(`   ❌ Error executing cron job:`, error);
        }
      }

      // Update stats
      this.stats.successfulExecutions += successCount;
      this.stats.failedExecutions += failureCount;

      const duration = (new Date().getTime() - startTime.getTime()) / 1000;

      console.log('\n🎉 ============================================');
      console.log('🎉 Scheduled cron job execution completed!');
      console.log('🎉 ============================================');
      console.log(`📊 Total jobs: ${activeJobs.length}`);
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${failureCount}`);
      console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
      console.log(`⏰ Next execution: ${this.getNextExecutionTime()}\n`);
    } catch (error) {
      this.stats.failedExecutions++;
      console.error('\n❌ Error in scheduled execution:', error);
    }
  }

  /**
   * Manually trigger execution (for testing)
   */
  async executeNow(): Promise<void> {
    console.log('🔄 Manually triggering cron job execution...');
    await this.executeScheduledJobs();
  }

  /**
   * Get next execution time
   */
  getNextExecutionTime(): string {
    if (!this.cronTask) {
      return 'Not scheduled';
    }

    try {
      // Parse the cron expression and get the next run time
      const interval = CronExpressionParser.parse(this.config.schedule, {
        currentDate: new Date(),
        tz: this.config.timezone,
      });

      const next = interval.next().toDate();

      return next.toLocaleString('vi-VN', {
        timeZone: this.config.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('❌ Error calculating next execution time:', error);
      return 'Error calculating next run';
    }
  }

  /**
   * Get cron service statistics
   */
  getStats(): CronServiceStats {
    return {
      isRunning: this.cronTask !== null,
      schedule: this.config.schedule,
      lastExecution: this.stats.lastExecution,
      nextExecution: this.cronTask ? new Date(this.getNextExecutionTime()) : undefined,
      totalExecutions: this.stats.totalExecutions,
      successfulExecutions: this.stats.successfulExecutions,
      failedExecutions: this.stats.failedExecutions,
    };
  }

  /**
   * Update cron schedule
   */
  updateSchedule(newSchedule: string): void {
    // Validate cron expression
    if (!cron.validate(newSchedule)) {
      throw new Error('Invalid cron expression');
    }

    // Stop current task
    if (this.cronTask) {
      this.stop();
    }

    // Update config
    this.config.schedule = newSchedule;

    // Restart with new schedule
    this.start();

    console.log(`✅ Cron schedule updated to: ${newSchedule}`);
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.cronTask !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): CronServiceConfig {
    return { ...this.config };
  }
}
