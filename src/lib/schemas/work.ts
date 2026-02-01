/**
 * Work Schema - Zod schema for work/task tracking
 *
 * Tracks discrete units of work with effort-based complexity.
 * Inspired by PAI's WORK system but simplified for yxhyx.
 *
 * Key features:
 * - Effort-based structure (TRIVIAL/QUICK don't need full directories)
 * - Work-learning linkage via learning_id
 * - Cost tracking per work item
 */

import { z } from 'zod';

/**
 * Effort levels determine storage structure
 * - TRIVIAL: No persistence (simple Q&A, greetings)
 * - QUICK: Single JSONL file (< 5 minute tasks)
 * - STANDARD: Directory with meta (5-30 minute tasks)
 * - THOROUGH: Full directory with artifacts (30+ minute tasks)
 */
export const EffortLevel = z.enum(['TRIVIAL', 'QUICK', 'STANDARD', 'THOROUGH']);
export type EffortLevel = z.infer<typeof EffortLevel>;

/**
 * Work status
 */
export const WorkStatus = z.enum(['active', 'completed', 'abandoned', 'paused']);
export type WorkStatus = z.infer<typeof WorkStatus>;

/**
 * Individual work item - represents a single interaction within a work session
 */
export const WorkItemSchema = z.object({
	id: z.string(),
	timestamp: z.string(),
	prompt: z.string(),
	response_summary: z.string().optional(),
	effort: EffortLevel,
	status: WorkStatus.default('active'),

	// Quality tracking
	rating: z.number().min(1).max(10).optional(),

	// Context
	files_changed: z.array(z.string()).default([]),
	tools_used: z.array(z.string()).default([]),

	// Cost tracking
	duration_seconds: z.number().optional(),
	cost_usd: z.number().optional(),
	model_used: z.string().optional(),
	input_tokens: z.number().optional(),
	output_tokens: z.number().optional(),

	// Links
	learning_id: z.string().optional(), // Link to generated learning
});

export type WorkItem = z.infer<typeof WorkItemSchema>;

/**
 * Work metadata - summary of a work session (for STANDARD/THOROUGH efforts)
 */
export const WorkMetaSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	created: z.string(),
	updated: z.string(),
	effort: EffortLevel,
	status: WorkStatus.default('active'),

	// Aggregates
	total_items: z.number().default(0),
	total_cost_usd: z.number().default(0),
	total_duration_seconds: z.number().default(0),
	total_input_tokens: z.number().default(0),
	total_output_tokens: z.number().default(0),

	// Context
	related_goals: z.array(z.string()).default([]),
	related_projects: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),

	// Quality
	average_rating: z.number().optional(),

	// Learning links
	learning_ids: z.array(z.string()).default([]),
});

export type WorkMeta = z.infer<typeof WorkMetaSchema>;

/**
 * Current work state - what we're working on right now
 */
export const CurrentWorkSchema = z.object({
	id: z.string(),
	effort: EffortLevel,
	started: z.string(),
	last_activity: z.string(),
	item_count: z.number().default(0),
});

export type CurrentWork = z.infer<typeof CurrentWorkSchema>;

/**
 * Create a new work item
 */
export function createWorkItem(
	workId: string,
	prompt: string,
	effort: EffortLevel,
	options?: Partial<Omit<WorkItem, 'id' | 'timestamp' | 'prompt' | 'effort'>>
): WorkItem {
	return WorkItemSchema.parse({
		id: `${workId}-${Date.now()}`,
		timestamp: new Date().toISOString(),
		prompt,
		effort,
		status: 'active',
		files_changed: [],
		tools_used: [],
		...options,
	});
}

/**
 * Create work metadata
 */
export function createWorkMeta(
	id: string,
	title: string,
	effort: EffortLevel,
	options?: Partial<Omit<WorkMeta, 'id' | 'title' | 'created' | 'updated' | 'effort'>>
): WorkMeta {
	const now = new Date().toISOString();
	return WorkMetaSchema.parse({
		id,
		title,
		effort,
		created: now,
		updated: now,
		status: 'active',
		total_items: 0,
		total_cost_usd: 0,
		total_duration_seconds: 0,
		total_input_tokens: 0,
		total_output_tokens: 0,
		related_goals: [],
		related_projects: [],
		tags: [],
		learning_ids: [],
		...options,
	});
}

/**
 * Generate a work ID from a prompt
 */
export function generateWorkId(prompt: string): string {
	const slug = prompt
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.substring(0, 50);

	return `${Date.now().toString(36)}-${slug}`;
}

/**
 * Classify effort level from prompt and context
 */
export function classifyEffort(
	prompt: string,
	options?: {
		hasFiles?: boolean;
		hasCode?: boolean;
		isMultiStep?: boolean;
		estimatedDuration?: number;
	}
): EffortLevel {
	const promptLower = prompt.toLowerCase();

	// TRIVIAL: Simple greetings, questions, single responses
	const trivialPatterns = [
		/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it)/i,
		/^what (is|are|does)/i,
		/^(how|why|when|where|who) (is|are|does|do)/i,
		/^can you (explain|tell|describe)/i,
	];
	if (trivialPatterns.some((p) => p.test(promptLower)) && !options?.hasCode && !options?.hasFiles) {
		return 'TRIVIAL';
	}

	// Check for explicit duration hints
	if (options?.estimatedDuration) {
		if (options.estimatedDuration < 5 * 60) return 'QUICK';
		if (options.estimatedDuration < 30 * 60) return 'STANDARD';
		return 'THOROUGH';
	}

	// THOROUGH: Large tasks
	const thoroughPatterns = [
		/implement .* system/i,
		/create .* application/i,
		/build .* from scratch/i,
		/refactor .* entire/i,
		/migrate .* to/i,
		/comprehensive .* analysis/i,
		/full .* review/i,
	];
	if (thoroughPatterns.some((p) => p.test(promptLower)) || options?.isMultiStep) {
		return 'THOROUGH';
	}

	// STANDARD: Code changes, file operations
	const standardPatterns = [
		/add .* feature/i,
		/fix .* bug/i,
		/update .* file/i,
		/modify .* code/i,
		/create .* function/i,
		/write .* test/i,
		/implement/i,
		/refactor/i,
	];
	if (standardPatterns.some((p) => p.test(promptLower)) || options?.hasCode || options?.hasFiles) {
		return 'STANDARD';
	}

	// QUICK: Default for most interactions
	return 'QUICK';
}
