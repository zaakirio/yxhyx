/**
 * Learning Manager - Capture ratings, generate learnings, and retrieve for context
 *
 * The learning system is the heart of Yxhyx's continuous improvement:
 * 1. Capture ratings (explicit and implicit)
 * 2. Generate learnings from significant interactions
 * 3. Retrieve relevant learnings to inject into future contexts
 *
 * Key improvement over PAI: We actually USE the learnings via retrieval.
 */

import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import {
	type Learning,
	type Rating,
	generateLearningId,
	parseExplicitRating as parseRating,
} from '../schemas/learning';

// ============================================
// Paths
// ============================================

const YXHYX_DIR = `${process.env.HOME}/.yxhyx`;
const LEARNING_DIR = `${YXHYX_DIR}/memory/learning`;
const SIGNALS_DIR = `${LEARNING_DIR}/signals`;
const PATTERNS_DIR = `${LEARNING_DIR}/patterns`;
const POSITIVE_DIR = `${LEARNING_DIR}/positive`;

// ============================================
// Learning Manager Class
// ============================================

export class LearningManager {
	/**
	 * Capture a rating
	 *
	 * Ratings are the primary signal for learning. Low ratings (<=5) trigger
	 * failure learnings, high ratings (>=8) trigger success learnings.
	 */
	async captureRating(rating: Rating): Promise<void> {
		// Ensure signals directory exists
		await mkdir(SIGNALS_DIR, { recursive: true });

		// Append to ratings file
		await appendFile(`${SIGNALS_DIR}/ratings.jsonl`, `${JSON.stringify(rating)}\n`);

		// Auto-generate learning for significant ratings
		if (rating.rating <= 5) {
			await this.generateFailureLearning(rating);
		} else if (rating.rating >= 8) {
			await this.generateSuccessLearning(rating);
		}
	}

	/**
	 * Parse explicit rating from user input
	 *
	 * Detects patterns like "7", "8 - good response", "rating: 9"
	 */
	parseExplicitRating(input: string): { rating: number; comment?: string } | null {
		return parseRating(input);
	}

	/**
	 * Get recent ratings
	 */
	async getRecentRatings(days = 7): Promise<Rating[]> {
		const ratingsFile = `${SIGNALS_DIR}/ratings.jsonl`;

		if (!existsSync(ratingsFile)) {
			return [];
		}

		try {
			const content = await readFile(ratingsFile, 'utf-8');
			const ratings = content
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => JSON.parse(line) as Rating);

			const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
			return ratings.filter((r) => new Date(r.timestamp).getTime() > cutoff);
		} catch {
			return [];
		}
	}

	/**
	 * CRITICAL: Retrieve relevant learnings for current context
	 *
	 * This is the key feature that makes learnings useful - we surface
	 * past lessons when they're relevant to the current task.
	 */
	async retrieveRelevantLearnings(context: string, limit = 5): Promise<Learning[]> {
		const allLearnings = await this.getAllLearnings();

		if (allLearnings.length === 0) {
			return [];
		}

		// Extract keywords from context (simple approach - could use embeddings later)
		const contextWords = new Set(
			context
				.toLowerCase()
				.split(/\W+/)
				.filter((w) => w.length > 3)
		);

		// Score each learning by keyword overlap
		const scored = allLearnings.map((learning) => {
			const learningText = `${learning.situation} ${learning.lesson}`.toLowerCase();
			const learningWords = learningText.split(/\W+/);
			const matches = learningWords.filter((w) => contextWords.has(w)).length;

			// Boost recent learnings
			const ageInDays =
				(Date.now() - new Date(learning.timestamp).getTime()) / (1000 * 60 * 60 * 24);
			const recencyBoost = Math.max(0, 1 - ageInDays / 30); // Decay over 30 days

			return { learning, score: matches + recencyBoost };
		});

		return scored
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.filter((s) => s.score > 0)
			.map((s) => s.learning);
	}

	/**
	 * Get all learnings
	 */
	async getAllLearnings(): Promise<Learning[]> {
		const learnings: Learning[] = [];

		// Read from patterns (failures) and positive (successes) directories
		for (const dir of [PATTERNS_DIR, POSITIVE_DIR]) {
			if (!existsSync(dir)) continue;

			try {
				const months = await readdir(dir);

				for (const month of months) {
					const monthDir = `${dir}/${month}`;
					const stat = await import('node:fs/promises').then((fs) => fs.stat(monthDir));

					if (!stat.isDirectory()) continue;

					const files = await readdir(monthDir);

					for (const file of files) {
						if (!file.endsWith('.jsonl')) continue;

						try {
							const content = await readFile(`${monthDir}/${file}`, 'utf-8');
							const lines = content.trim().split('\n').filter(Boolean);
							learnings.push(...lines.map((l) => JSON.parse(l) as Learning));
						} catch {
							// Skip malformed files
						}
					}
				}
			} catch {
				// Skip if can't read directory
			}
		}

		return learnings;
	}

	/**
	 * Synthesize patterns from recent signals
	 */
	async synthesizePatterns(): Promise<string> {
		const ratings = await this.getRecentRatings(7);

		if (ratings.length === 0) {
			return 'No ratings to analyze';
		}

		const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
		const lowRatings = ratings.filter((r) => r.rating <= 5);
		const highRatings = ratings.filter((r) => r.rating >= 8);

		const learnings = await this.getAllLearnings();
		const recentFailures = learnings.filter((l) => l.type === 'failure').slice(-5);
		const recentSuccesses = learnings.filter((l) => l.type === 'success').slice(-5);

		return `
# Weekly Pattern Synthesis

**Period:** Last 7 days
**Total Interactions:** ${ratings.length}
**Average Rating:** ${avgRating.toFixed(1)}/10

## Satisfaction Breakdown
- High satisfaction (8+): ${highRatings.length}
- Neutral (6-7): ${ratings.length - lowRatings.length - highRatings.length}
- Low satisfaction (1-5): ${lowRatings.length}

## Recent Failures to Avoid
${recentFailures.map((f) => `- ${f.lesson}`).join('\n') || 'None captured'}

## Recent Successes to Replicate
${recentSuccesses.map((s) => `- ${s.lesson}`).join('\n') || 'None captured'}

## Action Items
${lowRatings.length > 2 ? '- Review common themes in low ratings' : ''}
${avgRating < 7 ? '- Investigate quality issues' : ''}
${highRatings.length > 0 ? '- Document what made high-rated interactions successful' : ''}
`.trim();
	}

	// ============================================
	// Private Methods
	// ============================================

	/**
	 * Generate a failure learning from a low rating
	 */
	private async generateFailureLearning(rating: Rating): Promise<void> {
		const learning: Learning = {
			id: generateLearningId(),
			timestamp: new Date().toISOString(),
			type: 'failure',
			situation: rating.prompt_snippet || 'Unknown context',
			what_went_wrong: rating.sentiment_summary || rating.comment || 'Unspecified issue',
			lesson: this.extractLesson(rating, 'failure'),
			action_items: [],
			work_id: rating.work_id,
			rating_id: rating.id,
			tags: ['auto-captured', 'improvement-needed'],
		};

		await this.saveLearning(learning, PATTERNS_DIR, 'failures');
	}

	/**
	 * Generate a success learning from a high rating
	 */
	private async generateSuccessLearning(rating: Rating): Promise<void> {
		const learning: Learning = {
			id: generateLearningId(),
			timestamp: new Date().toISOString(),
			type: 'success',
			situation: rating.prompt_snippet || 'Unknown context',
			what_went_right: rating.sentiment_summary || rating.comment || 'Positive outcome',
			lesson: this.extractLesson(rating, 'success'),
			action_items: [],
			work_id: rating.work_id,
			rating_id: rating.id,
			tags: ['auto-captured', 'positive-pattern'],
		};

		await this.saveLearning(learning, POSITIVE_DIR, 'successes');
	}

	/**
	 * Extract a lesson from a rating
	 */
	private extractLesson(rating: Rating, type: 'failure' | 'success'): string {
		if (type === 'failure') {
			return rating.comment ? `Avoid: ${rating.comment}` : 'Review approach for similar tasks';
		}
		return rating.comment
			? `Replicate: ${rating.comment}`
			: 'Continue this approach for similar tasks';
	}

	/**
	 * Save a learning to the appropriate directory
	 */
	private async saveLearning(learning: Learning, baseDir: string, filename: string): Promise<void> {
		const date = new Date().toISOString().split('T')[0];
		const monthDir = `${baseDir}/${date.substring(0, 7)}`; // YYYY-MM

		await mkdir(monthDir, { recursive: true });
		await appendFile(`${monthDir}/${filename}.jsonl`, `${JSON.stringify(learning)}\n`);
	}
}

// Export singleton instance
export const learningManager = new LearningManager();

// ============================================
// Convenience Functions
// ============================================

/**
 * Capture a learning from a work session with rating
 */
export async function captureLearning(workId: string, rating: number): Promise<void> {
	await learningManager.captureRating({
		id: `rating-${Date.now()}`,
		timestamp: new Date().toISOString(),
		rating,
		source: 'explicit',
		work_id: workId,
	});
}

/**
 * Retrieve relevant learnings for a context
 */
export async function retrieveRelevantLearnings(context: string, limit = 5): Promise<Learning[]> {
	return learningManager.retrieveRelevantLearnings(context, limit);
}
