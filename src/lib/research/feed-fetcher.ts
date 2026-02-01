/**
 * Feed Fetcher - RSS feed aggregation and deduplication
 *
 * Fetches RSS feeds from configured sources, normalizes items,
 * applies recency filtering, and deduplicates content.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import Parser from 'rss-parser';
import { parse, stringify } from 'yaml';
import {
	type FeedConfig,
	FeedConfigSchema,
	type FeedItem,
	type FeedSettings,
	type NewsSource,
	SOURCE_TRUST_SCORES,
	type SourceCategory,
} from './source-types';

// ============================================
// Configuration
// ============================================

const CONFIG_DIR = `${process.env.HOME}/.yxhyx/config`;
const FEEDS_CONFIG_PATH = `${CONFIG_DIR}/feeds.yaml`;
const CACHE_DIR = `${process.env.HOME}/.yxhyx/cache/feeds`;

const DEFAULT_SETTINGS: FeedSettings = {
	max_items_per_feed: 20,
	max_age_hours: 48,
	dedup_threshold: 0.8,
};

// ============================================
// RSS Parser Setup
// ============================================

const parser = new Parser({
	timeout: 10000,
	headers: {
		'User-Agent': 'Yxhyx/1.0 (Personal AI Assistant)',
		Accept: 'application/rss+xml, application/xml, text/xml',
	},
	customFields: {
		item: [
			['content:encoded', 'contentEncoded'],
			['dc:creator', 'creator'],
		],
	},
});

// ============================================
// Feed Fetcher Class
// ============================================

export class FeedFetcher {
	private config: FeedConfig | null = null;
	private cacheEnabled = true;
	private cacheTtlMs = 15 * 60 * 1000; // 15 minutes

	/**
	 * Load feed configuration from YAML
	 */
	async loadConfig(): Promise<FeedConfig> {
		if (this.config) return this.config;

		if (!existsSync(FEEDS_CONFIG_PATH)) {
			// Return default empty config
			this.config = {
				feeds: {},
				settings: DEFAULT_SETTINGS,
			};
			return this.config;
		}

		try {
			const content = await readFile(FEEDS_CONFIG_PATH, 'utf-8');
			const rawConfig = parse(content);
			this.config = FeedConfigSchema.parse(rawConfig);
		} catch (error) {
			console.error('Failed to load feeds config:', error);
			this.config = {
				feeds: {},
				settings: DEFAULT_SETTINGS,
			};
		}

		return this.config;
	}

	/**
	 * Save configuration (for adding custom feeds)
	 */
	async saveConfig(config: FeedConfig): Promise<void> {
		await mkdir(CONFIG_DIR, { recursive: true });

		const content = stringify(config, {
			lineWidth: 120,
			defaultStringType: 'QUOTE_DOUBLE',
		});

		await writeFile(FEEDS_CONFIG_PATH, content, 'utf-8');
		this.config = config;
	}

	/**
	 * Get settings with defaults
	 */
	private getSettings(): FeedSettings {
		return this.config?.settings || DEFAULT_SETTINGS;
	}

	/**
	 * Fetch items from a single feed
	 */
	private async fetchSingleFeed(source: NewsSource, limit: number): Promise<FeedItem[]> {
		try {
			// Check cache first
			const cached = await this.getCachedFeed(source.url);
			if (cached) {
				return cached.slice(0, limit);
			}

			const feed = await parser.parseURL(source.url);

			const items: FeedItem[] = (feed.items || []).slice(0, limit).map((item) => ({
				title: item.title || 'Untitled',
				link: item.link || '',
				pubDate: new Date(item.pubDate || item.isoDate || Date.now()),
				source: source.name,
				sourceType: source.type,
				trustScore: source.trustScore ?? SOURCE_TRUST_SCORES[source.type] ?? 0.5,
				snippet: this.extractSnippet(item),
				guid: item.guid || item.link || item.title,
			}));

			// Cache the results
			await this.cacheFeed(source.url, items);

			return items;
		} catch (error) {
			console.error(`Failed to fetch ${source.name}: ${error}`);
			return [];
		}
	}

	/**
	 * Extract a clean snippet from feed item
	 */
	private extractSnippet(item: {
		contentSnippet?: string;
		content?: string;
		contentEncoded?: string;
	}): string | undefined {
		const rawContent = item.contentSnippet || item.content || item.contentEncoded;

		if (!rawContent) return undefined;

		// Strip HTML and limit length
		const clean = rawContent
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.substring(0, 300);

		return clean || undefined;
	}

	/**
	 * Get cached feed items
	 */
	private async getCachedFeed(url: string): Promise<FeedItem[] | null> {
		if (!this.cacheEnabled) return null;

		try {
			const cacheKey = Buffer.from(url).toString('base64url');
			const cachePath = `${CACHE_DIR}/${cacheKey}.json`;

			if (!existsSync(cachePath)) return null;

			const content = await readFile(cachePath, 'utf-8');
			const cached = JSON.parse(content);

			// Check TTL
			if (Date.now() - cached.timestamp > this.cacheTtlMs) {
				return null;
			}

			// Parse dates back
			return cached.items.map((item: FeedItem) => ({
				...item,
				pubDate: new Date(item.pubDate),
			}));
		} catch {
			return null;
		}
	}

	/**
	 * Cache feed items
	 */
	private async cacheFeed(url: string, items: FeedItem[]): Promise<void> {
		if (!this.cacheEnabled) return;

		try {
			await mkdir(CACHE_DIR, { recursive: true });

			const cacheKey = Buffer.from(url).toString('base64url');
			const cachePath = `${CACHE_DIR}/${cacheKey}.json`;

			await writeFile(
				cachePath,
				JSON.stringify({
					timestamp: Date.now(),
					items,
				}),
				'utf-8'
			);
		} catch {
			// Silently fail - caching is optional
		}
	}

	/**
	 * Fetch all items from a category
	 */
	async fetchCategory(category: string): Promise<FeedItem[]> {
		const config = await this.loadConfig();
		const feeds = config.feeds[category] || [];
		const settings = this.getSettings();

		if (feeds.length === 0) {
			return [];
		}

		// Fetch all feeds in parallel
		const results = await Promise.allSettled(
			feeds.map((feed) => this.fetchSingleFeed(feed, settings.max_items_per_feed))
		);

		const allItems: FeedItem[] = [];
		const maxAge = Date.now() - settings.max_age_hours * 60 * 60 * 1000;

		for (const result of results) {
			if (result.status === 'fulfilled') {
				// Filter by recency
				const recentItems = result.value.filter((item) => item.pubDate.getTime() > maxAge);
				allItems.push(...recentItems);
			}
		}

		// Sort by recency
		allItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

		// Deduplicate
		return this.deduplicate(allItems, settings.dedup_threshold);
	}

	/**
	 * Fetch all categories
	 */
	async fetchAllCategories(): Promise<Record<string, FeedItem[]>> {
		const config = await this.loadConfig();
		const categories = Object.keys(config.feeds);

		const results: Record<string, FeedItem[]> = {};

		await Promise.all(
			categories.map(async (category) => {
				results[category] = await this.fetchCategory(category);
			})
		);

		return results;
	}

	/**
	 * Get available categories
	 */
	async getCategories(): Promise<string[]> {
		const config = await this.loadConfig();
		return Object.keys(config.feeds).filter((cat) => (config.feeds[cat]?.length ?? 0) > 0);
	}

	/**
	 * Add a custom feed
	 */
	async addFeed(
		category: string,
		source: {
			name: string;
			url: string;
			type?: SourceCategory;
			priority?: 'high' | 'medium' | 'low';
		}
	): Promise<void> {
		const config = await this.loadConfig();

		const newSource: NewsSource = {
			name: source.name,
			url: source.url,
			type: source.type || 'newsletter',
			priority: source.priority || 'medium',
		};

		if (!config.feeds[category]) {
			config.feeds[category] = [];
		}

		// Check for duplicates
		const exists = config.feeds[category].some((s) => s.url === source.url);
		if (!exists) {
			config.feeds[category].push(newSource);
			await this.saveConfig(config);
		}
	}

	/**
	 * Remove a feed
	 */
	async removeFeed(category: string, url: string): Promise<boolean> {
		const config = await this.loadConfig();

		if (!config.feeds[category]) return false;

		const originalLength = config.feeds[category].length;
		config.feeds[category] = config.feeds[category].filter((s) => s.url !== url);

		if (config.feeds[category].length < originalLength) {
			await this.saveConfig(config);
			return true;
		}

		return false;
	}

	/**
	 * Deduplicate feed items based on title similarity
	 */
	private deduplicate(items: FeedItem[], threshold: number): FeedItem[] {
		const seen = new Map<string, FeedItem>();

		for (const item of items) {
			const normalizedTitle = this.normalizeTitle(item.title);

			let isDupe = false;

			for (const [key, existing] of seen) {
				const similarity = this.calculateSimilarity(normalizedTitle, key);

				if (similarity > threshold) {
					// Keep the version with higher trust score
					if (item.trustScore > existing.trustScore) {
						seen.delete(key);
						seen.set(normalizedTitle, item);
					}
					isDupe = true;
					break;
				}
			}

			if (!isDupe) {
				seen.set(normalizedTitle, item);
			}
		}

		return Array.from(seen.values());
	}

	/**
	 * Normalize title for comparison
	 */
	private normalizeTitle(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	/**
	 * Calculate Jaccard similarity between two strings
	 */
	private calculateSimilarity(a: string, b: string): number {
		const wordsA = new Set(a.split(' ').filter((w) => w.length > 2));
		const wordsB = new Set(b.split(' ').filter((w) => w.length > 2));

		if (wordsA.size === 0 || wordsB.size === 0) {
			return 0;
		}

		const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
		const union = new Set([...wordsA, ...wordsB]);

		return intersection.size / union.size;
	}

	/**
	 * Clear feed cache
	 */
	async clearCache(): Promise<void> {
		try {
			const { rm } = await import('node:fs/promises');
			await rm(CACHE_DIR, { recursive: true, force: true });
		} catch {
			// Ignore errors
		}
	}

	/**
	 * Set cache configuration
	 */
	setCacheConfig(options: { enabled?: boolean; ttlMs?: number }): void {
		if (options.enabled !== undefined) {
			this.cacheEnabled = options.enabled;
		}
		if (options.ttlMs !== undefined) {
			this.cacheTtlMs = options.ttlMs;
		}
	}

	/**
	 * Get feed statistics
	 */
	async getStats(): Promise<{
		categories: number;
		totalFeeds: number;
		feedsByCategory: Record<string, number>;
	}> {
		const config = await this.loadConfig();
		const feedsByCategory: Record<string, number> = {};
		let totalFeeds = 0;

		for (const [category, feeds] of Object.entries(config.feeds)) {
			feedsByCategory[category] = feeds.length;
			totalFeeds += feeds.length;
		}

		return {
			categories: Object.keys(config.feeds).length,
			totalFeeds,
			feedsByCategory,
		};
	}
}

// ============================================
// Export Singleton
// ============================================

export const feedFetcher = new FeedFetcher();
