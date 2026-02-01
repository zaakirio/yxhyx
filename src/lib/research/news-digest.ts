/**
 * News Digest - Personalized news aggregation and summarization
 *
 * Generates AI-powered news digests tailored to user interests
 * and goals, with goal-relevance matching and highlights.
 */

import { loadIdentity } from '../context-loader';
import { modelRouter } from '../model-router';
import { feedFetcher } from './feed-fetcher';
import type { FeedItem } from './source-types';

// ============================================
// Types
// ============================================

export type RelevanceLevel = 'high' | 'medium' | 'low';

export interface ScoredFeedItem extends FeedItem {
	relevance: RelevanceLevel;
	relevanceScore: number;
	matchedInterests: string[];
}

export interface GoalRelevantItem {
	item: FeedItem;
	relatedGoal: string;
	relevanceReason: string;
}

export interface CategoryDigest {
	name: string;
	items: Array<{
		title: string;
		link: string;
		source: string;
		relevance: RelevanceLevel;
		summary?: string;
		pubDate: Date;
	}>;
	itemCount: number;
}

export interface NewsDigest {
	generated: string;
	categories: CategoryDigest[];
	highlights: string[];
	goalRelevant: GoalRelevantItem[];
	stats: {
		totalItems: number;
		highRelevance: number;
		categoriesProcessed: number;
	};
}

// ============================================
// Relevance Scoring
// ============================================

/**
 * Extract keywords for matching from interests
 */
function extractInterestKeywords(
	interests: Array<{ topic: string; subtopics: string[] }>
): Set<string> {
	const keywords = new Set<string>();

	for (const interest of interests) {
		// Add main topic and its words
		keywords.add(interest.topic.toLowerCase());
		for (const word of interest.topic.toLowerCase().split(/\s+/)) {
			if (word.length > 2) keywords.add(word);
		}

		// Add subtopics
		for (const subtopic of interest.subtopics) {
			keywords.add(subtopic.toLowerCase());
			for (const word of subtopic.toLowerCase().split(/\s+/)) {
				if (word.length > 2) keywords.add(word);
			}
		}
	}

	return keywords;
}

/**
 * Score item relevance based on user interests
 */
function scoreItemRelevance(
	item: FeedItem,
	highPriorityKeywords: Set<string>,
	mediumPriorityKeywords: Set<string>,
	lowPriorityKeywords: Set<string>
): { relevance: RelevanceLevel; score: number; matchedInterests: string[] } {
	const titleLower = item.title.toLowerCase();
	const snippetLower = (item.snippet || '').toLowerCase();
	const content = `${titleLower} ${snippetLower}`;

	const matchedInterests: string[] = [];
	let score = 0;

	// Check high priority (3 points each)
	for (const keyword of highPriorityKeywords) {
		if (content.includes(keyword)) {
			score += 3;
			matchedInterests.push(keyword);
		}
	}

	// Check medium priority (2 points each)
	for (const keyword of mediumPriorityKeywords) {
		if (content.includes(keyword)) {
			score += 2;
			matchedInterests.push(keyword);
		}
	}

	// Check low priority (1 point each)
	for (const keyword of lowPriorityKeywords) {
		if (content.includes(keyword)) {
			score += 1;
			matchedInterests.push(keyword);
		}
	}

	// Factor in source trust score
	score += item.trustScore * 2;

	// Determine relevance level
	let relevance: RelevanceLevel;
	if (score >= 6) {
		relevance = 'high';
	} else if (score >= 3) {
		relevance = 'medium';
	} else {
		relevance = 'low';
	}

	return { relevance, score, matchedInterests: [...new Set(matchedInterests)] };
}

/**
 * Check if an item is relevant to user goals
 */
function findGoalRelevance(
	item: FeedItem,
	goals: Array<{ title: string; description?: string }>
): { relatedGoal: string; relevanceReason: string } | null {
	const titleLower = item.title.toLowerCase();
	const snippetLower = (item.snippet || '').toLowerCase();

	for (const goal of goals) {
		// Extract significant words from goal
		const goalWords = goal.title
			.toLowerCase()
			.split(/\W+/)
			.filter((w) => w.length > 3);

		for (const word of goalWords) {
			if (titleLower.includes(word) || snippetLower.includes(word)) {
				return {
					relatedGoal: goal.title,
					relevanceReason: `Contains keyword "${word}" from your goal`,
				};
			}
		}
	}

	return null;
}

// ============================================
// Digest Generation
// ============================================

/**
 * Generate a personalized news digest
 */
export async function generateNewsDigest(options: {
	categories?: string[];
	maxItemsPerCategory?: number;
	generateHighlights?: boolean;
}): Promise<NewsDigest> {
	const {
		categories: requestedCategories,
		maxItemsPerCategory = 10,
		generateHighlights = true,
	} = options;

	// Load user identity for personalization
	const identity = await loadIdentity();

	// Build interest keywords sets
	const highPriorityKeywords = extractInterestKeywords(identity.interests.high_priority);
	const mediumPriorityKeywords = extractInterestKeywords(identity.interests.medium_priority);
	const lowPriorityKeywords = extractInterestKeywords(identity.interests.low_priority);

	// Get active goals for goal-relevance matching
	const activeGoals = [
		...identity.goals.short_term,
		...identity.goals.medium_term,
		...identity.goals.long_term,
	].filter((g) => g.progress < 1);

	// Fetch feeds
	let allFeeds: Record<string, FeedItem[]>;

	if (requestedCategories && requestedCategories.length > 0) {
		allFeeds = {};
		await Promise.all(
			requestedCategories.map(async (cat) => {
				allFeeds[cat] = await feedFetcher.fetchCategory(cat);
			})
		);
	} else {
		allFeeds = await feedFetcher.fetchAllCategories();
	}

	const digestCategories: CategoryDigest[] = [];
	const goalRelevant: GoalRelevantItem[] = [];
	let totalItems = 0;
	let highRelevance = 0;

	// Process each category
	for (const [categoryName, items] of Object.entries(allFeeds)) {
		// Score and sort items
		const scoredItems: ScoredFeedItem[] = items.map((item) => {
			const scoring = scoreItemRelevance(
				item,
				highPriorityKeywords,
				mediumPriorityKeywords,
				lowPriorityKeywords
			);

			return {
				...item,
				relevance: scoring.relevance,
				relevanceScore: scoring.score,
				matchedInterests: scoring.matchedInterests,
			};
		});

		// Sort by relevance score, then recency
		scoredItems.sort((a, b) => {
			if (b.relevanceScore !== a.relevanceScore) {
				return b.relevanceScore - a.relevanceScore;
			}
			return b.pubDate.getTime() - a.pubDate.getTime();
		});

		// Take top items
		const maxItems = Math.min(maxItemsPerCategory, identity.preferences.news.max_items);
		const topItems = scoredItems.slice(0, maxItems);

		// Check goal relevance
		for (const item of topItems) {
			const goalMatch = findGoalRelevance(item, activeGoals);
			if (goalMatch) {
				goalRelevant.push({
					item,
					relatedGoal: goalMatch.relatedGoal,
					relevanceReason: goalMatch.relevanceReason,
				});
			}
		}

		// Track stats
		totalItems += topItems.length;
		highRelevance += topItems.filter((i) => i.relevance === 'high').length;

		// Build category digest
		digestCategories.push({
			name: categoryName,
			items: topItems.map((item) => ({
				title: item.title,
				link: item.link,
				source: item.source,
				relevance: item.relevance,
				summary: item.snippet,
				pubDate: item.pubDate,
			})),
			itemCount: topItems.length,
		});
	}

	// Generate highlights if requested
	let highlights: string[] = [];
	if (generateHighlights && digestCategories.length > 0) {
		highlights = await generateHighlightsSummary(digestCategories);
	}

	return {
		generated: new Date().toISOString(),
		categories: digestCategories,
		highlights,
		goalRelevant: goalRelevant.slice(0, 5), // Top 5 goal-relevant items
		stats: {
			totalItems,
			highRelevance,
			categoriesProcessed: digestCategories.length,
		},
	};
}

/**
 * Generate highlight summaries using AI
 */
async function generateHighlightsSummary(categories: CategoryDigest[]): Promise<string[]> {
	// Collect high-relevance items across all categories
	const highRelevanceItems = categories.flatMap((c) =>
		c.items.filter((i) => i.relevance === 'high').map((i) => ({ ...i, category: c.name }))
	);

	if (highRelevanceItems.length === 0) {
		// Fall back to top items from each category
		const topItems = categories.flatMap((c) =>
			c.items.slice(0, 2).map((i) => ({ ...i, category: c.name }))
		);

		if (topItems.length === 0) {
			return ['No news items found matching your interests'];
		}

		// Just return titles as highlights
		return topItems.slice(0, 5).map((i) => `[${i.category}] ${i.title}`);
	}

	try {
		const response = await modelRouter.complete({
			model: 'cheapest',
			messages: [
				{
					role: 'system',
					content:
						'You are a news summarizer. Create brief, informative highlights from news headlines.',
				},
				{
					role: 'user',
					content: `Summarize these news items into 3-5 key highlights. Each highlight should be 1-2 sentences, capturing the most important developments.

News Items:
${highRelevanceItems.map((i) => `- [${i.category}] ${i.title}`).join('\n')}

Respond with a JSON array of highlight strings. Example:
["First highlight about major development", "Second highlight about another trend"]`,
				},
			],
			maxTokens: 500,
			temperature: 0.3,
		});

		try {
			// Try to parse as JSON
			const parsed = JSON.parse(response.content);
			if (Array.isArray(parsed)) {
				return parsed.slice(0, 5);
			}
		} catch {
			// If JSON parsing fails, split by newlines
			return response.content
				.split('\n')
				.filter((line: string) => line.trim().length > 0)
				.slice(0, 5);
		}

		return highRelevanceItems.slice(0, 5).map((i) => i.title);
	} catch (error) {
		console.error('Failed to generate highlights:', error);
		// Fallback to raw titles
		return highRelevanceItems.slice(0, 5).map((i) => `[${i.category}] ${i.title}`);
	}
}

// ============================================
// Quick Digest (No AI)
// ============================================

/**
 * Generate a quick digest without AI summarization
 */
export async function generateQuickDigest(options: {
	categories?: string[];
	maxItemsPerCategory?: number;
}): Promise<NewsDigest> {
	return generateNewsDigest({
		...options,
		generateHighlights: false,
	});
}

// ============================================
// Category-Specific Digest
// ============================================

/**
 * Generate digest for a specific category
 */
export async function generateCategoryDigest(
	category: string,
	maxItems = 20
): Promise<CategoryDigest | null> {
	const digest = await generateNewsDigest({
		categories: [category],
		maxItemsPerCategory: maxItems,
		generateHighlights: false,
	});

	return digest.categories[0] || null;
}

// ============================================
// Digest Formatting
// ============================================

/**
 * Format digest for terminal output
 */
export function formatDigestForTerminal(
	digest: NewsDigest,
	options: {
		showSummaries?: boolean;
		showGoalRelevant?: boolean;
		compact?: boolean;
	} = {}
): string {
	const { showSummaries = true, showGoalRelevant = true, compact = false } = options;

	const lines: string[] = [];

	// Header
	lines.push('');

	// Goal-relevant items
	if (showGoalRelevant && digest.goalRelevant.length > 0) {
		lines.push('Related to Your Goals:');
		lines.push('');

		for (const { item, relatedGoal } of digest.goalRelevant.slice(0, 3)) {
			lines.push(`  [${relatedGoal}]`);
			lines.push(`  ${item.title}`);
			lines.push(`  ${item.link}`);
			lines.push('');
		}
	}

	// Highlights
	if (digest.highlights.length > 0) {
		lines.push('Highlights:');
		for (const highlight of digest.highlights) {
			lines.push(`  ${highlight}`);
		}
		lines.push('');
	}

	// Categories
	for (const category of digest.categories) {
		lines.push(`${category.name.toUpperCase()}`);
		lines.push('='.repeat(category.name.length));

		for (const item of category.items) {
			const icon = { high: '', medium: '', low: '' }[item.relevance];

			if (compact) {
				lines.push(`${icon} ${item.title}`);
			} else {
				lines.push(`${icon} ${item.title}`);
				lines.push(`   ${item.source} | ${item.link}`);

				if (showSummaries && item.summary) {
					lines.push(`   ${item.summary.substring(0, 100)}...`);
				}
			}
		}

		lines.push('');
	}

	// Footer
	lines.push('---');
	lines.push(`Generated: ${new Date(digest.generated).toLocaleString()}`);
	lines.push(
		`Stats: ${digest.stats.totalItems} items, ${digest.stats.highRelevance} high relevance`
	);

	return lines.join('\n');
}
