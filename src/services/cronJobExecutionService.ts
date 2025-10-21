import { getDatabaseManager } from '../database';
import { CronJob } from '../types/database';
import { ViolationService } from './violationService';
import { LookupResult, Violation } from '../types';
import { CronExpressionParser } from 'cron-parser';
import config from '../config';

export interface CronJobExecutionResult {
  success: boolean;
  cronJob: CronJob;
  lookupResult?: LookupResult;
  hasNewViolations: boolean;
  error?: string;
}

export interface CronJobComparisonResult {
  hasChanges: boolean;
  newViolations: Violation[];
  removedViolations: Violation[];
  totalViolations: number;
  totalPaidViolations: number;
  totalUnpaidViolations: number;
}

export class CronJobExecutionService {
  private db = getDatabaseManager();
  private violationService: ViolationService;

  constructor() {
    this.violationService = new ViolationService();
  }

  /**
   * Execute cron job for a specific user
   */
  async executeCronJob(cronJob: CronJob): Promise<CronJobExecutionResult> {
    try {
      console.log(`🔄 Executing cron job for user ${cronJob.userId}, plate: ${cronJob.plate}`);

      // Perform violation lookup
      const lookupResult = await this.violationService.lookupByPlate(
        cronJob.plate,
        cronJob.vehicleType,
      );

      if (lookupResult.status === 'error') {
        console.error(`❌ Lookup failed for cron job ${cronJob.id}:`, lookupResult.message);

        return {
          success: false,
          cronJob,
          hasNewViolations: false,
          error: lookupResult.message || 'Lookup failed',
        };
      }

      // Compare with previous lookup
      const comparisonResult = await this.compareWithPreviousLookup(cronJob.id, lookupResult);

      // Create lookup history record
      const historyResult = await this.db.createLookupHistory(
        cronJob.id,
        lookupResult.data?.violations || [],
        lookupResult.data?.totalViolations || 0,
        lookupResult.data?.totalPaidViolations || 0,
        lookupResult.data?.totalUnpaidViolations || 0,
        comparisonResult.hasChanges,
      );

      if (!historyResult.success) {
        console.error(`❌ Failed to create lookup history for cron job ${cronJob.id}`);
      }

      // Update cron job run times
      const now = new Date();
      const nextRun = this.calculateNextRun();

      await this.db.updateCronJob(cronJob.userId, {
        lastRun: now,
        nextRun: nextRun,
      });

      console.log(`✅ Cron job ${cronJob.id} executed successfully`);

      return {
        success: true,
        cronJob,
        lookupResult,
        hasNewViolations: comparisonResult.hasChanges,
      };
    } catch (error) {
      console.error(`❌ Error executing cron job ${cronJob.id}:`, error);

      return {
        success: false,
        cronJob,
        hasNewViolations: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Compare current lookup result with previous lookup
   */
  async compareWithPreviousLookup(
    cronJobId: number,
    currentResult: LookupResult,
  ): Promise<CronJobComparisonResult> {
    try {
      // Get latest lookup history
      const historyResult = await this.db.getLatestLookupHistory(cronJobId);

      if (!historyResult.success) {
        // No previous lookup, consider all violations as new
        return {
          hasChanges: true,
          newViolations: currentResult.data?.violations || [],
          removedViolations: [],
          totalViolations: currentResult.data?.totalViolations || 0,
          totalPaidViolations: currentResult.data?.totalPaidViolations || 0,
          totalUnpaidViolations: currentResult.data?.totalUnpaidViolations || 0,
        };
      }

      const previousHistory = historyResult.data!;
      const previousViolations = JSON.parse(previousHistory.violations);
      const currentViolations = currentResult.data?.violations || [];

      // Compare violations
      const comparison = this.compareViolations(previousViolations, currentViolations);

      return {
        hasChanges: comparison.hasChanges,
        newViolations: comparison.newViolations,
        removedViolations: comparison.removedViolations,
        totalViolations: currentResult.data?.totalViolations || 0,
        totalPaidViolations: currentResult.data?.totalPaidViolations || 0,
        totalUnpaidViolations: currentResult.data?.totalUnpaidViolations || 0,
      };
    } catch (error) {
      console.error('❌ Error comparing with previous lookup:', error);

      // Return safe default
      return {
        hasChanges: true,
        newViolations: currentResult.data?.violations || [],
        removedViolations: [],
        totalViolations: currentResult.data?.totalViolations || 0,
        totalPaidViolations: currentResult.data?.totalPaidViolations || 0,
        totalUnpaidViolations: currentResult.data?.totalUnpaidViolations || 0,
      };
    }
  }

  /**
   * Compare two violation arrays
   */
  private compareViolations(
    previous: Violation[],
    current: Violation[],
  ): {
    hasChanges: boolean;
    newViolations: Violation[];
    removedViolations: Violation[];
  } {
    // Create maps for easier comparison
    const previousMap = new Map(previous.map((v) => [this.getViolationKey(v), v]));
    const currentMap = new Map(current.map((v) => [this.getViolationKey(v), v]));

    // Find new violations
    const newViolations = current.filter((v) => !previousMap.has(this.getViolationKey(v)));

    // Find removed violations
    const removedViolations = previous.filter((v) => !currentMap.has(this.getViolationKey(v)));

    const hasChanges = newViolations.length > 0 || removedViolations.length > 0;

    return {
      hasChanges,
      newViolations,
      removedViolations,
    };
  }

  /**
   * Generate a unique key for violation comparison
   */
  private getViolationKey(violation: Violation): string {
    // Use violation number and time as unique key
    return `${violation.violationNumber || ''}-${violation.violationTime || ''}`;
  }

  /**
   * Calculate next run time based on cron schedule
   */
  private calculateNextRun(): Date {
    try {
      // Parse the cron expression and get the next run time
      const interval = CronExpressionParser.parse(config.cron.schedule, {
        currentDate: new Date(),
        tz: config.cron.timezone,
      });

      return interval.next().toDate();
    } catch (error) {
      console.error('❌ Error calculating next run time:', error);

      // Fallback to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      return tomorrow;
    }
  }

  /**
   * Execute all active cron jobs
   */
  async executeAllActiveCronJobs(): Promise<CronJobExecutionResult[]> {
    try {
      console.log('🚀 Starting execution of all active cron jobs...');

      const activeJobsResult = await this.db.getAllActiveCronJobs();

      if (!activeJobsResult.success) {
        console.error('❌ Failed to get active cron jobs:', activeJobsResult.error);
        return [];
      }

      const activeJobs = activeJobsResult.data!;
      console.log(`📋 Found ${activeJobs.length} active cron jobs`);

      const results: CronJobExecutionResult[] = [];

      // Execute cron jobs sequentially to avoid overwhelming the system
      for (const cronJobWithUser of activeJobs) {
        const result = await this.executeCronJob(cronJobWithUser);
        results.push(result);

        // Add small delay between executions
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(`✅ Completed execution of ${activeJobs.length} cron jobs`);
      return results;
    } catch (error) {
      console.error('❌ Error executing all cron jobs:', error);
      return [];
    }
  }

  /**
   * Get cron job execution statistics
   */
  async getExecutionStats(): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    executionsWithNewViolations: number;
    lastExecution?: Date;
  }> {
    try {
      const statsResult = await this.db.getCronJobStats();

      if (!statsResult.success) {
        return {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          executionsWithNewViolations: 0,
        };
      }

      const stats = statsResult.data!;

      // Get additional stats from lookup history
      const db = this.db.getDatabase();
      const historyStats = db
        .prepare(
          `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN hasNewViolations = 1 THEN 1 ELSE 0 END) as withNewViolations
        FROM lookupHistory 
        WHERE lookupTime >= datetime('now', '-7 days')
      `,
        )
        .get() as { total: number; withNewViolations: number };

      return {
        totalExecutions: historyStats.total,
        successfulExecutions: Math.round((stats.successRate / 100) * historyStats.total),
        failedExecutions:
          historyStats.total - Math.round((stats.successRate / 100) * historyStats.total),
        executionsWithNewViolations: historyStats.withNewViolations,
        lastExecution: stats.lastRunTime,
      };
    } catch (error) {
      console.error('❌ Error getting execution stats:', error);

      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        executionsWithNewViolations: 0,
      };
    }
  }
}
