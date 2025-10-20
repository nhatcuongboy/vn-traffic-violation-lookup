import { tesseractWorkerManager } from './tesseractWorker';

/**
 * Manage worker pool and provide API to check status
 */
export class WorkerPoolManager {
  /**
   * Initialize worker pool
   */
  static async initialize(): Promise<void> {
    await tesseractWorkerManager.initialize();
  }

  /**
   * Get worker pool status information
   */
  static getStatus(): {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    isInitialized: boolean;
  } {
    return tesseractWorkerManager.getPoolStatus();
  }

  /**
   * Clean up worker pool
   */
  static async cleanup(): Promise<void> {
    await tesseractWorkerManager.cleanup();
  }

  /**
   * Check if worker pool is ready
   */
  static isReady(): boolean {
    const status = this.getStatus();
    return status.isInitialized && status.totalWorkers > 0;
  }

  /**
   * Get detailed worker pool performance information
   */
  static getPerformanceInfo(): {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    isInitialized: boolean;
    utilizationRate: number;
    availableCapacity: number;
    isOverloaded: boolean;
  } {
    const status = this.getStatus();
    const utilizationRate =
      status.totalWorkers > 0 ? (status.busyWorkers / status.totalWorkers) * 100 : 0;

    return {
      ...status,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      availableCapacity: status.availableWorkers,
      isOverloaded: status.busyWorkers === status.totalWorkers,
    };
  }
}

// Initialize worker pool when module is loaded
WorkerPoolManager.initialize().catch((error) => {
  console.error('[WorkerPoolManager] Failed to initialize worker pool:', error);
});
