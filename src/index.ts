import { TelegramService } from './services/telegramService';
import { ViolationService } from './services/violationService';
import { LookupOptions, LookupResult } from './types';

// Export API for external use
const violationService = new ViolationService();

/**
 * Main API function - lookup violations by plate number
 */
export const lookupByPlate = async (
  plate: string,
  vehicleType: string,
  options: LookupOptions = {},
): Promise<LookupResult> => {
  return await violationService.lookupByPlate(plate, vehicleType, options);
};

// Export API
export { TelegramService, ViolationService };

// CLI usage
if (require.main === module) {
  (async (): Promise<void> => {
    const plate = process.argv[2] || '51K67179';
    const type = process.argv[3] || '1';
    const manualCaptcha = process.argv[4]; // optional: enter captcha manually

    // Lookup if at least one captcha method is available

    const res = await lookupByPlate(plate, type, {
      captchaText: manualCaptcha,
      saveCaptcha: true,
    });

    console.log('\n=== FINAL RESULT ===');
    console.log(JSON.stringify(res, null, 2));
  })();
}
