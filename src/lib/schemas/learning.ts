/**
 * Learning Schema - Capture ratings, learnings, and patterns
 *
 * The learning system captures both explicit (user-provided) and implicit
 * (sentiment-analyzed) ratings, then generates learnings from significant
 * interactions. These learnings are later retrieved to inform future responses.
 */

import { z } from 'zod';

/**
 * Rating source - how the rating was obtained
 */
export const RatingSource = z.enum(['explicit', 'implicit']);
export type RatingSource = z.infer<typeof RatingSource>;

/**
 * Learning type - what kind of insight this represents
 */
export const LearningType = z.enum(['failure', 'success', 'insight']);
export type LearningType = z.infer<typeof LearningType>;

/**
 * Unified rating schema - captures both explicit and implicit ratings
 */
export const RatingSchema = z.object({
	/** Unique identifier */
	id: z.string(),

	/** When this rating was captured */
	timestamp: z.string(),

	/** Rating value (1-10) */
	rating: z.number().min(1).max(10),

	/** How this rating was obtained */
	source: RatingSource,

	// Context
	/** Associated work session ID */
	work_id: z.string().optional(),

	/** Snippet of the prompt for context */
	prompt_snippet: z.string().optional(),

	/** Snippet of the response for context */
	response_snippet: z.string().optional(),

	// For explicit ratings
	/** User's comment with the rating */
	comment: z.string().optional(),

	// For implicit ratings
	/** AI-generated summary of sentiment */
	sentiment_summary: z.string().optional(),

	/** Confidence in the implicit rating (0-1) */
	confidence: z.number().min(0).max(1).optional(),

	// Derived
	/** Model used in the rated interaction */
	model_used: z.string().optional(),

	/** Cost of the rated interaction */
	cost_usd: z.number().optional(),
});

export type Rating = z.infer<typeof RatingSchema>;

/**
 * Learning schema - insights captured from ratings and interactions
 */
export const LearningSchema = z.object({
	/** Unique identifier */
	id: z.string(),

	/** When this learning was captured */
	timestamp: z.string(),

	/** Type of learning */
	type: LearningType,

	// What happened
	/** Description of the situation */
	situation: z.string(),

	/** What went wrong (for failures) */
	what_went_wrong: z.string().optional(),

	/** What went right (for successes) */
	what_went_right: z.string().optional(),

	// What to do differently
	/** The lesson learned */
	lesson: z.string(),

	/** Actionable items derived from this learning */
	action_items: z.array(z.string()).default([]),

	// Links
	/** Associated work session ID */
	work_id: z.string().optional(),

	/** Associated rating ID */
	rating_id: z.string().optional(),

	// Metadata
	/** Categorization tags */
	tags: z.array(z.string()).default([]),

	/** Vector embeddings for retrieval (future enhancement) */
	embeddings: z.array(z.number()).optional(),
});

export type Learning = z.infer<typeof LearningSchema>;

/**
 * Generate a rating ID
 */
export function generateRatingId(): string {
	return `rating-${Date.now()}`;
}

/**
 * Generate a learning ID
 */
export function generateLearningId(): string {
	return `learning-${Date.now()}`;
}

/**
 * Pattern for parsing explicit ratings from user input
 * Examples: "7", "8 - good", "6: needs work", "rating: 9"
 */
export function parseExplicitRating(input: string): { rating: number; comment?: string } | null {
	const patterns = [
		/^(10|[1-9])$/, // Just number
		/^(10|[1-9])\s*[-:]\s*(.+)$/, // Number with comment
		/^rating[:\s]*(10|[1-9])(?:\s*[-:]\s*(.+))?$/i, // "rating: X"
	];

	// Check for false positives like "3 items" or "5 things"
	const falsePositives = /^\d+\s+(items?|things?|files?|bugs?|issues?|points?|steps?|more)/i;
	if (falsePositives.test(input.trim())) {
		return null;
	}

	for (const pattern of patterns) {
		const match = input.trim().match(pattern);
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
 * Determine learning type based on rating
 */
export function getLearningTypeFromRating(rating: number): LearningType {
	if (rating <= 5) return 'failure';
	if (rating >= 8) return 'success';
	return 'insight';
}
