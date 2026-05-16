import { describe, it, expect } from 'vitest';
import {
  classifyGeminiError,
  GeminiError,
  NoApiKeyError,
  InvalidApiKeyError,
  QuotaExceededError,
  SafetyFilterError,
  ModelOverloadedError,
  TimeoutError,
  NetworkError,
  UnknownGeminiError,
} from '../utils/errors';

describe('Error Classification System', () => {
  describe('classifyGeminiError', () => {
    it('should return the same error if it is already a GeminiError', () => {
      const originalError = new NoApiKeyError();
      const result = classifyGeminiError(originalError);
      expect(result).toBe(originalError);
    });

    it('should classify NO_API_KEY sentinel into NoApiKeyError', () => {
      const error = classifyGeminiError(new Error('NO_API_KEY'));
      expect(error).toBeInstanceOf(NoApiKeyError);
      expect(error.code).toBe('NO_API_KEY');
      expect(error.isRetryable).toBe(false);
      expect(error.userMessage).toContain('Please enter your Gemini API key');
    });

    it('should classify 403 / invalid key errors into InvalidApiKeyError', () => {
      const rawError = { status: 403, message: 'API key not valid' };
      const error = classifyGeminiError(rawError);
      expect(error).toBeInstanceOf(InvalidApiKeyError);
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.isRetryable).toBe(false);
    });

    it('should classify quota errors (429 + quota text) into QuotaExceededError', () => {
      const rawError = { status: 429, message: 'You have exceeded your quota' };
      const error = classifyGeminiError(rawError);
      expect(error).toBeInstanceOf(QuotaExceededError);
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.isRetryable).toBe(false);
    });

    it('should classify safety filter blocks into SafetyFilterError', () => {
      const rawError = new Error('Content blocked by safety filters');
      const error = classifyGeminiError(rawError);
      expect(error).toBeInstanceOf(SafetyFilterError);
      expect(error.code).toBe('SAFETY_FILTER');
      expect(error.isRetryable).toBe(true);
      expect(error.userMessage).toContain('safety filter');
    });

    it('should classify overloaded / 503 errors into ModelOverloadedError', () => {
      const rawError = { status: 503, message: 'Model is overloaded' };
      const error = classifyGeminiError(rawError);
      expect(error).toBeInstanceOf(ModelOverloadedError);
      expect(error.code).toBe('MODEL_OVERLOADED');
      expect(error.isRetryable).toBe(true);
    });

    it('should classify timeout errors correctly', () => {
      const rawError = new Error('The request timed out after 30 seconds');
      const error = classifyGeminiError(rawError);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.code).toBe('TIMEOUT');
      expect(error.isRetryable).toBe(true);
    });

    it('should classify network errors correctly', () => {
      const rawError = new Error('Network request failed');
      const error = classifyGeminiError(rawError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should fall back to UnknownGeminiError for unrecognized errors', () => {
      const rawError = { foo: 'bar' };
      const error = classifyGeminiError(rawError);
      expect(error).toBeInstanceOf(UnknownGeminiError);
      expect(error.code).toBe('UNKNOWN');
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('Error properties', () => {
    it('NoApiKeyError should have correct defaults', () => {
      const err = new NoApiKeyError();
      expect(err.code).toBe('NO_API_KEY');
      expect(err.userMessage).toContain('API key');
      expect(err.isRetryable).toBe(false);
    });

    it('SafetyFilterError should include custom details in the internal message', () => {
      const err = new SafetyFilterError('logo contained text');
      expect(err.message).toContain('logo contained text');
      expect(err.userMessage).toContain('rephrasing');
    });
  });
});
