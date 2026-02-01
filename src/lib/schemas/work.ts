/**
 * Work Tracking Schema - Track work items with effort-based complexity
 *
 * Simple tasks get single JSONL files, complex tasks get directory structures.
 * This approach reduces overhead for common quick interactions while providing
 * full tracking for longer-running work.
 */

import { z } from 'zod';

/**
 * Effort level determines tracking structure:
 * - TRIVIAL: No persistence (greetings, yes/no)
 * - QUICK: Single JSONL file (< 5 min tasks)
 * - STANDARD: Directory with meta (5-30 min tasks)
 * - THOROUGH: Full directory with artifacts (30+ min tasks)
 */
export const EffortLevel = z.enum(['TRIVIAL', 'QUICK', 'STANDARD', 'THOROUGH']);
export type EffortLevel = z.infer<typeof EffortLevel>;

/**
 * Work status - lifecycle of a work item
 */
export const WorkStatus = z.enum(['active', 'completed', 'abandoned']);
export type WorkStatus = z.infer<typeof WorkStatus>;

/**
 * Individual work item within a work session
 */
export const WorkItemSchema = z.object({
	/** Unique identifier */
	id: z.string(),

	/** When this item was created */
	timestamp: z.string(),

	/** The user's request/prompt */
	prompt: z.string(),

	/** Summary of AI response (for later retrieval) */
	response_summary: z.string().optional(),

	/** Effort classification */
	effort: EffortLevel,

	/** Current status */
	status: WorkStatus,

	/** User rating (1-10) if provided */
	rating: z.number().min(1).max(10).optional(),

	/** Files changed during this work item */
	files_changed: z.array(z.string()).default([]),

	/** Tools/commands used */
	tools_used: z.array(z.string()).default([]),

	/** Duration in seconds */
	duration_seconds: z.number().optional(),

	/** API cost in USD */
	cost_usd: z.number().optional(),

	/** Model used for this item */
	model_used: z.string().optional(),

	/** Link to generated learning if any */
	learning_id: z.string().optional(),
});

export type WorkItem = z.infer<typeof WorkItemSchema>;

/**
 * Work meta - metadata for complex work sessions (STANDARD+)
 */
export const WorkMetaSchema = z.object({
	/** Unique identifier for the work session */
	id: z.string(),

	/** Brief title/description */
	title: z.string(),

	/** When work was created */
	created: z.string(),

	/** Last update time */
	updated: z.string(),

	/** Overall effort level */
	effort: EffortLevel,

	/** Current status */
	status: WorkStatus,

	/** Number of items in this work session */
	total_items: z.number(),

	/** Total API cost across all items */
	total_cost_usd: z.number().default(0),

	/** Related goals from identity */
	related_goals: z.array(z.string()).default([]),

	/** Categorization tags */
	tags: z.array(z.string()).default([]),
});

export type WorkMeta = z.infer<typeof WorkMetaSchema>;

/**
 * Current work state - what's being worked on right now
 */
export const CurrentWorkSchema = z.object({
	/** Work session ID */
	id: z.string(),

	/** Effort level */
	effort: EffortLevel,

	/** When work started */
	started: z.string(),
});

export type CurrentWork = z.infer<typeof CurrentWorkSchema>;

/**
 * Generate a work ID from timestamp and prompt
 */
export function generateWorkId(prompt: string): string {
	const timestamp = Date.now();
	const slug = prompt
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.substring(0, 50);
	return `${timestamp}-${slug}`;
}

/**
 * Generate a work item ID
 */
export function generateWorkItemId(workId: string): string {
	return `${workId}-${Date.now()}`;
}
