import axios from 'axios';
import Tesseract from 'tesseract.js';
import config from '../config';
import { AutocaptchaResponse } from '../types';

export type CaptchaMethod = 'tesseract' | 'autocaptcha';

/**
 * Solve captcha using Tesseract OCR
 * @param imageBuffer - Buffer containing the captcha image
 * @param contentType - MIME type of the image
 * @returns {Promise<string>} Solved captcha text
 */
const solveWithTesseract = async (imageBuffer: Buffer, contentType: string): Promise<string> => {
  console.log(contentType);
  try {
    const {
      data: { text, confidence },
    } = await Tesseract.recognize(imageBuffer, config.captcha.tesseract.language, {
      logger: (): void => {
        // Progress logging removed
      },
      ...config.captcha.tesseract.options,
    });

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
        .map(char => {
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

    // If the primary method fails and we have a fallback, try the other method
    if (captchaMethod === 'tesseract' && config.captcha.autocaptcha.key) {
      try {
        return await solveWithAutocaptcha(imageBuffer, contentType);
      } catch (fallbackError) {
        console.error('[ERROR] Both Tesseract and Autocaptcha failed');
        throw new Error(
          `Captcha solving failed with both methods. Tesseract: ${error instanceof Error ? error.message : 'Unknown error'}, Autocaptcha: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
        );
      }
    } else if (captchaMethod === 'autocaptcha') {
      try {
        return await solveWithTesseract(imageBuffer, contentType);
      } catch (fallbackError) {
        console.error('[ERROR] Both Autocaptcha and Tesseract failed');
        throw new Error(
          `Captcha solving failed with both methods. Autocaptcha: ${error instanceof Error ? error.message : 'Unknown error'}, Tesseract: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
        );
      }
    }

    throw error;
  }
};
