import { getDatabaseManager } from '../database';
import { User, CronJob, DatabaseResult } from '../types/database';
import config from '../config';

export interface UserRegistrationData {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface CronJobSetupData {
  userId: number;
  plate: string;
  vehicleType: string;
}

export interface CronJobUpdateData {
  plate?: string;
  vehicleType?: string;
  isActive?: boolean;
}

export class UserService {
  private db = getDatabaseManager();

  /**
   * Register or get existing user
   */
  async registerOrGetUser(data: UserRegistrationData): Promise<DatabaseResult<User>> {
    try {
      // Try to get existing user first
      const existingUser = await this.db.getUserByChatId(data.chatId);

      if (existingUser.success) {
        // User exists, update info if needed
        const updates: Partial<Pick<User, 'username' | 'firstName' | 'lastName'>> = {};

        if (data.username && data.username !== existingUser.data?.username) {
          updates.username = data.username;
        }
        if (data.firstName && data.firstName !== existingUser.data?.firstName) {
          updates.firstName = data.firstName;
        }
        if (data.lastName && data.lastName !== existingUser.data?.lastName) {
          updates.lastName = data.lastName;
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          return await this.db.updateUser(data.chatId, updates);
        }

        return existingUser;
      }

      // User doesn't exist, create new one
      return await this.db.createUser(data.chatId, data.username, data.firstName, data.lastName);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user by chat ID
   */
  async getUserByChatId(chatId: number): Promise<DatabaseResult<User>> {
    return await this.db.getUserByChatId(chatId);
  }

  /**
   * Update user information
   */
  async updateUser(
    chatId: number,
    updates: Partial<Pick<User, 'username' | 'firstName' | 'lastName'>>,
  ): Promise<DatabaseResult<User>> {
    return await this.db.updateUser(chatId, updates);
  }

  /**
   * Check if user exists
   */
  async userExists(chatId: number): Promise<boolean> {
    const result = await this.db.getUserByChatId(chatId);
    return result.success;
  }

  /**
   * Get user statistics
   */
  async getUserStats(chatId: number): Promise<{
    user: User | null;
    hasCronJob: boolean;
    cronJob?: CronJob;
  }> {
    const userResult = await this.db.getUserByChatId(chatId);
    const user = userResult.success ? userResult.data! : null;

    if (!user) {
      return { user: null, hasCronJob: false };
    }

    const cronJobResult = await this.db.getCronJobByUserId(user.id);
    const cronJob = cronJobResult.success ? cronJobResult.data : undefined;

    return {
      user,
      hasCronJob: cronJobResult.success,
      cronJob,
    };
  }
}

export class CronJobService {
  private db = getDatabaseManager();

  /**
   * Setup cron job for user
   */
  async setupCronJob(data: CronJobSetupData): Promise<DatabaseResult<CronJob>> {
    try {
      // Check if user already has a cron job
      const existingCronJob = await this.db.getCronJobByUserId(data.userId);

      if (existingCronJob.success) {
        // Update existing cron job
        const updates: CronJobUpdateData = {
          plate: data.plate,
          vehicleType: data.vehicleType,
          isActive: true,
        };

        return await this.db.updateCronJob(data.userId, updates);
      }

      // Create new cron job
      return await this.db.createCronJob(data.userId, data.plate, data.vehicleType);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cron job by user ID
   */
  async getCronJobByUserId(userId: number): Promise<DatabaseResult<CronJob>> {
    return await this.db.getCronJobByUserId(userId);
  }

  /**
   * Get cron job by chat ID
   */
  async getCronJobByChatId(chatId: number): Promise<DatabaseResult<CronJob>> {
    try {
      const userResult = await this.db.getUserByChatId(chatId);

      if (!userResult.success) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return await this.db.getCronJobByUserId(userResult.data!.id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update cron job
   */
  async updateCronJob(
    userId: number,
    updates: CronJobUpdateData,
  ): Promise<DatabaseResult<CronJob>> {
    return await this.db.updateCronJob(userId, updates);
  }

  /**
   * Disable cron job
   */
  async disableCronJob(userId: number): Promise<DatabaseResult<CronJob>> {
    return await this.db.updateCronJob(userId, { isActive: false });
  }

  /**
   * Enable cron job
   */
  async enableCronJob(userId: number): Promise<DatabaseResult<CronJob>> {
    return await this.db.updateCronJob(userId, { isActive: true });
  }

  /**
   * Delete cron job (soft delete by disabling)
   */
  async deleteCronJob(userId: number): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.db.updateCronJob(userId, { isActive: false });

      return {
        success: result.success,
        data: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all active cron jobs
   */
  async getAllActiveCronJobs(): Promise<DatabaseResult<unknown[]>> {
    return await this.db.getAllActiveCronJobs();
  }

  /**
   * Update cron job run times
   */
  async updateCronJobRunTimes(
    userId: number,
    lastRun: Date,
    nextRun?: Date,
  ): Promise<DatabaseResult<CronJob>> {
    const updates: Partial<Pick<CronJob, 'lastRun' | 'nextRun'>> = {
      lastRun,
    };

    if (nextRun) {
      updates.nextRun = nextRun;
    }

    return await this.db.updateCronJob(userId, updates);
  }

  /**
   * Validate cron job data
   */
  validateCronJobData(data: CronJobSetupData): { valid: boolean; error?: string } {
    // Validate plate number
    if (!data.plate || data.plate.trim().length === 0) {
      return { valid: false, error: 'Biển số xe không được để trống' };
    }

    // Clean and validate plate format
    const cleanPlate = data.plate.replace(/[\s-]/g, '').toUpperCase();
    if (cleanPlate.length < 4 || cleanPlate.length > 12) {
      return { valid: false, error: 'Biển số xe không hợp lệ' };
    }

    // Validate vehicle type
    const validVehicleTypes = ['1', '2', '3'];
    if (!validVehicleTypes.includes(data.vehicleType)) {
      return {
        valid: false,
        error: 'Loại xe không hợp lệ. Phải là 1 (ô tô), 2 (xe máy), hoặc 3 (xe đạp điện)',
      };
    }

    return { valid: true };
  }

  /**
   * Get cron job status for user
   */
  async getCronJobStatus(chatId: number): Promise<{
    hasCronJob: boolean;
    cronJob?: CronJob;
    isActive: boolean;
    nextRun?: Date;
    lastRun?: Date;
  }> {
    const cronJobResult = await this.getCronJobByChatId(chatId);

    if (!cronJobResult.success) {
      return {
        hasCronJob: false,
        isActive: false,
      };
    }

    const cronJob = cronJobResult.data!;

    return {
      hasCronJob: true,
      cronJob,
      isActive: cronJob.isActive,
      nextRun: cronJob.nextRun,
      lastRun: cronJob.lastRun,
    };
  }
}
