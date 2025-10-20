import Tesseract from 'tesseract.js';
import config from '../config';

export interface TesseractWorkerPool {
  maxConcurrent: number;
  currentJobs: number;
  isInitialized: boolean;
}

class TesseractWorkerManager {
  private pool: TesseractWorkerPool = {
    maxConcurrent: config.captcha.tesseract.workerPool.maxWorkers,
    currentJobs: 0,
    isInitialized: true,
  };

  /**
   * Initialize worker pool (simplified)
   */
  async initialize(): Promise<void> {
    console.log(
      `[TesseractWorker] Initializing with max ${this.pool.maxConcurrent} concurrent jobs...`,
    );
    this.pool.isInitialized = true;
  }

  /**
   * Perform OCR with concurrent job limit
   */
  async recognize(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    // Wait if concurrent job limit is reached
    while (this.pool.currentJobs >= this.pool.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.pool.currentJobs++;

    try {
      const result = await Tesseract.recognize(imageBuffer, config.captcha.tesseract.language, {
        logger: (): void => {
          // Progress logging removed
        },
        ...config.captcha.tesseract.options,
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } finally {
      this.pool.currentJobs--;
    }
  }

  /**
   * Get worker pool status information
   */
  getPoolStatus(): {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    isInitialized: boolean;
  } {
    return {
      totalWorkers: this.pool.maxConcurrent,
      availableWorkers: this.pool.maxConcurrent - this.pool.currentJobs,
      busyWorkers: this.pool.currentJobs,
      isInitialized: this.pool.isInitialized,
    };
  }

  /**
   * Clean up worker pool
   */
  async cleanup(): Promise<void> {
    console.log('[TesseractWorker] Cleaning up...');
    this.pool.currentJobs = 0;
    this.pool.isInitialized = false;
    console.log('[TesseractWorker] Cleaned up');
  }
}

// Singleton instance
export const tesseractWorkerManager = new TesseractWorkerManager();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[TesseractWorker] Received SIGINT, cleaning up...');
  await tesseractWorkerManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[TesseractWorker] Received SIGTERM, cleaning up...');
  await tesseractWorkerManager.cleanup();
  process.exit(0);
});
