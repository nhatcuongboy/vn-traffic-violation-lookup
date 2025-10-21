import { DatabaseManager } from './databaseManager';
import { DatabaseConfig } from '../types/database';
import path from 'path';

// Singleton instance
let databaseManager: DatabaseManager | null = null;

/**
 * Initialize database manager
 */
export function initializeDatabase(config?: Partial<DatabaseConfig>): DatabaseManager {
  if (databaseManager) {
    return databaseManager;
  }

  const defaultConfig: DatabaseConfig = {
    path: path.join(process.cwd(), 'data', 'cron_jobs.db'),
    enableWAL: true,
    enableForeignKeys: true,
    ...config,
  };

  databaseManager = new DatabaseManager(defaultConfig);
  console.log(`📊 Database initialized at: ${defaultConfig.path}`);

  return databaseManager;
}

/**
 * Get database manager instance
 */
export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return databaseManager;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (databaseManager) {
    databaseManager.close();
    databaseManager = null;
    console.log('📊 Database connection closed');
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDatabaseManager();
    const stats = await db.getCronJobStats();
    return stats.success;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}
