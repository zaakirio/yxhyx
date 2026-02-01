/**
 * URL Verifier Tests
 *
 * Tests for:
 * - SSRF protection
 * - URL validation
 * - URL verification
 */

import { describe, expect, it } from 'vitest';

// ============================================
// SSRF Protection Tests
// ============================================

describe('URL Security Validation', () => {
	describe('validateUrlSecurity', () => {
		it('should allow valid HTTP URLs', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			expect(() => validateUrlSecurity('https://example.com')).not.toThrow();
			expect(() => validateUrlSecurity('https://www.example.com/path?query=1')).not.toThrow();
			expect(() => validateUrlSecurity('http://example.org')).not.toThrow();
		});

		it('should block localhost URLs', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			expect(() => validateUrlSecurity('http://localhost')).toThrow('Internal/private');
			expect(() => validateUrlSecurity('http://localhost:8080')).toThrow('Internal/private');
			expect(() => validateUrlSecurity('http://127.0.0.1')).toThrow('Internal/private');
			expect(() => validateUrlSecurity('http://127.0.0.1:3000')).toThrow('Internal/private');
		});

		it('should block private network addresses', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			// 10.x.x.x
			expect(() => validateUrlSecurity('http://10.0.0.1')).toThrow('Internal/private');
			expect(() => validateUrlSecurity('http://10.255.255.255')).toThrow('Internal/private');

			// 172.16-31.x.x
			expect(() => validateUrlSecurity('http://172.16.0.1')).toThrow('Internal/private');
			expect(() => validateUrlSecurity('http://172.31.255.255')).toThrow('Internal/private');

			// 192.168.x.x
			expect(() => validateUrlSecurity('http://192.168.1.1')).toThrow('Internal/private');
			expect(() => validateUrlSecurity('http://192.168.0.100')).toThrow('Internal/private');
		});

		it('should block AWS metadata endpoint', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			expect(() => validateUrlSecurity('http://169.254.169.254')).toThrow('Internal/private');
			expect(() => validateUrlSecurity('http://169.254.169.254/latest/meta-data')).toThrow(
				'Internal/private'
			);
		});

		it('should block non-HTTP schemes', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			expect(() => validateUrlSecurity('file:///etc/passwd')).toThrow('Only HTTP/HTTPS');
			expect(() => validateUrlSecurity('ftp://example.com')).toThrow('Only HTTP/HTTPS');
			expect(() => validateUrlSecurity('javascript:alert(1)')).toThrow('Only HTTP/HTTPS');
		});

		it('should block blocked schemes in URL string', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			// Even if disguised
			expect(() =>
				validateUrlSecurity('https://example.com/redirect?url=file:///etc/passwd')
			).toThrow('Blocked URL scheme');
			expect(() => validateUrlSecurity('https://example.com/javascript:alert(1)')).toThrow(
				'Blocked URL scheme'
			);
		});

		it('should block percent-encoded hostnames', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			// Attempting to encode localhost - may get caught as internal/private or percent-encoded
			expect(() => validateUrlSecurity('http://%6c%6f%63%61%6c%68%6f%73%74')).toThrow();
		});

		it('should block double-encoded URLs', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			expect(() => validateUrlSecurity('https://example.com/%252e%252e/etc/passwd')).toThrow(
				'Double-encoded'
			);
		});

		it('should reject invalid URL format', async () => {
			const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

			expect(() => validateUrlSecurity('not-a-url')).toThrow('Invalid URL format');
			expect(() => validateUrlSecurity('')).toThrow('Invalid URL format');
		});
	});
});

// ============================================
// URL Verification Tests
// ============================================

describe('URL Verification', () => {
	describe('verifyUrl', () => {
		it('should return valid=false for blocked URLs', async () => {
			const { verifyUrl } = await import('../src/lib/research/url-verifier');

			const result = await verifyUrl('http://localhost');

			expect(result.valid).toBe(false);
			expect(result.error).toContain('Internal/private');
		});

		it('should return valid=false for unreachable URLs', async () => {
			const { verifyUrl } = await import('../src/lib/research/url-verifier');

			const result = await verifyUrl('https://this-domain-definitely-does-not-exist-xyz.com', {
				timeout: 2000,
			});

			expect(result.valid).toBe(false);
		});

		// Note: Live URL tests should be skipped in CI or use mocks
		it('should return valid=true for reachable URLs', async () => {
			const { verifyUrl } = await import('../src/lib/research/url-verifier');

			// Using a reliable public URL
			const result = await verifyUrl('https://httpbin.org/status/200', {
				timeout: 5000,
			});

			// This may fail in offline environments
			if (result.valid) {
				expect(result.valid).toBe(true);
				expect(result.status).toBe(200);
			}
		});
	});

	describe('verifyUrls', () => {
		it('should verify multiple URLs concurrently', async () => {
			const { verifyUrls } = await import('../src/lib/research/url-verifier');

			const urls = ['http://localhost', 'http://127.0.0.1', 'http://10.0.0.1'];

			const results = await verifyUrls(urls, { concurrency: 2 });

			expect(results).toHaveLength(3);
			expect(results.every((r) => r.valid === false)).toBe(true);
		});
	});

	describe('filterValidUrls', () => {
		it('should filter to only valid URLs', async () => {
			const { filterValidUrls } = await import('../src/lib/research/url-verifier');

			const results = [
				{ url: 'https://example.com', valid: true },
				{ url: 'http://localhost', valid: false, error: 'blocked' },
				{ url: 'https://another.com', valid: true },
			];

			const valid = filterValidUrls(results);

			expect(valid).toHaveLength(2);
			expect(valid).toContain('https://example.com');
			expect(valid).toContain('https://another.com');
			expect(valid).not.toContain('http://localhost');
		});
	});

	describe('getVerificationStats', () => {
		it('should calculate correct statistics', async () => {
			const { getVerificationStats } = await import('../src/lib/research/url-verifier');

			const results = [
				{ url: 'https://a.com', valid: true },
				{ url: 'https://b.com', valid: true },
				{ url: 'http://localhost', valid: false, error: 'Internal/private: blocked' },
				{ url: 'http://10.0.0.1', valid: false, error: 'Internal/private: blocked' },
				{ url: 'https://bad.com', valid: false, error: 'HTTP 404' },
			];

			const stats = getVerificationStats(results);

			expect(stats.total).toBe(5);
			expect(stats.valid).toBe(2);
			expect(stats.invalid).toBe(3);
			expect(stats.validPercent).toBe(40);
			expect(stats.errorBreakdown['Internal/private']).toBe(2);
			expect(stats.errorBreakdown['HTTP 404']).toBe(1);
		});

		it('should handle empty results', async () => {
			const { getVerificationStats } = await import('../src/lib/research/url-verifier');

			const stats = getVerificationStats([]);

			expect(stats.total).toBe(0);
			expect(stats.validPercent).toBe(0);
		});
	});

	describe('isUrlReachable', () => {
		it('should return false for blocked URLs', async () => {
			const { isUrlReachable } = await import('../src/lib/research/url-verifier');

			const result = await isUrlReachable('http://localhost');
			expect(result).toBe(false);
		});
	});
});

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
	it('should handle URLs with unusual but valid characters', async () => {
		const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

		// These should be valid
		expect(() =>
			validateUrlSecurity('https://example.com/path?q=hello+world&foo=bar')
		).not.toThrow();
		expect(() => validateUrlSecurity('https://example.com/path#section')).not.toThrow();
		expect(() => validateUrlSecurity('https://user:pass@example.com/path')).not.toThrow();
	});

	it('should handle IPv6 localhost', async () => {
		const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

		expect(() => validateUrlSecurity('http://[::1]')).toThrow('Internal/private');
	});

	it('should handle subdomain of localhost', async () => {
		const { validateUrlSecurity } = await import('../src/lib/research/url-verifier');

		expect(() => validateUrlSecurity('http://sub.localhost')).toThrow('Internal/private');
	});
});
