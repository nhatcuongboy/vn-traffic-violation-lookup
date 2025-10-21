export interface User {
  id: number;
  chatId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CronJob {
  id: number;
  userId: number;
  plate: string;
  vehicleType: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LookupHistory {
  id: number;
  cronJobId: number;
  violations: string; // JSON string of violations array
  totalViolations: number;
  totalPaidViolations: number;
  totalUnpaidViolations: number;
  lookupTime: Date;
  hasNewViolations: boolean; // compared to previous lookup
  createdAt: Date;
}

export interface CronJobWithUser extends CronJob {
  user: User;
}

export interface LookupHistoryWithCronJob extends LookupHistory {
  cronJob: CronJob;
}

// Database initialization options
export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
}

// Database operation results
export interface DatabaseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Cron job statistics
export interface CronJobStats {
  totalActiveJobs: number;
  totalUsers: number;
  lastRunTime?: Date;
  nextRunTime?: Date;
  successRate: number; // percentage of successful runs
}
