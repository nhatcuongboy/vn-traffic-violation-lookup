import { Request, Response } from 'express';
import { ViolationService } from '../services/violationService';

export class ViolationController {
  private violationService: ViolationService;

  constructor() {
    this.violationService = new ViolationService();
  }

  /**
   * Map error message to appropriate HTTP status code
   * @param errorMessage - Error message from service
   * @returns HTTP status code
   */
  private getHttpStatusCodeFromError(errorMessage: string): number {
    if (errorMessage.includes('404')) {
      return 404;
    } else if (errorMessage.includes('403')) {
      return 403;
    } else if (errorMessage.includes('401')) {
      return 401;
    } else if (errorMessage.includes('400')) {
      return 400;
    } else if (errorMessage.includes('503')) {
      return 503;
    } else if (errorMessage.includes('504')) {
      return 504;
    } else if (errorMessage.includes('Timeout')) {
      return 504;
    } else if (errorMessage.includes('Server error')) {
      return 502;
    } else if (errorMessage.includes('Captcha validation failed')) {
      return 400; // Bad request due to invalid captcha
    } else {
      return 500; // Default to internal server error
    }
  }

  /**
   * GET /api/violations - Traffic violation lookup
   */
  async lookupViolations(req: Request, res: Response): Promise<void> {
    try {
      const { plate, vehicleType, captcha } = req.query;

      // Validate required parameters
      if (!plate || !vehicleType) {
        res.status(400).json({
          status: 'error',
          message: 'Missing required parameters: plate and vehicleType',
        });
        return;
      }

      // Prepare options
      const options: { captchaText?: string } = {};
      if (captcha) {
        options.captchaText = captcha as string;
      }

      // Call service
      const result = await this.violationService.lookupByPlate(
        plate as string,
        vehicleType as string,
        options,
      );

      // Return result
      if (result.status === 'error') {
        // Determine appropriate HTTP status code based on error message
        const statusCode = this.getHttpStatusCodeFromError(result.message || 'Unknown error');
        res.status(statusCode).json(result);
        return;
      }

      res.json(result);
    } catch (error: unknown) {
      console.error('[ERROR] Controller:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({
        status: 'error',
        message: errorMessage,
      });
    }
  }

  /**
   * GET /api/violations/telegram - Traffic violation lookup for Telegram Bot
   */
  async lookupViolationsForTelegram(req: Request, res: Response): Promise<void> {
    try {
      const { plate, vehicleType, captcha } = req.query;

      if (!plate || !vehicleType) {
        res.status(400).json({
          status: 'error',
          message: 'Missing required parameters: plate and vehicleType',
        });
        return;
      }

      const options: { captchaText?: string } = {};
      if (captcha) {
        options.captchaText = captcha as string;
      }

      const result = await this.violationService.lookupByPlate(
        plate as string,
        vehicleType as string,
        options,
      );

      if (result.status === 'error') {
        // Determine appropriate HTTP status code based on error message
        const statusCode = this.getHttpStatusCodeFromError(result.message || 'Unknown error');
        res.status(statusCode).json(result);
        return;
      }

      // Format for Telegram
      const formattedViolations = this.violationService.formatViolations(
        result.data?.violations || [],
        'telegram',
      );

      res.json({
        ...result,
        data: {
          ...result.data,
          formattedViolations,
        },
      });
    } catch (error: unknown) {
      console.error('[ERROR] Controller:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({
        status: 'error',
        message: errorMessage,
      });
    }
  }

  /**
   * GET /api/violations/html - Traffic violation lookup returns HTML
   */
  async lookupViolationsHtml(req: Request, res: Response): Promise<void> {
    try {
      const { plate, vehicleType, captcha } = req.query;

      if (!plate || !vehicleType) {
        res.status(400).send('<p>Missing required parameters: plate and vehicleType</p>');
        return;
      }

      const options: { captchaText?: string } = {};
      if (captcha) {
        options.captchaText = captcha as string;
      }

      const result = await this.violationService.lookupByPlate(
        plate as string,
        vehicleType as string,
        options,
      );

      if (result.status === 'error') {
        // Determine appropriate HTTP status code based on error message
        const statusCode = this.getHttpStatusCodeFromError(result.message || 'Unknown error');
        res.status(statusCode).send(`<p>Error: ${result.message}</p>`);
        return;
      }

      // Format for HTML
      const htmlViolations = this.violationService.formatViolations(
        result.data?.violations || [],
        'html',
      );

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tra cứu vi phạm giao thông</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .violation-item { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
            .violation-item h3 { color: #d32f2f; margin-top: 0; }
          </style>
        </head>
        <body>
          <h1>Kết quả tra cứu vi phạm giao thông</h1>
          <p><strong>Biển số:</strong> ${result.data?.plate}</p>
          <p><strong>Loại xe:</strong> ${result.data?.vehicleType}</p>
          <p><strong>Tổng số vi phạm:</strong> ${result.data?.totalViolations}</p>
          <p><strong>Số vi phạm đã nộp phạt:</strong> ${result.data?.totalPaidViolations}</p>
          <p><strong>Số vi phạm chưa nộp phạt:</strong> ${result.data?.totalUnpaidViolations}</p>
          ${htmlViolations}
        </body>
        </html>
      `;

      res.send(html);
    } catch (error: unknown) {
      console.error('[ERROR] Controller:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).send(`<p>Error: ${errorMessage}</p>`);
    }
  }
}
