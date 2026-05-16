/**
 * Typed Error System for Gemini API Interactions
 * 
 * This provides a robust, user-friendly error handling layer instead of
 * showing raw API errors to users.
 */

export type GeminiErrorCode =
  | 'NO_API_KEY'
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'SAFETY_FILTER'
  | 'MODEL_OVERLOADED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface GeminiErrorOptions {
  code: GeminiErrorCode;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  originalError?: unknown;
}

export class GeminiError extends Error {
  public readonly code: GeminiErrorCode;
  public readonly userMessage: string;
  public readonly isRetryable: boolean;
  public readonly originalError?: unknown;

  constructor(options: GeminiErrorOptions) {
    super(options.message);
    this.name = 'GeminiError';
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.isRetryable = options.isRetryable;
    this.originalError = options.originalError;

    // Maintain proper stack trace for where the error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeminiError);
    }
  }
}

// Specific error subclasses for easier `instanceof` checks in the UI

export class NoApiKeyError extends GeminiError {
  constructor(originalError?: unknown) {
    super({
      code: 'NO_API_KEY',
      message: 'No Gemini API key provided',
      userMessage: 'Please enter your Gemini API key to continue.',
      isRetryable: false,
      originalError,
    });
  }
}

export class InvalidApiKeyError extends GeminiError {
  constructor(originalError?: unknown) {
    super({
      code: 'INVALID_API_KEY',
      message: 'The provided Gemini API key is invalid or expired',
      userMessage: 'Your Gemini API key appears to be invalid. Please check it and try again.',
      isRetryable: false,
      originalError,
    });
  }
}

export class QuotaExceededError extends GeminiError {
  constructor(originalError?: unknown) {
    super({
      code: 'QUOTA_EXCEEDED',
      message: 'Gemini API quota exceeded',
      userMessage: 'You have reached your Gemini API quota. Please check your billing or try again later.',
      isRetryable: false,
      originalError,
    });
  }
}

export class SafetyFilterError extends GeminiError {
  constructor(details: string = '', originalError?: unknown) {
    super({
      code: 'SAFETY_FILTER',
      message: `Content blocked by Gemini safety filters: ${details}`,
      userMessage: 'The AI safety filter blocked this generation (common with certain symbols or words). Try rephrasing your mission or regenerating the logo.',
      isRetryable: true,
      originalError,
    });
  }
}

export class ModelOverloadedError extends GeminiError {
  constructor(originalError?: unknown) {
    super({
      code: 'MODEL_OVERLOADED',
      message: 'Gemini model is currently overloaded',
      userMessage: 'Gemini is experiencing high load. We\'ll retry automatically, but you can also try again in a moment.',
      isRetryable: true,
      originalError,
    });
  }
}

export class TimeoutError extends GeminiError {
  constructor(originalError?: unknown) {
    super({
      code: 'TIMEOUT',
      message: 'Request to Gemini timed out',
      userMessage: 'The request took too long. This can happen with complex image generations. Please try again.',
      isRetryable: true,
      originalError,
    });
  }
}

export class NetworkError extends GeminiError {
  constructor(originalError?: unknown) {
    super({
      code: 'NETWORK_ERROR',
      message: 'Network error while contacting Gemini',
      userMessage: 'Could not connect to Gemini. Please check your internet connection and try again.',
      isRetryable: true,
      originalError,
    });
  }
}

export class UnknownGeminiError extends GeminiError {
  constructor(originalError?: unknown) {
    const message = originalError instanceof Error ? originalError.message : 'Unknown error';
    super({
      code: 'UNKNOWN',
      message: `Unknown Gemini error: ${message}`,
      userMessage: 'Something unexpected went wrong with the AI service. Please try again.',
      isRetryable: true,
      originalError,
    });
  }
}

/**
 * Classifies any thrown error from the Gemini SDK into our typed error system.
 */
export function classifyGeminiError(error: unknown): GeminiError {
  if (error instanceof GeminiError) {
    return error;
  }

  const err = error as any;
  const message = err?.message || String(error);
  const status = err?.status || err?.response?.status;

  // Missing key (our own sentinel)
  if (message === 'NO_API_KEY' || message.includes('NO_API_KEY')) {
    return new NoApiKeyError(error);
  }

  // Invalid / expired key
  if (
    status === 400 ||
    status === 403 ||
    message.toLowerCase().includes('api key not valid') ||
    message.toLowerCase().includes('invalid api key') ||
    message.toLowerCase().includes('permission denied')
  ) {
    return new InvalidApiKeyError(error);
  }

  // Quota / billing issues
  if (
    status === 429 ||
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('billing') ||
    message.toLowerCase().includes('exceeded')
  ) {
    return new QuotaExceededError(error);
  }

  // Safety filter blocks (Imagen especially)
  if (
    message.toLowerCase().includes('safety') ||
    message.toLowerCase().includes('blocked') ||
    message.toLowerCase().includes('content policy') ||
    message.toLowerCase().includes('filtered')
  ) {
    return new SafetyFilterError(message, error);
  }

  // Transient overload / unavailable
  if (
    status === 503 ||
    status === 429 ||
    message.toLowerCase().includes('overloaded') ||
    message.toLowerCase().includes('unavailable') ||
    message.toLowerCase().includes('try again later')
  ) {
    return new ModelOverloadedError(error);
  }

  // Timeout (check early and explicitly)
  if (
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('timed out') ||
    err?.name === 'TimeoutError'
  ) {
    return new TimeoutError(error);
  }

  // Network / fetch errors
  if (
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('fetch')
  ) {
    return new NetworkError(error);
  }

  return new UnknownGeminiError(error);
}

/**
 * Returns a short, user-friendly title for the error code.
 */
export function getErrorTitle(error: GeminiError): string {
  switch (error.code) {
    case 'NO_API_KEY': return 'API Key Required';
    case 'INVALID_API_KEY': return 'Invalid API Key';
    case 'QUOTA_EXCEEDED': return 'Quota Reached';
    case 'SAFETY_FILTER': return 'Content Blocked';
    case 'MODEL_OVERLOADED': return 'Service Busy';
    case 'TIMEOUT': return 'Request Timed Out';
    case 'NETWORK_ERROR': return 'Connection Problem';
    default: return 'Something Went Wrong';
  }
}
