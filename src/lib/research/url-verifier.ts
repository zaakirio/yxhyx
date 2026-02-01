/**
 * URL Verifier - Verify URLs before including in outputs
 *
 * AI models hallucinate URLs frequently. This module provides
 * robust URL verification with SSRF protection.
 *
 * Based on PAI's URL Verification Protocol and security best practices.
 */

import type { VerificationResult } from './source-types';

// ============================================
// Configuration
// ============================================

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const CONCURRENCY_LIMIT = 5;
const USER_AGENT = 'Yxhyx/1.0 (URL Verification)';

// ============================================
// SSRF Protection
// ============================================

/**
 * Blocked hostname patterns for SSRF protection
 */
const BLOCKED_HOSTS = [
	// Localhost
	'localhost',
	'127.0.0.1',
	'0.0.0.0',
	'[::1]',

	// AWS metadata
	'169.254.169.254',
	'metadata.google.internal',

	// Private networks
	/^10\./,
	/^172\.(1[6-9]|2[0-9]|3[0-1])\./,
	/^192\.168\./,
	/^fc00:/,
	/^fd00:/,

	// Link-local
	/^169\.254\./,
	/^fe80:/,
];

/**
 * Blocked URL schemes
 */
const BLOCKED_SCHEMES = ['file:', 'ftp:', 'gopher:', 'data:', 'javascript:', 'vbscript:'];

/**
 * Validate URL for security (SSRF protection)
 * @throws Error if URL is potentially malicious
 */
export function validateUrlSecurity(url: string): void {
	let parsed: URL;

	try {
		parsed = new URL(url);
	} catch {
		throw new Error('Invalid URL format');
	}

	// Check scheme
	if (!['http:', 'https:'].includes(parsed.protocol)) {
		throw new Error(`Only HTTP/HTTPS URLs allowed, got: ${parsed.protocol}`);
	}

	// Check for blocked schemes in the URL string itself
	for (const scheme of BLOCKED_SCHEMES) {
		if (url.toLowerCase().includes(scheme)) {
			throw new Error(`Blocked URL scheme detected: ${scheme}`);
		}
	}

	// Check hostname against blocked patterns
	const hostname = parsed.hostname.toLowerCase();

	for (const pattern of BLOCKED_HOSTS) {
		if (typeof pattern === 'string') {
			if (hostname === pattern || hostname.endsWith(`.${pattern}`)) {
				throw new Error(`Internal/private URL not allowed: ${hostname}`);
			}
		} else if (pattern instanceof RegExp) {
			if (pattern.test(hostname)) {
				throw new Error(`Internal/private URL not allowed: ${hostname}`);
			}
		}
	}

	// Check for URL encoding tricks
	if (/%[0-9a-fA-F]{2}/.test(hostname)) {
		throw new Error('Percent-encoded hostnames not allowed');
	}

	// Check for double-encoding
	if (/%25/.test(url)) {
		throw new Error('Double-encoded URLs not allowed');
	}

	// Character allowlisting for URL
	if (!/^[a-zA-Z0-9:\/\-._~?#\[\]@!$&'()*+,;=%]+$/.test(url)) {
		throw new Error('URL contains invalid characters');
	}
}

// ============================================
// URL Verification
// ============================================

/**
 * Verify a single URL
 *
 * Steps:
 * 1. Security validation (SSRF protection)
 * 2. HTTP status check (HEAD request)
 * 3. Content verification (optional GET request)
 */
export async function verifyUrl(
	url: string,
	options: {
		timeout?: number;
		verifyContent?: boolean;
	} = {}
): Promise<VerificationResult> {
	const { timeout = DEFAULT_TIMEOUT, verifyContent = false } = options;

	// Step 1: Security validation
	try {
		validateUrlSecurity(url);
	} catch (error) {
		return {
			url,
			valid: false,
			error: error instanceof Error ? error.message : 'Security validation failed',
		};
	}

	// Step 2: HTTP status check
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			// First try HEAD request (faster)
			const headResponse = await fetch(url, {
				method: 'HEAD',
				redirect: 'follow',
				signal: controller.signal,
				headers: {
					'User-Agent': USER_AGENT,
				},
			});

			clearTimeout(timeoutId);

			if (!headResponse.ok) {
				return {
					url,
					valid: false,
					status: headResponse.status,
					error: `HTTP ${headResponse.status}`,
				};
			}

			// Step 3: Content verification (if requested)
			if (verifyContent) {
				const getController = new AbortController();
				const getTimeoutId = setTimeout(() => getController.abort(), timeout);

				try {
					const contentResponse = await fetch(url, {
						method: 'GET',
						redirect: 'follow',
						signal: getController.signal,
						headers: {
							'User-Agent': USER_AGENT,
							Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
						},
					});

					clearTimeout(getTimeoutId);

					if (!contentResponse.ok) {
						return {
							url,
							valid: false,
							status: contentResponse.status,
							error: `Content fetch failed: HTTP ${contentResponse.status}`,
						};
					}

					const text = await contentResponse.text();

					// Extract title
					const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
					const title = titleMatch?.[1]?.trim();

					// Get content preview (first 200 chars of visible text)
					const contentPreview = text
						.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
						.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
						.replace(/<[^>]+>/g, ' ')
						.replace(/\s+/g, ' ')
						.trim()
						.substring(0, 200);

					return {
						url,
						valid: true,
						status: headResponse.status,
						title,
						contentPreview,
						verifiedAt: new Date().toISOString(),
					};
				} finally {
					clearTimeout(getTimeoutId);
				}
			}

			return {
				url,
				valid: true,
				status: headResponse.status,
				verifiedAt: new Date().toISOString(),
			};
		} finally {
			clearTimeout(timeoutId);
		}
	} catch (error) {
		let errorMessage = 'Unknown error';

		if (error instanceof Error) {
			if (error.name === 'AbortError') {
				errorMessage = 'Request timeout';
			} else {
				errorMessage = error.message;
			}
		}

		return {
			url,
			valid: false,
			error: errorMessage,
		};
	}
}

/**
 * Verify multiple URLs with concurrency control
 */
export async function verifyUrls(
	urls: string[],
	options: {
		timeout?: number;
		verifyContent?: boolean;
		concurrency?: number;
	} = {}
): Promise<VerificationResult[]> {
	const { concurrency = CONCURRENCY_LIMIT, ...verifyOptions } = options;

	const results: VerificationResult[] = [];

	// Process in batches for concurrency control
	for (let i = 0; i < urls.length; i += concurrency) {
		const batch = urls.slice(i, i + concurrency);
		const batchResults = await Promise.all(batch.map((url) => verifyUrl(url, verifyOptions)));
		results.push(...batchResults);
	}

	return results;
}

/**
 * Filter to only valid URLs from verification results
 */
export function filterValidUrls(results: VerificationResult[]): string[] {
	return results.filter((r) => r.valid).map((r) => r.url);
}

/**
 * Annotate sources with verification status
 */
export async function verifyAndAnnotateSources<T extends { url: string }>(
	sources: T[],
	options: {
		timeout?: number;
		verifyContent?: boolean;
	} = {}
): Promise<(T & { verified: boolean; verificationError?: string })[]> {
	const urls = sources.map((s) => s.url);
	const results = await verifyUrls(urls, options);

	const resultMap = new Map(results.map((r) => [r.url, r]));

	return sources.map((source) => {
		const result = resultMap.get(source.url);
		return {
			...source,
			verified: result?.valid ?? false,
			verificationError: result?.error,
		};
	});
}

// ============================================
// Quick Verification Helpers
// ============================================

/**
 * Quick check if a URL is reachable (status only)
 */
export async function isUrlReachable(url: string, timeout = 5000): Promise<boolean> {
	const result = await verifyUrl(url, { timeout, verifyContent: false });
	return result.valid;
}

/**
 * Get verification stats for a batch of URLs
 */
export function getVerificationStats(results: VerificationResult[]): {
	total: number;
	valid: number;
	invalid: number;
	validPercent: number;
	errorBreakdown: Record<string, number>;
} {
	const valid = results.filter((r) => r.valid).length;
	const invalid = results.length - valid;

	const errorBreakdown: Record<string, number> = {};
	for (const result of results) {
		if (result.error) {
			const errorType = result.error.split(':')[0] || 'Unknown';
			errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
		}
	}

	return {
		total: results.length,
		valid,
		invalid,
		validPercent: results.length > 0 ? (valid / results.length) * 100 : 0,
		errorBreakdown,
	};
}
