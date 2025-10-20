import { Router } from 'express';
import { ViolationController } from '../controllers/violationController';
import { WorkerPoolManager } from '../utils/workerPoolManager';

const router = Router();
const violationController = new ViolationController();

/**
 * GET /api/violations?plate=51K67179&vehicleType=1
 * Query params:
 *   - plate: string (required)
 *   - vehicleType: string (required, 1=Car, 2=Motorcycle, 3=Electric bicycle)
 *   - captcha (optional, for manual solving)
 */
router.get('/violations', (req, res) => {
  violationController.lookupViolations(req, res);
});

/**
 * GET /api/violations/telegram?plate=51K67179&vehicleType=1
 * Same as above but returns data formatted for Telegram Bot
 */
router.get('/violations/telegram', (req, res) => {
  violationController.lookupViolationsForTelegram(req, res);
});

/**
 * GET /api/violations/html?plate=51K67179&vehicleType=1
 * Same as above but returns HTML page
 */
router.get('/violations/html', (req, res) => {
  violationController.lookupViolationsHtml(req, res);
});

/**
 * POST /api/violations/bulk
 * Request body:
 * {
 *   "vehicles": [
 *     { "plate": "51K67179", "vehicleType": "1" },
 *     { "plate": "30A12345", "vehicleType": "2" }
 *   ],
 *   "captcha": "optional_captcha_text"
 * }
 */
router.post('/violations/bulk', (req, res) => {
  violationController.lookupMultipleViolations(req, res);
});

/**
 * GET /api/worker-pool/status
 * Returns worker pool status
 */
router.get('/worker-pool/status', (req, res) => {
  try {
    const status = WorkerPoolManager.getStatus();
    const performance = WorkerPoolManager.getPerformanceInfo();

    res.json({
      success: true,
      data: {
        status,
        performance,
        isReady: WorkerPoolManager.isReady(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get worker pool status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/worker-pool/cleanup
 * Clean up worker pool
 */
router.post('/worker-pool/cleanup', async (req, res) => {
  try {
    await WorkerPoolManager.cleanup();
    res.json({
      success: true,
      message: 'Worker pool cleaned up successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup worker pool',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/worker-pool/initialize
 * Reinitialize worker pool
 */
router.post('/worker-pool/initialize', async (req, res) => {
  try {
    await WorkerPoolManager.initialize();
    const status = WorkerPoolManager.getStatus();

    res.json({
      success: true,
      message: 'Worker pool initialized successfully',
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to initialize worker pool',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
