import * as cheerio from 'cheerio';
import fs from 'fs';
import config from '../config';
import { Violation, ViolationCounts } from '../types';

/**
 * Parse HTML response from CSGT website into JSON format
 * @param html - HTML response from CSGT website
 * @returns {Violation[]} Array of parsed violations
 */
export const parseResultHtml = (html: string): Violation[] => {
  const $ = cheerio.load(html);

  // DEBUG: Save HTML to file for inspection (only in development)
  if (config.debug.saveResultHtml) {
    try {
      fs.writeFileSync('result.html', html, 'utf-8');
      console.log('[DEBUG] HTML result saved to: result.html');
    } catch (error) {
      // If file writing fails, just log the error but don't crash the app
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[WARN] Failed to save HTML result for debugging:', errorMessage);
    }
  }

  const violations: Violation[] = [];

  // Parse violations - each block starts with license plate information
  const bodyPrint = $('#bodyPrint123, #bodyPrint');

  if (bodyPrint.length > 0) {
    // Split into separate violations (delimited by <hr>)
    const formGroups = bodyPrint.find('.form-group');

    let currentViolation: Partial<Violation> = {};
    let violationCount = 0;

    formGroups.each((_, el) => {
      const text = $(el).text().trim();
      const label = $(el).find('label').text().trim();
      const value = $(el).find('.col-md-9').text().trim();

      // Start a new violation block
      if (label.includes('Biển kiểm soát')) {
        if (Object.keys(currentViolation).length > 0) {
          violations.push({ ...currentViolation } as Violation);
        }
        currentViolation = {
          plate: value,
          violationNumber: ++violationCount,
        };
      } else if (label.includes('Màu biển')) {
        currentViolation.plateColor = value;
      } else if (label.includes('Loại phương tiện')) {
        currentViolation.vehicleType = value;
      } else if (label.includes('Thời gian vi phạm')) {
        currentViolation.violationTime = value;
      } else if (label.includes('Địa điểm vi phạm')) {
        currentViolation.location = value;
      } else if (label.includes('Hành vi vi phạm')) {
        currentViolation.violation = value;
      } else if (label.includes('Trạng thái')) {
        currentViolation.status = value;
      } else if (label.includes('Nơi giải quyết')) {
        currentViolation.resolutionPlace = value;
      } else if (text && !label && text.includes('Đội CSGT')) {
        // Resolution department info
        currentViolation.resolutionDepartment = text;
      } else if (text && !label && text.includes('Địa chỉ:')) {
        currentViolation.resolutionAddress = text.replace('Địa chỉ:', '').trim();
      } else if (text && !label && text.includes('Số điện thoại')) {
        currentViolation.resolutionPhone = text.replace('Số điện thoại liên hệ:', '').trim();
      }
    });

    // Push the last violation
    if (Object.keys(currentViolation).length > 0) {
      violations.push(currentViolation as Violation);
    }
  }

  // Fallback: try alternative parsing if nothing found
  if (violations.length === 0) {
    // Find text containing traffic police unit - indicator of violation
    if (html.includes('Đội CSGT')) {
      violations.push({
        plate: '',
        violationNumber: 0,
        message: 'Violation found - need to parse HTML structure in more detail',
        rawPreview: html.substring(
          html.indexOf('Biển kiểm soát'),
          html.indexOf('Biển kiểm soát') + 500,
        ),
      });
    }
  }

  return violations;
};

/**
 * Calculate the number of paid and unpaid violations
 * @param violations - Array of violations
 * @returns Object containing paidCount and unpaidCount
 */
export const calculateViolationCounts = (violations: Violation[]): ViolationCounts => {
  const isPaid = (status?: string): boolean => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return (
      s.includes('đã xử phạt') ||
      s.includes('đã nộp') ||
      s.includes('paid') ||
      s.includes('processed') ||
      s.includes('resolved')
    );
  };

  const isUnpaid = (status?: string): boolean => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return (
      s.includes('chưa xử phạt') ||
      s.includes('chưa nộp') ||
      s.includes('not') ||
      s.includes('unpaid') ||
      s.includes('not yet')
    );
  };

  const totalPaidViolations = violations.reduce((acc, v) => acc + (isPaid(v.status) ? 1 : 0), 0);
  const totalUnpaidViolations = violations.reduce(
    (acc, v) => acc + (isUnpaid(v.status) ? 1 : 0),
    0,
  );

  return { totalPaidViolations, totalUnpaidViolations };
};
