import { ViolationRepository } from '../repositories/violationRepository';
import { LookupOptions, LookupResult, Violation } from '../types';

export class ViolationService {
  private violationRepository: ViolationRepository;

  constructor() {
    this.violationRepository = new ViolationRepository();
  }

  /**
   * Look up traffic violations by license plate number
   * @param plate - License plate number to look up
   * @param vehicleType - Type of vehicle (1: Car, 2: Motorcycle, 3: Electric bicycle)
   * @param options - Additional lookup options
   * @returns {Promise<LookupResult>} Lookup results
   * @throws {Error} When plate or vehicleType is invalid or missing
   */
  async lookupByPlate(
    plate: string,
    vehicleType: string,
    options: LookupOptions = {},
  ): Promise<LookupResult> {
    // Validate input
    if (!plate || !vehicleType) {
      throw new Error('Plate and vehicleType are required');
    }

    // Validate vehicle type
    const validVehicleTypes = ['1', '2', '3'];
    if (!validVehicleTypes.includes(vehicleType)) {
      throw new Error(
        'Invalid vehicle type. Must be 1 (Car), 2 (Motorcycle), or 3 (Electric bicycle)',
      );
    }

    // Clean plate number (remove spaces, dashes)
    const cleanPlate = plate.replace(/[\s-]/g, '').toUpperCase();

    // Call repository to get data with retry logic
    const result = await this.lookupWithRetry(cleanPlate, vehicleType, options);

    // Add any additional business logic here
    if (result.status === 'ok' && result.data) {
      // Add metadata
      result.data.lookupTime = new Date().toISOString();
      result.data.source = 'csgt.vn';

      // Log successful lookup
    }

    return result;
  }

  /**
   * Format violations data for different output formats
   */
  formatViolations(
    violations: Violation[],
    format: 'json' | 'telegram' | 'html' = 'json',
    retryCount?: number,
  ): Violation[] | string[] | string {
    switch (format) {
      case 'telegram':
        return this.formatForTelegram(violations, retryCount);
      case 'html':
        return this.formatForHtml(violations);
      case 'json':
      default:
        return violations;
    }
  }

  /**
   * Format violations for Telegram Bot
   */
  private formatForTelegram(violations: Violation[], retryCount?: number): string[] {
    if (!violations || violations.length === 0) {
      return ['✅ Không tìm thấy vi phạm nào cho phương tiện này.'];
    }

    const messages: string[] = [];
    const counts = this.calculateCounts(violations);

    // Add summary message
    let summaryMessage = `📊 Thống kê vi phạm:\n` +
      `🔸 Tổng số vi phạm: ${counts.total}\n` +
      `✅ Đã nộp phạt: ${counts.paid}\n` +
      `❌ Chưa nộp phạt: ${counts.unpaid}\n`;
    
    if (retryCount !== undefined && retryCount > 0) {
      summaryMessage += `🔄 Số lần thử lại captcha: ${retryCount}\n`;
    }
    
    summaryMessage += `\n=== Chi tiết các vi phạm ===\n`;
    
    messages.push(summaryMessage);

    for (const violation of violations) {
      let message = `🚨 Lỗi vi phạm lúc ${violation.violationTime}\n\n`;
      message += `📍 Địa điểm vi phạm: ${violation.location}\n\n`;
      message += `❌ Hành vi vi phạm: ${violation.violation}\n\n`;
      message += `💰 Mức phạt: ${violation.fine || 'Chưa có thông tin'}\n\n`;
      message += `📌 Trạng thái: ${violation.status || 'Chưa xử phạt'}\n\n`;
      message += `🏢 Đơn vị phụ trách: ${violation.resolutionDepartment || 'N/A'}\n\n`;

      if (violation.resolutionAddress) {
        message += `📮 Địa chỉ nộp phạt: ${violation.resolutionAddress}\n\n`;
      }

      if (violation.resolutionPhone) {
        message += `📞 ĐT liên hệ: ${violation.resolutionPhone}`;
      }

      messages.push(message);
    }

    return messages;
  }

  /**
   * Format violations for HTML display
   */
  private calculateCounts(violations: Violation[]): {
    paid: number;
    unpaid: number;
    total: number;
  } {
    const isPaid = (status: string = ''): boolean => {
      const s = status.toLowerCase();
      return s.includes('đã nộp') || s.includes('paid');
    };

    const isUnpaid = (status: string = ''): boolean => {
      const s = status.toLowerCase();
      return (
        s.includes('chưa xử phạt') ||
        s.includes('chưa nộp') ||
        s.includes('not') ||
        s.includes('unpaid') ||
        s.includes('not yet')
      );
    };

    return {
      total: violations.length,
      paid: violations.reduce((acc, v) => acc + (isPaid(v.status) ? 1 : 0), 0),
      unpaid: violations.reduce((acc, v) => acc + (isUnpaid(v.status) ? 1 : 0), 0),
    };
  }

  private formatForHtml(violations: Violation[]): string {
    if (!violations || violations.length === 0) {
      return '<p>Không tìm thấy vi phạm nào.</p>';
    }

    let html = '<div class="violations">';
    violations.forEach((violation, index) => {
      html += `
        <div class="violation-item">
          <h3>Vi phạm #${index + 1}</h3>
          <p><strong>Thời gian:</strong> ${violation.violationTime}</p>
          <p><strong>Địa điểm:</strong> ${violation.location}</p>
          <p><strong>Hành vi vi phạm:</strong> ${violation.violation}</p>
          <p><strong>Trạng thái:</strong> ${violation.status}</p>
          <p><strong>Đơn vị phụ trách:</strong> ${violation.resolutionDepartment}</p>
        </div>
      `;
    });
    html += '</div>';

    return html;
  }

  /**
   * Lookup violations with retry logic for handling 404 and other transient errors
   * @param plate - License plate number
   * @param vehicleType - Type of vehicle
   * @param options - Lookup options
   * @param maxRetries - Maximum number of retries (default: 2)
   * @returns {Promise<LookupResult>} Lookup result
   */
  private async lookupWithRetry(
    plate: string,
    vehicleType: string,
    options: LookupOptions,
    maxRetries: number = 5,
  ): Promise<LookupResult> {
    let lastError: Error | null = null;
    let totalRetryCaptcha = 0;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Force refresh captcha on retry attempts (except first attempt)
        const forceRefreshCaptcha = attempt > 1;
        const result = await this.violationRepository.lookupViolations(
          plate,
          vehicleType,
          options,
          forceRefreshCaptcha,
        );
        
        // Add captcha retry count to successful result
        if (result.status === 'ok' && result.data) {
          result.data.totalRetryCaptcha = totalRetryCaptcha;
        }
        
        return result;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Lookup if this is a retryable error
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt > maxRetries) {
          // Fix: Always stringify the error safely to avoid undefined error message access
          const errorMsg =
            error instanceof Error ? error.message || JSON.stringify(error) : JSON.stringify(error);
          console.error(`[ERROR] Service: Non-retryable error or max retries reached:`, errorMsg);
          break;
        }

        // Fix: Safely stringify error for warning log to prevent undefined error message access
        const warnMsg =
          error instanceof Error ? error.message || JSON.stringify(error) : JSON.stringify(error);
        console.warn(`[WARN] Service: Retryable error on attempt ${attempt}:`, warnMsg);

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));

        // For captcha validation errors, try to get a fresh captcha
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (
          errorMsg.includes('Captcha validation failed') ||
          errorMsg.includes('404') ||
          errorMsg.includes('403') ||
          errorMsg.includes('Timeout') ||
          errorMsg.includes('Server error')
        ) {
          // Remove any cached captcha to force fresh generation
          options.captchaText = undefined;
          totalRetryCaptcha++;

          // Removed automatic fallback to alternative captcha method.
          // Just clear the captcha and retry with the same method.
          // (No further logic needed here as captchaText has already been cleared above.)
        }
      }
    }

    // If all retries failed, return error result with retry count
    return {
      status: 'error',
      message: lastError?.message || 'Unknown error occurred',
      data: {
        plate,
        vehicleType,
        totalRetryCaptcha,
      },
    };
  }

  /**
   * Lookup if an error is retryable
   * @param error - Error to check
   * @returns {boolean} True if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;

    const message = error instanceof Error ? error.message : String(error);

    // Retryable errors
    if (
      message.includes('Captcha validation failed') ||
      message.includes('404') ||
      message.includes('403') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('Timeout') ||
      message.includes('Server error') ||
      message.includes('ECONNABORTED') ||
      message.includes('ETIMEDOUT')
    ) {
      return true;
    }

    return false;
  }
}
