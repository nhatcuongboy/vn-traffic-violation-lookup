import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import config from '../config';

/**
 * Create HTTP client with cookie support
 * @returns Axios client instance
 */
export const createHttpClient = (): AxiosInstance => {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: config.http.timeout,
    }),
  );
  return client;
};

/**
 * Create standard headers for CSGT requests
 * @param options - Additional headers
 * @returns Headers object
 */
export const createHeaders = (options: Record<string, string> = {}): Record<string, string> => {
  return {
    'User-Agent': config.http.userAgent,
    'Accept-Language': 'en,vi;q=0.9',
    ...options,
  };
};

/**
 * Create form data for AJAX requests
 * @param plate - License plate number
 * @param vehicleType - Vehicle type
 * @param captchaText - Captcha code
 * @returns URL encoded form data
 */
export const createFormData = (plate: string, vehicleType: string, captchaText: string): string => {
  const formData = new URLSearchParams();
  formData.append('BienKS', `${plate} `); // Note: trailing space
  formData.append('Xe', vehicleType);
  formData.append('captcha', captchaText);
  formData.append('ipClient', '9.9.9.91');
  formData.append('cUrl', '1');
  return formData.toString();
};
