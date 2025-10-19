import { NextFunction, Request, Response } from 'express';
import config from '../config';

/**
 * Error handling middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response): void => {
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  } else if (err && typeof err === 'object' && 'code' in err && err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service Unavailable';
  } else if (err && typeof err === 'object' && 'code' in err && err.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Gateway Timeout';
  } else {
    // Try to extract status code from error message
    const errorMessage = err.message || '';
    if (errorMessage.includes('404')) {
      statusCode = 404;
      message = errorMessage;
    } else if (errorMessage.includes('403')) {
      statusCode = 403;
      message = errorMessage;
    } else if (errorMessage.includes('401')) {
      statusCode = 401;
      message = errorMessage;
    } else if (errorMessage.includes('400')) {
      statusCode = 400;
      message = errorMessage;
    } else if (errorMessage.includes('503')) {
      statusCode = 503;
      message = errorMessage;
    } else if (errorMessage.includes('504')) {
      statusCode = 504;
      message = errorMessage;
    } else if (errorMessage.includes('Timeout')) {
      statusCode = 504;
      message = errorMessage;
    } else if (errorMessage.includes('Server error')) {
      statusCode = 502;
      message = errorMessage;
    } else if (errorMessage.includes('Captcha validation failed')) {
      statusCode = 400;
      message = errorMessage;
    } else {
      // Use the original error message if no specific code found
      message = errorMessage || 'Internal Server Error';
    }
  }

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: message,
    ...(config.debug && { stack: err.stack }),
  });
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.name = 'NotFoundError';
  next(error);
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`,
    );
  });

  next();
};
