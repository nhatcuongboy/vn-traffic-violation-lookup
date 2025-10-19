import { AxiosInstance } from 'axios';
import fs from 'fs';
import config from '../config';
import { CaptchaResponse, CSGTAjaxResponse, LookupOptions, LookupResult } from '../types';
import { CaptchaMethod, solveCaptcha } from '../utils/captchaSolver';
import { calculateViolationCounts, parseResultHtml } from '../utils/htmlParser';
import { createFormData, createHeaders, createHttpClient } from '../utils/httpClient';

export class ViolationRepository {
  private client: AxiosInstance;

  constructor() {
    this.client = createHttpClient();
  }

  /**
   * Initialize session and get cookies from CSGT website
   */
  async initSession(): Promise<void> {
    await this.client.get(config.csgt.baseUrl, {
      headers: createHeaders(),
    });
  }

  /**
   * Fetch captcha image from CSGT website
   * @returns {Promise<CaptchaResponse>} Buffer and content type of the captcha image
   */
  async fetchCaptchaImage(): Promise<CaptchaResponse> {
    const resp = await this.client.get(config.csgt.captchaEndpoint, {
      responseType: 'arraybuffer',
      headers: createHeaders({
        Referer: config.csgt.baseUrl,
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      }),
    });

    const buffer = Buffer.from(resp.data);
    const contentType = resp.headers['content-type'] || 'image/png';

    // Save captcha for debugging (only in development)
    if (config.debug.saveCaptcha) {
      try {
        fs.writeFileSync('captcha.png', buffer);
        console.log('[DEBUG] Captcha saved to: captcha.png');
      } catch (error) {
        // If file writing fails, just log the error but don't crash the app
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[WARN] Failed to save captcha for debugging:', errorMessage);
      }
    }

    return { buffer, contentType };
  }

  /**
   * Solve captcha using the configured method
   * @param imageBuffer - The captcha image buffer
   * @param contentType - Content type of the image
   * @param manualCaptcha - Optional manual captcha text input
   * @param method - Optional captcha solving method override
   * @returns {Promise<string>} Solved captcha text
   */
  async solveCaptcha(
    imageBuffer: Buffer,
    contentType: string,
    manualCaptcha?: string,
    method?: CaptchaMethod,
  ): Promise<string> {
    if (manualCaptcha) {
      return manualCaptcha;
    } else {
      const captchaMethod = method || config.captcha.defaultMethod;
      return await solveCaptcha(imageBuffer, contentType, captchaMethod);
    }
  }

  /**
   * Validate captcha through AJAX endpoint
   * @param plate - License plate number
   * @param vehicleType - Type of vehicle
   * @param captchaText - Solved captcha text
   * @returns {Promise<CSGTAjaxResponse>} AJAX response from validation
   * @throws {Error} When captcha validation fails
   */
  async validateCaptchaAjax(
    plate: string,
    vehicleType: string,
    captchaText: string,
  ): Promise<CSGTAjaxResponse> {
    const formData = createFormData(plate, vehicleType, captchaText);

    try {
      const resp = await this.client.post<CSGTAjaxResponse>(config.csgt.ajaxValidateUrl, formData, {
        headers: createHeaders({
          Accept: '*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: config.csgt.baseUrl,
          Referer: `${config.csgt.baseUrl}/`,
          'X-Requested-With': 'XMLHttpRequest',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        }),
      });

      // Lookup if validation is successful
      if (resp.data?.success !== 'true' && resp.data?.success !== true) {
        // Handle specific error cases from the response data
        const responseData = JSON.stringify(resp.data);
        if (responseData.includes('404')) {
          throw new Error(
            `Website endpoint may have changed or session expired. Please try again.`,
          );
        } else if (responseData.includes('403')) {
          throw new Error(`Access forbidden. Possible rate limiting.`);
        } else {
          throw new Error(`Captcha validation failed: ${responseData}`);
        }
      }

      return resp.data;
    } catch (error: unknown) {
      // Handle specific error cases
      const axiosError = error as { response?: { status?: number }; code?: string };

      if (axiosError.response?.status === 404) {
        console.error('[ERROR] 404 Error - Possible causes:');
        console.error('  - Website endpoint changed');
        console.error('  - Session expired');
        console.error('  - Captcha expired');
        console.error('  - Rate limiting applied');
        throw new Error(`Website endpoint may have changed or session expired. Please try again.`);
      } else if (axiosError.response?.status === 403) {
        throw new Error(`Access forbidden. Possible rate limiting.`);
      } else if (
        axiosError.response &&
        typeof axiosError.response.status === 'number' &&
        axiosError.response.status >= 500
      ) {
        throw new Error(`${axiosError.response.status} - Server error. Please try again later.`);
      } else if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        throw new Error(`Timeout - Server is slow to respond. Please try again.`);
      } else {
        // Re-throw the error as-is to avoid double-wrapping
        throw error;
      }
    }
  }

  /**
   * Fetch lookup results from CSGT website
   * @param redirectUrl - Optional URL to fetch results from (provided by AJAX response)
   * @returns {Promise<string>} HTML response containing the results
   */
  async fetchLookupResult(redirectUrl?: string): Promise<string> {
    const url = redirectUrl || config.csgt.lookupUrl;

    try {
      const resp = await this.client.get(url, {
        headers: createHeaders({
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          Referer: `${config.csgt.baseUrl}/`,
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        }),
      });

      return resp.data; // HTML string
    } catch (error: unknown) {
      // Handle specific error cases for result fetching
      const axiosError = error as { response?: { status?: number }; code?: string };
      if (axiosError.response?.status === 404) {
        throw new Error(`Website endpoint may have changed or session expired. Please try again.`);
      } else if (axiosError.response?.status === 403) {
        throw new Error(`Access forbidden. Possible rate limiting.`);
      } else if (
        axiosError.response &&
        typeof axiosError.response.status === 'number' &&
        axiosError.response.status >= 500
      ) {
        throw new Error(`${axiosError.response.status} - Server error. Please try again later.`);
      } else if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        throw new Error(`Timeout - Server is slow to respond. Please try again.`);
      } else {
        // Re-throw the error as-is to avoid double-wrapping
        throw error;
      }
    }
  }

  /**
   * Look up traffic violations for a given license plate
   * @param plate - License plate number to look up
   * @param vehicleType - Type of vehicle (1: Car, 2: Motorcycle, 3: Electric bicycle)
   * @param options - Additional lookup options including manual captcha text
   * @returns {Promise<LookupResult>} Lookup results including violations and counts
   *
   * The lookup process follows these steps:
   * 1. Initialize session to get cookies
   * 2. Fetch captcha image
   * 3. Solve captcha (automatically or manually)
   * 4. Validate captcha via AJAX
   * 5. Submit lookup request
   * 6. Parse and return results
   */
  async lookupViolations(
    plate: string,
    vehicleType: string,
    options: LookupOptions = {},
    forceRefreshCaptcha: boolean = false,
  ): Promise<LookupResult> {
    try {
      let captchaText: string;

      // 1. Init session to get cookies
      await this.initSession();

      // 2. Fetch captcha image (always fetch fresh if forceRefreshCaptcha is true)
      if (forceRefreshCaptcha || !options.captchaText) {
        const { buffer, contentType } = await this.fetchCaptchaImage();
        // 3. Solve captcha (manual or auto)
        captchaText = await this.solveCaptcha(buffer, contentType, options.captchaText);
      } else {
        // Use provided captcha text
        captchaText = options.captchaText;
      }

      // 4. Validate captcha via AJAX (required!)
      const ajaxResp = await this.validateCaptchaAjax(plate, vehicleType, captchaText);

      // 5. Submit lookup to get result - use URL from AJAX response
      const redirectUrl = ajaxResp?.href;
      const htmlResponse = await this.fetchLookupResult(redirectUrl);

      // 6. Parse HTML result
      const violations = parseResultHtml(htmlResponse);
      const counts = calculateViolationCounts(violations);

      return {
        status: 'ok',
        data: {
          plate,
          vehicleType,
          captcha: captchaText,
          violations,
          totalViolations: violations.length,
          totalPaidViolations: counts.totalPaidViolations,
          totalUnpaidViolations: counts.totalUnpaidViolations,
        },
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[ERROR] Repository error:', errorMessage);
      // Re-throw the error so it can be caught by retry logic
      throw err;
    }
  }
}
