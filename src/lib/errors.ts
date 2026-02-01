/**
 * Error Handling - Comprehensive error classes for Yxhyx
 *
 * Provides:
 * - Typed error classes for different error categories
 * - User-friendly error messages
 * - Error recovery suggestions
 * - Graceful degradation helpers
 */

// ============================================
// Base Error Class
// ============================================

/**
 * Base error class for all Yxhyx errors
 */
export class YxhyxError extends Error {
	public readonly code: string;
	public readonly suggestion?: string;
	public readonly recoverable: boolean;
	public readonly originalError?: Error;

	constructor(
		message: string,
		options: {
			code: string;
			suggestion?: string;
			recoverable?: boolean;
			cause?: Error;
		}
	) {
		super(message);
		this.name = 'YxhyxError';
		this.code = options.code;
		this.suggestion = options.suggestion;
		this.recoverable = options.recoverable ?? false;
		this.originalError = options.cause;

		// Maintain proper stack trace
		Error.captureStackTrace(this, this.constructor);
	}

	/**
	 * Format error for user display
	 */
	toUserMessage(): string {
		let msg = `Error: ${this.message}`;
		if (this.suggestion) {
			msg += `\n\nSuggestion: ${this.suggestion}`;
		}
		return msg;
	}
}

// ============================================
// Specific Error Classes
// ============================================

/**
 * Configuration errors - missing/invalid config files
 */
export class ConfigError extends YxhyxError {
	constructor(
		message: string,
		options: {
			configPath?: string;
			suggestion?: string;
			cause?: Error;
		} = {}
	) {
		super(message, {
			code: 'CONFIG_ERROR',
			suggestion: options.suggestion || 'Check your configuration files in ~/.yxhyx/config/',
			recoverable: true,
			cause: options.cause,
		});
		this.name = 'ConfigError';
	}
}

/**
 * Not initialized error - Yxhyx hasn't been set up
 */
export class NotInitializedError extends YxhyxError {
	constructor() {
		super('Yxhyx is not initialized', {
			code: 'NOT_INITIALIZED',
			suggestion: 'Run `yxhyx init` to set up Yxhyx',
			recoverable: true,
		});
		this.name = 'NotInitializedError';
	}
}

/**
 * API errors - issues with external AI services
 */
export class ApiError extends YxhyxError {
	public readonly provider: string;
	public readonly statusCode?: number;

	constructor(
		message: string,
		options: {
			provider: string;
			statusCode?: number;
			suggestion?: string;
			cause?: Error;
		}
	) {
		const defaultSuggestion =
			options.statusCode === 401
				? `Check your ${options.provider} API key`
				: options.statusCode === 429
					? 'Rate limited - wait a moment and try again'
					: options.statusCode === 500
						? `${options.provider} is having issues - try a different model`
						: `Check your API configuration for ${options.provider}`;

		super(message, {
			code: 'API_ERROR',
			suggestion: options.suggestion || defaultSuggestion,
			recoverable: true,
			cause: options.cause,
		});
		this.name = 'ApiError';
		this.provider = options.provider;
		this.statusCode = options.statusCode;
	}
}

/**
 * No API key error - specific case of missing credentials
 */
export class NoApiKeyError extends YxhyxError {
	constructor(providers: string[]) {
		super('No API keys configured', {
			code: 'NO_API_KEY',
			suggestion: `Set at least one API key:\n${providers.map((p) => `  export ${p.toUpperCase()}_API_KEY=your_key`).join('\n')}`,
			recoverable: true,
		});
		this.name = 'NoApiKeyError';
	}
}

/**
 * Network errors - connectivity issues
 */
export class NetworkError extends YxhyxError {
	constructor(
		message: string,
		options: {
			url?: string;
			cause?: Error;
		} = {}
	) {
		super(message, {
			code: 'NETWORK_ERROR',
			suggestion: 'Check your internet connection and try again',
			recoverable: true,
			cause: options.cause,
		});
		this.name = 'NetworkError';
	}
}

/**
 * Timeout errors - request took too long
 */
export class TimeoutError extends YxhyxError {
	public readonly timeoutMs: number;

	constructor(
		message: string,
		options: {
			timeoutMs: number;
			suggestion?: string;
		}
	) {
		super(message, {
			code: 'TIMEOUT',
			suggestion: options.suggestion || 'The request timed out - try again or use a simpler query',
			recoverable: true,
		});
		this.name = 'TimeoutError';
		this.timeoutMs = options.timeoutMs;
	}
}

/**
 * Validation errors - invalid input data
 */
export class ValidationError extends YxhyxError {
	public readonly field?: string;

	constructor(
		message: string,
		options: {
			field?: string;
			suggestion?: string;
			cause?: Error;
		} = {}
	) {
		super(message, {
			code: 'VALIDATION_ERROR',
			suggestion: options.suggestion || 'Check the input and try again',
			recoverable: true,
			cause: options.cause,
		});
		this.name = 'ValidationError';
		this.field = options.field;
	}
}

/**
 * File system errors - issues reading/writing files
 */
export class FileSystemError extends YxhyxError {
	public readonly path: string;
	public readonly operation: 'read' | 'write' | 'delete' | 'create';

	constructor(
		message: string,
		options: {
			path: string;
			operation: 'read' | 'write' | 'delete' | 'create';
			cause?: Error;
		}
	) {
		const suggestionMap = {
			read: 'Check the file exists and you have read permissions',
			write: 'Check you have write permissions to this location',
			delete: 'Check you have write permissions to delete this file',
			create: 'Check the parent directory exists and you have write permissions',
		};

		super(message, {
			code: 'FILESYSTEM_ERROR',
			suggestion: suggestionMap[options.operation],
			recoverable: true,
			cause: options.cause,
		});
		this.name = 'FileSystemError';
		this.path = options.path;
		this.operation = options.operation;
	}
}

/**
 * Security errors - SSRF, blocked URLs, etc.
 */
export class SecurityError extends YxhyxError {
	constructor(
		message: string,
		options: {
			suggestion?: string;
		} = {}
	) {
		super(message, {
			code: 'SECURITY_ERROR',
			suggestion: options.suggestion || 'This operation was blocked for security reasons',
			recoverable: false,
		});
		this.name = 'SecurityError';
	}
}

// ============================================
// Error Handling Utilities
// ============================================

/**
 * Wrap an async operation with error handling
 */
export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	context: string
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof YxhyxError) {
			throw error; // Already a Yxhyx error
		}

		if (error instanceof Error) {
			// Detect specific error types
			if (error.message.includes('ENOENT')) {
				throw new FileSystemError(`File not found during ${context}`, {
					path: error.message.match(/path '([^']+)'/)?.[1] || 'unknown',
					operation: 'read',
					cause: error,
				});
			}

			if (error.message.includes('EACCES')) {
				throw new FileSystemError(`Permission denied during ${context}`, {
					path: error.message.match(/path '([^']+)'/)?.[1] || 'unknown',
					operation: 'write',
					cause: error,
				});
			}

			if (error.name === 'AbortError') {
				throw new TimeoutError(`Operation timed out during ${context}`, {
					timeoutMs: 0,
				});
			}

			// Generic error wrapping
			throw new YxhyxError(`${context}: ${error.message}`, {
				code: 'UNKNOWN_ERROR',
				recoverable: false,
				cause: error,
			});
		}

		throw new YxhyxError(`Unknown error during ${context}`, {
			code: 'UNKNOWN_ERROR',
			recoverable: false,
		});
	}
}

/**
 * Try an operation with a fallback value
 */
export async function withFallback<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
	try {
		return await operation();
	} catch {
		return fallback;
	}
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options: {
		maxAttempts?: number;
		initialDelayMs?: number;
		maxDelayMs?: number;
		shouldRetry?: (error: Error) => boolean;
	} = {}
): Promise<T> {
	const {
		maxAttempts = 3,
		initialDelayMs = 1000,
		maxDelayMs = 10000,
		shouldRetry = (error: Error) => error instanceof NetworkError || error instanceof TimeoutError,
	} = options;

	let lastError: Error | undefined;
	let delay = initialDelayMs;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt === maxAttempts || !shouldRetry(lastError)) {
				throw lastError;
			}

			await new Promise((resolve) => setTimeout(resolve, delay));
			delay = Math.min(delay * 2, maxDelayMs);
		}
	}

	throw lastError;
}

/**
 * Format any error for CLI display
 */
export function formatErrorForCli(error: unknown): string {
	if (error instanceof YxhyxError) {
		return error.toUserMessage();
	}

	if (error instanceof Error) {
		return `Error: ${error.message}`;
	}

	return `Error: ${String(error)}`;
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
	if (error instanceof YxhyxError) {
		return error.recoverable;
	}
	return false;
}
