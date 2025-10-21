import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  User,
  CronJob,
  LookupHistory,
  CronJobWithUser,
  DatabaseConfig,
  DatabaseResult,
  CronJobStats,
} from '../types/database';

// Raw database row types (dates are stored as strings in SQLite)
interface RawCronJob {
  id: number;
  userId: number;
  plate: string;
  vehicleType: string;
  isActive: number;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

interface RawUser {
  id: number;
  chatId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawLookupHistory {
  id: number;
  cronJobId: number;
  violations: string;
  totalViolations: number;
  totalPaidViolations: number;
  totalUnpaidViolations: number;
  lookupTime: string;
  hasNewViolations: number;
  createdAt: string;
}

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(config: DatabaseConfig) {
    this.dbPath = config.path;

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better concurrency
    if (config.enableWAL !== false) {
      this.db.pragma('journal_mode = WAL');
    }

    // Enable foreign keys
    if (config.enableForeignKeys !== false) {
      this.db.pragma('foreign_keys = ON');
    }

    // Initialize tables
    this.initializeTables();
  }

  /**
   * Convert raw database row to CronJob with proper Date objects
   */
  private convertToCronJob(row: RawCronJob): CronJob {
    return {
      ...row,
      isActive: Boolean(row.isActive),
      lastRun: row.lastRun ? new Date(row.lastRun) : undefined,
      nextRun: row.nextRun ? new Date(row.nextRun) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Convert raw database row to User with proper Date objects
   */
  private convertToUser(row: RawUser): User {
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Convert raw database row to LookupHistory with proper Date objects
   */
  private convertToLookupHistory(row: RawLookupHistory): LookupHistory {
    return {
      ...row,
      hasNewViolations: Boolean(row.hasNewViolations),
      lookupTime: new Date(row.lookupTime),
      createdAt: new Date(row.createdAt),
    };
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    try {
      // Users table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId INTEGER UNIQUE NOT NULL,
          username TEXT,
          firstName TEXT,
          lastName TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // CronJobs table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cronJobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          plate TEXT NOT NULL,
          vehicleType TEXT NOT NULL,
          isActive BOOLEAN DEFAULT 1,
          lastRun DATETIME,
          nextRun DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // LookupHistory table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS lookupHistory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cronJobId INTEGER NOT NULL,
          violations TEXT NOT NULL,
          totalViolations INTEGER DEFAULT 0,
          totalPaidViolations INTEGER DEFAULT 0,
          totalUnpaidViolations INTEGER DEFAULT 0,
          lookupTime DATETIME DEFAULT CURRENT_TIMESTAMP,
          hasNewViolations BOOLEAN DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cronJobId) REFERENCES cronJobs (id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_chatId ON users(chatId);
        CREATE INDEX IF NOT EXISTS idx_cronJobs_userId ON cronJobs(userId);
        CREATE INDEX IF NOT EXISTS idx_cronJobs_active ON cronJobs(isActive);
        CREATE INDEX IF NOT EXISTS idx_cronJobs_nextRun ON cronJobs(nextRun);
        CREATE INDEX IF NOT EXISTS idx_lookupHistory_cronJobId ON lookupHistory(cronJobId);
        CREATE INDEX IF NOT EXISTS idx_lookupHistory_lookupTime ON lookupHistory(lookupTime);
      `);

      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database tables:', error);
      throw error;
    }
  }

  /**
   * User operations
   */
  async createUser(
    chatId: number,
    username?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<DatabaseResult<User>> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (chatId, username, firstName, lastName)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(chatId, username, firstName, lastName);

      return {
        success: true,
        data: {
          id: result.lastInsertRowid as number,
          chatId,
          username,
          firstName,
          lastName,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getUserByChatId(chatId: number): Promise<DatabaseResult<User>> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE chatId = ?');
      const row = stmt.get(chatId);

      if (!row) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: this.convertToUser(row as RawUser),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateUser(
    chatId: number,
    updates: Partial<Pick<User, 'username' | 'firstName' | 'lastName'>>,
  ): Promise<DatabaseResult<User>> {
    try {
      const fields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updates);

      const stmt = this.db.prepare(`
        UPDATE users 
        SET ${fields}, updatedAt = CURRENT_TIMESTAMP 
        WHERE chatId = ?
      `);

      stmt.run(...values, chatId);

      // Return updated user
      return await this.getUserByChatId(chatId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * CronJob operations
   */
  async createCronJob(
    userId: number,
    plate: string,
    vehicleType: string,
  ): Promise<DatabaseResult<CronJob>> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO cronJobs (userId, plate, vehicleType)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(userId, plate, vehicleType);

      return {
        success: true,
        data: {
          id: result.lastInsertRowid as number,
          userId,
          plate,
          vehicleType,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getCronJobByUserId(userId: number): Promise<DatabaseResult<CronJob>> {
    try {
      const stmt = this.db.prepare('SELECT * FROM cronJobs WHERE userId = ?');
      const row = stmt.get(userId);

      if (!row) {
        return {
          success: false,
          error: 'Cron job not found',
        };
      }

      return {
        success: true,
        data: this.convertToCronJob(row as RawCronJob),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateCronJob(
    userId: number,
    updates: Partial<Pick<CronJob, 'plate' | 'vehicleType' | 'isActive' | 'lastRun' | 'nextRun'>>,
  ): Promise<DatabaseResult<CronJob>> {
    try {
      const fields = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updates).map((value) => {
        // Convert boolean to integer for SQLite
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        // Convert Date to ISO string for SQLite
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });

      const stmt = this.db.prepare(`
        UPDATE cronJobs 
        SET ${fields}, updatedAt = CURRENT_TIMESTAMP 
        WHERE userId = ?
      `);

      stmt.run(...values, userId);

      // Return updated cron job
      return await this.getCronJobByUserId(userId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getAllActiveCronJobs(): Promise<DatabaseResult<CronJobWithUser[]>> {
    try {
      const stmt = this.db.prepare(`
        SELECT cj.*, u.*
        FROM cronJobs cj
        JOIN users u ON cj.userId = u.id
        WHERE cj.isActive = 1
        ORDER BY cj.nextRun ASC
      `);

      const results = stmt.all() as Array<{
        id: number;
        userId: number;
        plate: string;
        vehicleType: string;
        isActive: number;
        lastRun: string | null;
        nextRun: string | null;
        createdAt: string;
        updatedAt: string;
        chatId: number;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
      }>;

      const cronJobsWithUsers: CronJobWithUser[] = results.map((row) => ({
        id: row.id,
        userId: row.userId,
        plate: row.plate,
        vehicleType: row.vehicleType,
        isActive: Boolean(row.isActive),
        lastRun: row.lastRun ? new Date(row.lastRun) : undefined,
        nextRun: row.nextRun ? new Date(row.nextRun) : undefined,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        user: {
          id: row.id,
          chatId: row.chatId,
          username: row.username,
          firstName: row.firstName,
          lastName: row.lastName,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      }));

      return {
        success: true,
        data: cronJobsWithUsers,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * LookupHistory operations
   */
  async createLookupHistory(
    cronJobId: number,
    violations: unknown[],
    totalViolations: number,
    totalPaidViolations: number,
    totalUnpaidViolations: number,
    hasNewViolations: boolean = false,
  ): Promise<DatabaseResult<LookupHistory>> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO lookupHistory (cronJobId, violations, totalViolations, totalPaidViolations, totalUnpaidViolations, hasNewViolations)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const violationsJson = JSON.stringify(violations);
      const result = stmt.run(
        cronJobId,
        violationsJson,
        totalViolations,
        totalPaidViolations,
        totalUnpaidViolations,
        hasNewViolations ? 1 : 0,
      );

      return {
        success: true,
        data: {
          id: result.lastInsertRowid as number,
          cronJobId,
          violations: violationsJson,
          totalViolations,
          totalPaidViolations,
          totalUnpaidViolations,
          lookupTime: new Date(),
          hasNewViolations,
          createdAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getLatestLookupHistory(cronJobId: number): Promise<DatabaseResult<LookupHistory>> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM lookupHistory 
        WHERE cronJobId = ? 
        ORDER BY lookupTime DESC 
        LIMIT 1
      `);

      const row = stmt.get(cronJobId);

      if (!row) {
        return {
          success: false,
          error: 'No lookup history found',
        };
      }

      return {
        success: true,
        data: this.convertToLookupHistory(row as RawLookupHistory),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getLookupHistoryByCronJobId(
    cronJobId: number,
    limit: number = 10,
  ): Promise<DatabaseResult<LookupHistory[]>> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM lookupHistory 
        WHERE cronJobId = ? 
        ORDER BY lookupTime DESC 
        LIMIT ?
      `);

      const rows = stmt.all(cronJobId, limit);

      return {
        success: true,
        data: rows.map((row) => this.convertToLookupHistory(row as RawLookupHistory)),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Statistics
   */
  async getCronJobStats(): Promise<DatabaseResult<CronJobStats>> {
    try {
      // Get total active jobs
      const activeJobsStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM cronJobs WHERE isActive = 1',
      );
      const activeJobsResult = activeJobsStmt.get() as { count: number };

      // Get total users
      const usersStmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
      const usersResult = usersStmt.get() as { count: number };

      // Get last run time
      const lastRunStmt = this.db.prepare(
        'SELECT MAX(lastRun) as lastRun FROM cronJobs WHERE lastRun IS NOT NULL',
      );
      const lastRunResult = lastRunStmt.get() as { lastRun: string | null };

      // Get next run time
      const nextRunStmt = this.db.prepare(
        'SELECT MIN(nextRun) as nextRun FROM cronJobs WHERE isActive = 1 AND nextRun IS NOT NULL',
      );
      const nextRunResult = nextRunStmt.get() as { nextRun: string | null };

      // Calculate success rate (simplified - based on recent lookups)
      const successRateStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN hasNewViolations = 1 OR totalViolations = 0 THEN 1 ELSE 0 END) as successful
        FROM lookupHistory 
        WHERE lookupTime >= datetime('now', '-7 days')
      `);
      const successRateResult = successRateStmt.get() as { total: number; successful: number };

      const successRate =
        successRateResult.total > 0
          ? (successRateResult.successful / successRateResult.total) * 100
          : 100;

      return {
        success: true,
        data: {
          totalActiveJobs: activeJobsResult.count,
          totalUsers: usersResult.count,
          lastRunTime: lastRunResult.lastRun ? new Date(lastRunResult.lastRun) : undefined,
          nextRunTime: nextRunResult.nextRun ? new Date(nextRunResult.nextRun) : undefined,
          successRate: Math.round(successRate * 100) / 100,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cleanup operations
   */
  async cleanupOldLookupHistory(daysToKeep: number = 30): Promise<DatabaseResult<number>> {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM lookupHistory 
        WHERE lookupTime < datetime('now', '-${daysToKeep} days')
      `);

      const result = stmt.run();

      return {
        success: true,
        data: result.changes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database instance (for advanced operations)
   */
  getDatabase(): Database.Database {
    return this.db;
  }
}
