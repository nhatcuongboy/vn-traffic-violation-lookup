export interface LookupResult {
  status: 'ok' | 'error';
  message?: string;
  data?: LookupData;
}

export interface LookupData {
  plate: string;
  vehicleType: string;
  captcha?: string;
  violations?: Violation[];
  totalViolations?: number;
  totalPaidViolations?: number;
  totalUnpaidViolations?: number;
  lookupTime?: string;
  source?: string;
  totalRetryCaptcha?: number;
}

export interface Violation {
  plate: string;
  violationNumber: number;
  plateColor?: string;
  vehicleType?: string;
  violationTime?: string;
  location?: string;
  violation?: string;
  status?: string;
  resolutionPlace?: string;
  resolutionDepartment?: string;
  resolutionAddress?: string;
  resolutionPhone?: string;
  fine?: string;
  message?: string;
  rawPreview?: string;
}

export interface LookupOptions {
  captchaText?: string;
  saveCaptcha?: boolean;
}

export enum UserStep {
  ASK_VEHICLE_TYPE = 'ASK_VEHICLE_TYPE',
  ASK_PLATE = 'ASK_PLATE',
  FETCHING = 'FETCHING',
  CRON_ASK_VEHICLE_TYPE = 'CRON_ASK_VEHICLE_TYPE',
  CRON_ASK_PLATE = 'CRON_ASK_PLATE',
  CRON_SETUP = 'CRON_SETUP',
}

export enum UserAction {
  LOOKUP = 'lookup',
  CRON_SETUP = 'cron_setup',
  CRON_UPDATE = 'cron_update',
}

export interface UserState {
  step: UserStep;
  vehicleType?: string;
  plate?: string;
  action?: UserAction;
}

export interface CaptchaResponse {
  buffer: Buffer;
  contentType: string;
}

export interface AutocaptchaResponse {
  success?: boolean;
  captcha?: string;
  result?: string;
  data?: {
    text?: string;
  };
  text?: string;
  message?: string;
}

export interface CSGTAjaxResponse {
  success: string | boolean;
  href?: string;
  message?: string;
}

export interface ViolationCounts {
  totalPaidViolations: number;
  totalUnpaidViolations: number;
}

export interface TelegramCallbackData {
  new_search: string;
  refresh: string;
}

// Remove Express interfaces as they conflict with Express types

export interface BulkLookupRequest {
  vehicles: {
    plate: string;
    vehicleType: string;
  }[];
  captcha?: string;
}

export interface BulkLookupResult {
  status: 'ok' | 'error';
  message?: string;
  data?: {
    results: BulkVehicleResult[];
    summary: {
      totalVehicles: number;
      successfulLookups: number;
      failedLookups: number;
      totalViolations: number;
      totalPaidViolations: number;
      totalUnpaidViolations: number;
    };
    lookupTime?: string;
    source?: string;
  };
}

export interface BulkVehicleResult {
  plate: string;
  vehicleType: string;
  status: 'ok' | 'error';
  message?: string;
  data?: LookupData;
}

export interface Config {
  port: number;
  csgt: {
    baseUrl: string;
    lookupUrl: string;
    captchaEndpoint: string;
    ajaxValidateUrl: string;
  };
  captcha: {
    defaultMethod: 'tesseract' | 'autocaptcha';
    tesseract: {
      language: string;
      options: {
        tessedit_char_whitelist: string;
        tessedit_pageseg_mode: string;
        tessedit_ocr_engine_mode: string;
      };
      workerPool: {
        maxWorkers: number;
        enableWorkerPool: boolean;
      };
    };
    autocaptcha: {
      url: string;
      key: string;
      timeout: number;
    };
  };
  telegram: {
    token: string;
    polling: boolean;
  };
  http: {
    timeout: number;
    userAgent: string;
  };
  database: {
    path: string;
    enableWAL: boolean;
    enableForeignKeys: boolean;
  };
  cron: {
    schedule: string;
    timezone: string;
    enabled: boolean;
  };
  debug: {
    saveCaptcha: boolean;
    saveResultHtml: boolean;
  };
}
