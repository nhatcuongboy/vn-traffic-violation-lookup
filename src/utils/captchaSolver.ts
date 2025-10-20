import axios from 'axios';
import { createWorker, Worker, PSM } from 'tesseract.js';
import config from '../config';
import { AutocaptchaResponse } from '../types';
// import { preprocessCaptchaImage } from './imagePreprocessor';

// Global worker instance for reuse
let worker: Worker | null = null;

export type CaptchaMethod = 'tesseract' | 'autocaptcha';

/**
 * Solve captcha using Tesseract OCR
 * @param imageBuffer - Buffer containing the captcha image
 * @param _contentType - MIME type of the image
 * @returns {Promise<string>} Solved captcha text
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const solveWithTesseract = async (imageBuffer: Buffer, _contentType: string): Promise<string> => {
  try {
    // Initialize worker if not exists
    if (!worker) {
      worker = await createWorker(config.captcha.tesseract.language, undefined, {
        logger: (): void => {}, // disable progress logging
      });
      await worker.setParameters({
        ...config.captcha.tesseract.options,
        tessedit_pageseg_mode: parseInt(
          config.captcha.tesseract.options.tessedit_pageseg_mode,
        ) as unknown as PSM,
        tessedit_ocr_engine_mode: parseInt(
          config.captcha.tesseract.options.tessedit_ocr_engine_mode,
        ),
      });
    }

    // Preprocess image before OCR
    // const preprocessedImage = await preprocessCaptchaImage(imageBuffer);

    // Reuse existing worker
    const {
      data: { text, confidence },
    } = await worker.recognize(imageBuffer);

    const cleanedText = text.trim().replace(/\s+/g, '');

    if (!cleanedText) {
      throw new Error('Tesseract OCR failed to extract text from captcha image');
    }

    // Lookup confidence score
    if (confidence < 30) {
      console.warn(
        `[WARN] Low confidence score: ${Math.round(confidence)}% - result might be inaccurate`,
      );
      // If confidence is very low and we have Autocaptcha available, suggest fallback
    }

    // Validate captcha format (typically 4-8 characters, alphanumeric)
    if (cleanedText.length < 3 || cleanedText.length > 10) {
      console.warn(`[WARN] Unusual captcha length: ${cleanedText.length} characters`);
    }

    // Lookup for common OCR mistakes and try to correct them
    let correctedText = cleanedText;

    // Common OCR mistakes
    const corrections: Record<string, string> = {
      '0': 'O', // Zero to letter O
      '1': 'l', // One to lowercase l
      '5': 'S', // Five to letter S
      '6': 'G', // Six to letter G
      '8': 'B', // Eight to letter B
      l: '1', // Lowercase l to one
      O: '0', // Letter O to zero
      S: '5', // Letter S to five
      G: '6', // Letter G to six
      B: '8', // Letter B to eight
    };

    // Apply corrections if confidence is low
    if (confidence < 50) {
      correctedText = cleanedText
        .split('')
        .map((char) => {
          const correction = corrections[char];
          return correction || char;
        })
        .join('');
    }

    return correctedText;
  } catch (error) {
    console.error('[ERROR] Tesseract OCR failed:', error);
    throw new Error(
      `Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Solve captcha using Autocaptcha API
 * @param imageBuffer - Buffer containing the captcha image
 * @param contentType - MIME type of the image
 * @returns {Promise<string>} Solved captcha text
 * @throws {Error} When AUTOCAPTCHA_KEY is not set in environment variables
 */
const solveWithAutocaptcha = async (imageBuffer: Buffer, contentType: string): Promise<string> => {
  if (!config.captcha.autocaptcha.key) {
    throw new Error('AUTOCAPTCHA_KEY not set in environment variables');
  }

  const dataUri = `data:${contentType};base64,${imageBuffer.toString('base64')}`;

  const body = {
    key: config.captcha.autocaptcha.key,
    type: 'imagetotext',
    img: dataUri,
    casesensitive: false,
  };

  const response = await axios.post<AutocaptchaResponse>(config.captcha.autocaptcha.url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: config.captcha.autocaptcha.timeout,
  });

  // Parse response - Autocaptcha returns field "captcha"
  const captchaText =
    response.data?.captcha ||
    response.data?.result ||
    response.data?.data?.text ||
    response.data?.text;

  if (!captchaText) {
    throw new Error(
      `Failed to extract captcha text from response: ${JSON.stringify(response.data)}`,
    );
  }

  // Lookup if solving was successful
  if (response.data?.success === false) {
    throw new Error(`Autocaptcha error: ${response.data?.message || 'Unknown error'}`);
  }

  return captchaText;
};

/**
 * Solve captcha using the specified method or default method
 * @param imageBuffer - Buffer containing the captcha image
 * @param contentType - MIME type of the image
 * @param method - Method to use ('tesseract' or 'autocaptcha'). If not specified, uses default from config
 * @returns {Promise<string>} Solved captcha text
 */
// Cleanup function to terminate worker
export const cleanupTesseract = async (): Promise<void> => {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
};

export const solveCaptcha = async (
  imageBuffer: Buffer,
  contentType: string,
  method?: CaptchaMethod,
): Promise<string> => {
  const captchaMethod = method || config.captcha.defaultMethod;

  try {
    switch (captchaMethod) {
      case 'tesseract':
        return await solveWithTesseract(imageBuffer, contentType);
      case 'autocaptcha':
        return await solveWithAutocaptcha(imageBuffer, contentType);
      default:
        throw new Error(`Unknown captcha method: ${captchaMethod}`);
    }
  } catch (error) {
    console.error(
      `[ERROR] ${captchaMethod} failed:`,
      error instanceof Error ? error.message : 'Unknown error',
    );

    // No fallback - throw error immediately
    throw error;
  }
};
