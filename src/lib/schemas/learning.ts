/**
 * Learning Schema - Zod schema for learning capture and retrieval
 *
 * Captures feedback (ratings) and derives learnings from interactions.
 * Key innovation over PAI: emphasis on RETRIEVAL, not just capture.
 *
 * Features:
 * - Unified rating schema (explicit + implicit)
 * - Positive pattern capture (what worked, not just failures)
 * - Work-learning linkage
 * - Keyword-based retrieval preparation
 */

import { z } from 'zod';

/**
 * Rating source - how the rating was captured
 */
export const RatingSource = z.enum(['explicit', 'implicit']);
export type RatingSource = z.infer<typeof RatingSource>;

/**
 * Learning type - categorization for retrieval
 */
export const LearningType = z.enum(['failure', 'success', 'insight', 'pattern']);
export type LearningType = z.infer<typeof LearningType>;

/**
 * Rating schema - unified format for explicit and implicit ratings
 *
 * Explicit: User provides rating like "8 - great response"
 * Implicit: Detected from sentiment in user's follow-up messages
 */
export const RatingSchema = z.object({
	id: z.string(),
	timestamp: z.string(),
	rating: z.number().min(1).max(10),
	source: RatingSource,

	// Context
	work_id: z.string().optional(),
	prompt_snippet: z.string().optional(),
	response_snippet: z.string().optional(),

	// For explicit ratings
	comment: z.string().optional(),

	// For implicit ratings
	sentiment_summary: z.string().optional(),
	confidence: z.number().min(0).max(1).optional(),

	// Cost tracking
	model_used: z.string().optional(),
	cost_usd: z.number().optional(),
});

export type Rating = z.infer<typeof RatingSchema>;

/**
 * Learning schema - derived insights from ratings and interactions
 *
 * Generated automatically from:
 * - Low ratings (1-5) -> failure learnings
 * - High ratings (8-10) -> success learnings
 * - Pattern synthesis -> insight learnings
 */
export const LearningSchema = z.object({
	id: z.string(),
	timestamp: z.string(),
	type: LearningType,

	// What happened
	situation: z.string(),
	what_went_wrong: z.string().optional(),
	what_went_right: z.string().optional(),

	// What to do differently
	lesson: z.string(),
	action_items: z.array(z.string()).default([]),

	// Links
	work_id: z.string().optional(),
	rating_id: z.string().optional(),

	// Metadata for retrieval
	tags: z.array(z.string()).default([]),
	keywords: z.array(z.string()).default([]), // Extracted for keyword-based retrieval

	// Future: embedding-based retrieval
	embeddings: z.array(z.number()).optional(),
});

export type Learning = z.infer<typeof LearningSchema>;

/**
 * Pattern synthesis - aggregated analysis of learnings over time
 */
export const PatternSynthesisSchema = z.object({
	id: z.string(),
	timestamp: z.string(),
	period_start: z.string(),
	period_end: z.string(),

	// Statistics
	total_interactions: z.number(),
	average_rating: z.number(),
	rating_distribution: z.record(z.number()), // { "1": 0, "2": 0, ... "10": 0 }

	// Patterns
	common_failures: z.array(z.string()).default([]),
	common_successes: z.array(z.string()).default([]),
	recurring_themes: z.array(z.string()).default([]),

	// Recommendations
	action_items: z.array(z.string()).default([]),
});

export type PatternSynthesis = z.infer<typeof PatternSynthesisSchema>;

/**
 * Create a new rating
 */
export function createRating(
	rating: number,
	source: RatingSource,
	options?: Partial<Omit<Rating, 'id' | 'timestamp' | 'rating' | 'source'>>
): Rating {
	return RatingSchema.parse({
		id: `rating-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
		timestamp: new Date().toISOString(),
		rating,
		source,
		...options,
	});
}

/**
 * Create a new learning
 */
export function createLearning(
	type: LearningType,
	situation: string,
	lesson: string,
	options?: Partial<Omit<Learning, 'id' | 'timestamp' | 'type' | 'situation' | 'lesson'>>
): Learning {
	// Extract keywords from situation and lesson for retrieval
	const keywords = extractKeywords(`${situation} ${lesson}`);

	return LearningSchema.parse({
		id: `learning-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
		timestamp: new Date().toISOString(),
		type,
		situation,
		lesson,
		action_items: [],
		tags: [],
		keywords,
		...options,
	});
}

/**
 * Extract keywords for retrieval (simple implementation)
 */
export function extractKeywords(text: string): string[] {
	// Common stop words to filter out
	const stopWords = new Set([
		'the',
		'a',
		'an',
		'is',
		'are',
		'was',
		'were',
		'be',
		'been',
		'being',
		'have',
		'has',
		'had',
		'do',
		'does',
		'did',
		'will',
		'would',
		'could',
		'should',
		'may',
		'might',
		'must',
		'shall',
		'can',
		'need',
		'to',
		'of',
		'in',
		'for',
		'on',
		'with',
		'at',
		'by',
		'from',
		'as',
		'into',
		'through',
		'during',
		'before',
		'after',
		'above',
		'below',
		'between',
		'under',
		'again',
		'further',
		'then',
		'once',
		'here',
		'there',
		'when',
		'where',
		'why',
		'how',
		'all',
		'each',
		'few',
		'more',
		'most',
		'other',
		'some',
		'such',
		'no',
		'nor',
		'not',
		'only',
		'own',
		'same',
		'so',
		'than',
		'too',
		'very',
		'just',
		'and',
		'but',
		'or',
		'if',
		'because',
		'until',
		'while',
		'this',
		'that',
		'these',
		'those',
		'what',
		'which',
		'who',
		'whom',
		'it',
		'its',
		'they',
		'them',
		'their',
		'we',
		'us',
		'our',
		'you',
		'your',
		'he',
		'him',
		'his',
		'she',
		'her',
		'i',
		'me',
		'my',
	]);

	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, ' ')
		.split(/\s+/)
		.filter((word) => word.length > 3 && !stopWords.has(word))
		.filter((word, index, arr) => arr.indexOf(word) === index) // dedupe
		.slice(0, 20); // limit
}

/**
 * Parse explicit rating from user input
 *
 * Supports formats:
 * - "7" - just the number
 * - "8 - good response" - number with comment
 * - "6: needs work" - colon separator
 * - "rating: 9" - explicit prefix
 */
export function parseExplicitRating(input: string): { rating: number; comment?: string } | null {
	const trimmed = input.trim();

	// Pattern: just a number (1-10)
	const justNumber = /^(10|[1-9])$/;
	// Pattern: number with separator and comment
	const withComment = /^(10|[1-9])\s*[-:]\s*(.+)$/;
	// Pattern: "rating: X" or "rating X"
	const ratingPrefix = /^rating[:\s]*(10|[1-9])(?:\s*[-:]\s*(.+))?$/i;

	// Check for false positives - phrases like "3 items" or "5 files"
	const falsePositives =
		/^\d+\s+(items?|things?|files?|bugs?|issues?|points?|steps?|minutes?|hours?|days?|ways?|options?|choices?)/i;
	if (falsePositives.test(trimmed)) {
		return null;
	}

	// Try each pattern
	for (const pattern of [justNumber, withComment, ratingPrefix]) {
		const match = trimmed.match(pattern);
		if (match) {
			return {
				rating: Number.parseInt(match[1], 10),
				comment: match[2]?.trim(),
			};
		}
	}

	return null;
}

/**
 * Score relevance of a learning to a given context
 * Returns 0-1 score based on keyword overlap
 */
export function scoreLearningRelevance(learning: Learning, contextKeywords: string[]): number {
	if (contextKeywords.length === 0 || learning.keywords.length === 0) {
		return 0;
	}

	const contextSet = new Set(contextKeywords);
	const matches = learning.keywords.filter((k) => contextSet.has(k)).length;

	// Score based on overlap ratio
	const overlapRatio = matches / Math.min(contextKeywords.length, learning.keywords.length);

	// Boost recent learnings slightly
	const ageMs = Date.now() - new Date(learning.timestamp).getTime();
	const ageDays = ageMs / (1000 * 60 * 60 * 24);
	const recencyBoost = Math.max(0, 1 - ageDays / 90); // Decay over 90 days

	return overlapRatio * 0.8 + recencyBoost * 0.2;
}
