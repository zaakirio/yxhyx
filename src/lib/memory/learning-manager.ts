/**
 * Learning Manager - Captures and retrieves learnings
 *
 * Key innovation: emphasis on RETRIEVAL, not just capture.
 * Automatically surfaces relevant past learnings during interactions.
 *
 * Storage structure:
 * ~/.yxhyx/memory/learning/
 *   signals/ratings.jsonl    - All ratings (explicit + implicit)
 *   patterns/{YYYY-MM}/      - Failure learnings by month
 *   positive/{YYYY-MM}/      - Success learnings by month
 *   synthesis/{YYYY-MM}/     - Aggregated pattern reports
 */

import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	type Learning,
	LearningSchema,
	type LearningType,
	type PatternSynthesis,
	PatternSynthesisSchema,
	type Rating,
	RatingSchema,
	type RatingSource,
	createLearning,
	createRating,
	extractKeywords,
	parseExplicitRating,
	scoreLearningRelevance,
} from '../schemas/learning';

// Paths
const YXHYX_DIR = `${process.env.HOME}/.yxhyx`;
const LEARNING_DIR = `${YXHYX_DIR}/memory/learning`;
const SIGNALS_DIR = `${LEARNING_DIR}/signals`;
const PATTERNS_DIR = `${LEARNING_DIR}/patterns`;
const POSITIVE_DIR = `${LEARNING_DIR}/positive`;
const SYNTHESIS_DIR = `${LEARNING_DIR}/synthesis`;
const RATINGS_PATH = `${SIGNALS_DIR}/ratings.jsonl`;

/**
 * Learning Manager class - handles all learning operations
 */
export class LearningManager {
	/**
	 * Capture a rating
	 *
	 * Automatically generates learnings for:
	 * - Low ratings (1-5) -> failure learnings
	 * - High ratings (8-10) -> success learnings
	 */
	async captureRating(rating: Rating): Promise<void> {
		// Validate
		RatingSchema.parse(rating);

		// Ensure directories exist
		await mkdir(SIGNALS_DIR, { recursive: true });

		// Append to ratings file
		await appendFile(RATINGS_PATH, `${JSON.stringify(rating)}\n`);

		// Auto-generate learning for significant ratings
		if (rating.rating <= 5) {
			await this.generateFailureLearning(rating);
		} else if (rating.rating >= 8) {
			await this.generateSuccessLearning(rating);
		}
	}

	/**
	 * Capture explicit rating from user input
	 *
	 * @param input - User input like "8 - great response"
	 * @param context - Additional context (work_id, prompt, etc.)
	 * @returns Rating if parsed successfully, null otherwise
	 */
	async captureExplicitRating(
		input: string,
		context?: {
			work_id?: string;
			prompt_snippet?: string;
			response_snippet?: string;
			model_used?: string;
			cost_usd?: number;
		}
	): Promise<Rating | null> {
		const parsed = parseExplicitRating(input);
		if (!parsed) return null;

		const rating = createRating(parsed.rating, 'explicit', {
			comment: parsed.comment,
			...context,
		});

		await this.captureRating(rating);
		return rating;
	}

	/**
	 * Generate failure learning from low rating
	 */
	private async generateFailureLearning(rating: Rating): Promise<void> {
		const situation = rating.prompt_snippet || 'Interaction received low satisfaction';
		const whatWentWrong = rating.comment || rating.sentiment_summary || 'Not specified';
		const lesson = rating.comment
			? `Avoid: ${rating.comment}`
			: 'Review approach and improve for similar future tasks';

		const learning = createLearning('failure', situation, lesson, {
			what_went_wrong: whatWentWrong,
			work_id: rating.work_id,
			rating_id: rating.id,
			tags: ['auto-captured', 'improvement-needed'],
		});

		await this.storeLearning(learning, PATTERNS_DIR);
	}

	/**
	 * Generate success learning from high rating
	 */
	private async generateSuccessLearning(rating: Rating): Promise<void> {
		const situation = rating.prompt_snippet || 'Interaction received high satisfaction';
		const whatWentRight = rating.comment || rating.sentiment_summary || 'Not specified';
		const lesson = rating.comment
			? `Replicate: ${rating.comment}`
			: 'Continue this approach for similar tasks';

		const learning = createLearning('success', situation, lesson, {
			what_went_right: whatWentRight,
			work_id: rating.work_id,
			rating_id: rating.id,
			tags: ['auto-captured', 'positive-pattern'],
		});

		await this.storeLearning(learning, POSITIVE_DIR);
	}

	/**
	 * Store a learning in the appropriate directory
	 */
	private async storeLearning(learning: Learning, baseDir: string): Promise<void> {
		const date = new Date().toISOString().split('T')[0];
		const monthDir = date.substring(0, 7); // YYYY-MM

		const dir = join(baseDir, monthDir);
		await mkdir(dir, { recursive: true });

		const filename = learning.type === 'failure' ? 'failures.jsonl' : 'successes.jsonl';
		await appendFile(join(dir, filename), `${JSON.stringify(learning)}\n`);
	}

	/**
	 * Add a manual learning
	 */
	async addLearning(
		type: LearningType,
		situation: string,
		lesson: string,
		options?: {
			what_went_wrong?: string;
			what_went_right?: string;
			action_items?: string[];
			tags?: string[];
			work_id?: string;
		}
	): Promise<Learning> {
		const learning = createLearning(type, situation, lesson, options);

		const baseDir = type === 'failure' ? PATTERNS_DIR : POSITIVE_DIR;
		await this.storeLearning(learning, baseDir);

		return learning;
	}

	/**
	 * CRITICAL: Retrieve relevant learnings for current context
	 *
	 * This is the key innovation - actually using captured learnings!
	 *
	 * @param context - Current context (prompt, task description, etc.)
	 * @param limit - Maximum learnings to return
	 * @returns Relevant learnings sorted by relevance
	 */
	async retrieveRelevantLearnings(context: string, limit = 5): Promise<Learning[]> {
		const allLearnings = await this.getAllLearnings();

		if (allLearnings.length === 0) {
			return [];
		}

		// Extract keywords from context
		const contextKeywords = extractKeywords(context);

		if (contextKeywords.length === 0) {
			// Return most recent learnings if no keywords
			return allLearnings.slice(0, limit);
		}

		// Score and sort learnings by relevance
		const scored = allLearnings.map((learning) => ({
			learning,
			score: scoreLearningRelevance(learning, contextKeywords),
		}));

		return scored
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((s) => s.learning);
	}

	/**
	 * Get all learnings
	 */
	async getAllLearnings(): Promise<Learning[]> {
		const learnings: Learning[] = [];

		// Read from both patterns and positive directories
		for (const baseDir of [PATTERNS_DIR, POSITIVE_DIR]) {
			if (!existsSync(baseDir)) continue;

			try {
				const months = await readdir(baseDir);
				for (const month of months) {
					const monthDir = join(baseDir, month);
					try {
						const files = await readdir(monthDir);
						for (const file of files) {
							if (!file.endsWith('.jsonl')) continue;
							try {
								const content = await readFile(join(monthDir, file), 'utf-8');
								const lines = content.trim().split('\n').filter(Boolean);
								for (const line of lines) {
									try {
										const learning = LearningSchema.parse(JSON.parse(line));
										learnings.push(learning);
									} catch {
										// Skip invalid entries
									}
								}
							} catch {
								// Skip unreadable files
							}
						}
					} catch {
						// Skip unreadable months
					}
				}
			} catch {
				// Skip if directory reading fails
			}
		}

		// Sort by timestamp (newest first)
		learnings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		return learnings;
	}

	/**
	 * Get learnings by type
	 */
	async getLearningsByType(type: LearningType): Promise<Learning[]> {
		const all = await this.getAllLearnings();
		return all.filter((l) => l.type === type);
	}

	/**
	 * Get all ratings
	 */
	async getAllRatings(): Promise<Rating[]> {
		if (!existsSync(RATINGS_PATH)) {
			return [];
		}

		try {
			const content = await readFile(RATINGS_PATH, 'utf-8');
			return content
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => RatingSchema.parse(JSON.parse(line)));
		} catch {
			return [];
		}
	}

	/**
	 * Get recent ratings
	 */
	async getRecentRatings(days = 7): Promise<Rating[]> {
		const all = await this.getAllRatings();
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
		return all.filter((r) => new Date(r.timestamp).getTime() > cutoff);
	}

	/**
	 * Get rating statistics
	 */
	async getRatingStats(days = 30): Promise<{
		total: number;
		average: number;
		distribution: Record<number, number>;
		bySource: Record<RatingSource, number>;
	}> {
		const ratings = await this.getRecentRatings(days);

		if (ratings.length === 0) {
			return {
				total: 0,
				average: 0,
				distribution: {},
				bySource: { explicit: 0, implicit: 0 },
			};
		}

		const distribution: Record<number, number> = {};
		const bySource: Record<RatingSource, number> = { explicit: 0, implicit: 0 };
		let sum = 0;

		for (const rating of ratings) {
			sum += rating.rating;
			distribution[rating.rating] = (distribution[rating.rating] || 0) + 1;
			bySource[rating.source]++;
		}

		return {
			total: ratings.length,
			average: sum / ratings.length,
			distribution,
			bySource,
		};
	}

	/**
	 * Synthesize patterns from recent data
	 */
	async synthesizePatterns(days = 7): Promise<PatternSynthesis> {
		const ratings = await this.getRecentRatings(days);
		const learnings = await this.getAllLearnings();

		const now = new Date();
		const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

		// Filter learnings to period
		const periodLearnings = learnings.filter(
			(l) => new Date(l.timestamp) >= periodStart && new Date(l.timestamp) <= now
		);

		// Calculate stats
		const distribution: Record<number, number> = {};
		let ratingSum = 0;
		for (const r of ratings) {
			distribution[r.rating] = (distribution[r.rating] || 0) + 1;
			ratingSum += r.rating;
		}

		// Extract patterns
		const failures = periodLearnings.filter((l) => l.type === 'failure').map((l) => l.lesson);
		const successes = periodLearnings.filter((l) => l.type === 'success').map((l) => l.lesson);

		// Find recurring themes (simple keyword frequency)
		const allKeywords: Record<string, number> = {};
		for (const l of periodLearnings) {
			for (const kw of l.keywords || []) {
				allKeywords[kw] = (allKeywords[kw] || 0) + 1;
			}
		}
		const recurringThemes = Object.entries(allKeywords)
			.filter(([, count]) => count > 1)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([theme]) => theme);

		// Generate action items
		const actionItems: string[] = [];
		const lowRatings = ratings.filter((r) => r.rating <= 5).length;
		if (lowRatings > 2) {
			actionItems.push('Review common themes in low-rated interactions');
		}
		if (ratingSum / (ratings.length || 1) < 7) {
			actionItems.push('Investigate quality issues - average rating below 7');
		}
		if (successes.length > 0) {
			actionItems.push('Document and replicate successful patterns');
		}

		const synthesis: PatternSynthesis = PatternSynthesisSchema.parse({
			id: `synthesis-${Date.now()}`,
			timestamp: now.toISOString(),
			period_start: periodStart.toISOString(),
			period_end: now.toISOString(),
			total_interactions: ratings.length,
			average_rating: ratings.length > 0 ? ratingSum / ratings.length : 0,
			rating_distribution: distribution,
			common_failures: failures.slice(0, 5),
			common_successes: successes.slice(0, 5),
			recurring_themes: recurringThemes,
			action_items: actionItems,
		});

		// Store synthesis
		const monthDir = now.toISOString().substring(0, 7);
		const dir = join(SYNTHESIS_DIR, monthDir);
		await mkdir(dir, { recursive: true });
		await writeFile(
			join(dir, `synthesis-${now.toISOString().split('T')[0]}.json`),
			JSON.stringify(synthesis, null, 2)
		);

		return synthesis;
	}

	/**
	 * Format learnings as markdown for display
	 */
	formatLearningsAsMarkdown(learnings: Learning[]): string {
		if (learnings.length === 0) {
			return 'No learnings captured yet.';
		}

		const lines: string[] = ['# Recent Learnings', ''];

		for (const learning of learnings) {
			const typeEmoji = learning.type === 'failure' ? '' : learning.type === 'success' ? '' : '';
			lines.push(
				`## ${typeEmoji} ${learning.type.charAt(0).toUpperCase() + learning.type.slice(1)}`
			);
			lines.push('');
			lines.push(`**Situation:** ${learning.situation}`);
			lines.push('');
			lines.push(`**Lesson:** ${learning.lesson}`);

			if (learning.what_went_wrong) {
				lines.push('');
				lines.push(`*What went wrong:* ${learning.what_went_wrong}`);
			}
			if (learning.what_went_right) {
				lines.push('');
				lines.push(`*What went right:* ${learning.what_went_right}`);
			}
			if (learning.action_items && learning.action_items.length > 0) {
				lines.push('');
				lines.push('**Action Items:**');
				for (const item of learning.action_items) {
					lines.push(`- ${item}`);
				}
			}
			if (learning.tags && learning.tags.length > 0) {
				lines.push('');
				lines.push(`*Tags:* ${learning.tags.join(', ')}`);
			}
			lines.push('');
			lines.push(`*Captured:* ${new Date(learning.timestamp).toLocaleString()}`);
			lines.push('');
			lines.push('---');
			lines.push('');
		}

		return lines.join('\n');
	}

	/**
	 * Format pattern synthesis as markdown
	 */
	formatSynthesisAsMarkdown(synthesis: PatternSynthesis): string {
		const lines: string[] = [
			'# Pattern Synthesis',
			'',
			`**Period:** ${new Date(synthesis.period_start).toLocaleDateString()} - ${new Date(synthesis.period_end).toLocaleDateString()}`,
			`**Total Interactions:** ${synthesis.total_interactions}`,
			`**Average Rating:** ${synthesis.average_rating.toFixed(1)}/10`,
			'',
		];

		// Rating distribution
		lines.push('## Rating Distribution');
		lines.push('');
		const highRatings = Object.entries(synthesis.rating_distribution)
			.filter(([r]) => Number.parseInt(r) >= 8)
			.reduce((sum, [, count]) => sum + count, 0);
		const lowRatings = Object.entries(synthesis.rating_distribution)
			.filter(([r]) => Number.parseInt(r) <= 5)
			.reduce((sum, [, count]) => sum + count, 0);
		const midRatings = synthesis.total_interactions - highRatings - lowRatings;

		lines.push(`- High satisfaction (8-10): ${highRatings}`);
		lines.push(`- Neutral (6-7): ${midRatings}`);
		lines.push(`- Low satisfaction (1-5): ${lowRatings}`);
		lines.push('');

		// Failures
		if (synthesis.common_failures.length > 0) {
			lines.push('## Common Failures to Avoid');
			lines.push('');
			for (const failure of synthesis.common_failures) {
				lines.push(`- ${failure}`);
			}
			lines.push('');
		}

		// Successes
		if (synthesis.common_successes.length > 0) {
			lines.push('## Successes to Replicate');
			lines.push('');
			for (const success of synthesis.common_successes) {
				lines.push(`- ${success}`);
			}
			lines.push('');
		}

		// Themes
		if (synthesis.recurring_themes.length > 0) {
			lines.push('## Recurring Themes');
			lines.push('');
			lines.push(synthesis.recurring_themes.join(', '));
			lines.push('');
		}

		// Action items
		if (synthesis.action_items.length > 0) {
			lines.push('## Recommended Actions');
			lines.push('');
			for (const item of synthesis.action_items) {
				lines.push(`- [ ] ${item}`);
			}
			lines.push('');
		}

		return lines.join('\n');
	}
}

// Export singleton instance
export const learningManager = new LearningManager();

// Export convenience functions
export async function captureRating(rating: Rating): Promise<void> {
	return learningManager.captureRating(rating);
}

export async function captureExplicitRating(
	input: string,
	context?: {
		work_id?: string;
		prompt_snippet?: string;
		response_snippet?: string;
		model_used?: string;
		cost_usd?: number;
	}
): Promise<Rating | null> {
	return learningManager.captureExplicitRating(input, context);
}

export async function retrieveRelevantLearnings(context: string, limit = 5): Promise<Learning[]> {
	return learningManager.retrieveRelevantLearnings(context, limit);
}

export async function addLearning(
	type: LearningType,
	situation: string,
	lesson: string,
	options?: {
		what_went_wrong?: string;
		what_went_right?: string;
		action_items?: string[];
		tags?: string[];
		work_id?: string;
	}
): Promise<Learning> {
	return learningManager.addLearning(type, situation, lesson, options);
}
