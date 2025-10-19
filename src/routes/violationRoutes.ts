import { Router } from 'express';
import { ViolationController } from '../controllers/violationController';

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

export default router;
