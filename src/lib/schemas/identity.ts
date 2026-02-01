/**
 * Identity Schema - Zod schema for structured personal context
 *
 * This is the foundation of Yxhyx's understanding of you.
 * All personal context is stored in a single validated YAML file.
 */

import { z } from 'zod';

// Goal schema - used across short, medium, and long term
export const GoalSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	deadline: z.string().optional(),
	progress: z.number().min(0).max(1).default(0),
	related_projects: z.array(z.string()).default([]),
	created: z.string().optional(),
});

// Project schema - active work items
export const ProjectSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: z.enum(['active', 'paused', 'completed', 'abandoned']),
	description: z.string(),
	repo: z.string().optional(),
	next_actions: z.array(z.string()).default([]),
	related_goals: z.array(z.string()).default([]),
	created: z.string().optional(),
});

// Interest schema - for content curation
export const InterestSchema = z.object({
	topic: z.string(),
	subtopics: z.array(z.string()).default([]),
});

// Belief schema - core beliefs and values
export const BeliefSchema = z.object({
	statement: z.string(),
	confidence: z.number().min(0).max(1),
	added: z.string(),
});

// Challenge schema - current obstacles
export const ChallengeSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	status: z.enum(['active', 'resolved', 'abandoned']),
	related_goals: z.array(z.string()).default([]),
	created: z.string().optional(),
});

// Lesson schema - accumulated learnings
export const LessonSchema = z.object({
	lesson: z.string(),
	context: z.string().optional(),
	date: z.string(),
});

// Communication preferences
export const CommunicationPreferencesSchema = z.object({
	style: z.enum(['direct', 'diplomatic', 'socratic']).default('direct'),
	length: z.enum(['concise', 'detailed', 'adaptive']).default('concise'),
	formality: z.enum(['formal', 'casual', 'professional']).default('casual'),
});

// Tech stack preferences
export const TechStackPreferencesSchema = z.object({
	languages: z.array(z.string()).default(['TypeScript']),
	frameworks: z.array(z.string()).default([]),
	package_manager: z.string().default('bun'),
	testing: z.string().default('vitest'),
});

// News preferences
export const NewsPreferencesSchema = z.object({
	format: z.enum(['bullet_points', 'paragraphs', 'headlines_only']).default('bullet_points'),
	max_items: z.number().default(10),
	preferred_sources: z.array(z.string()).default([]),
});

// Preferences container
export const PreferencesSchema = z.object({
	communication: CommunicationPreferencesSchema.default({}),
	tech_stack: TechStackPreferencesSchema.default({}),
	news: NewsPreferencesSchema.default({}),
});

// About section
export const AboutSchema = z.object({
	name: z.string(),
	timezone: z.string(),
	location: z.string().optional(),
	background: z.string().default(''),
	expertise: z.array(z.string()).default([]),
});

// Goals container
export const GoalsSchema = z.object({
	short_term: z.array(GoalSchema).default([]),
	medium_term: z.array(GoalSchema).default([]),
	long_term: z.array(GoalSchema).default([]),
});

// Interests container
export const InterestsSchema = z.object({
	high_priority: z.array(InterestSchema).default([]),
	medium_priority: z.array(InterestSchema).default([]),
	low_priority: z.array(InterestSchema).default([]),
});

// Main Identity Schema
export const IdentitySchema = z.object({
	version: z.string().default('1.0'),
	last_updated: z.string(),

	about: AboutSchema,
	mission: z.string().default(''),

	beliefs: z.array(BeliefSchema).default([]),
	goals: GoalsSchema.default({}),
	projects: z.array(ProjectSchema).default([]),
	interests: InterestsSchema.default({}),
	challenges: z.array(ChallengeSchema).default([]),

	preferences: PreferencesSchema.default({}),
	learned: z.array(LessonSchema).default([]),
});

// Export types
export type Goal = z.infer<typeof GoalSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Interest = z.infer<typeof InterestSchema>;
export type Belief = z.infer<typeof BeliefSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type CommunicationPreferences = z.infer<typeof CommunicationPreferencesSchema>;
export type TechStackPreferences = z.infer<typeof TechStackPreferencesSchema>;
export type NewsPreferences = z.infer<typeof NewsPreferencesSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type About = z.infer<typeof AboutSchema>;
export type Goals = z.infer<typeof GoalsSchema>;
export type Interests = z.infer<typeof InterestsSchema>;
export type Identity = z.infer<typeof IdentitySchema>;

/**
 * Create a new empty identity with defaults
 */
export function createDefaultIdentity(name: string, timezone: string): Identity {
	return {
		version: '1.0',
		last_updated: new Date().toISOString(),
		about: {
			name,
			timezone,
			location: undefined,
			background: '',
			expertise: [],
		},
		mission: '',
		beliefs: [],
		goals: {
			short_term: [],
			medium_term: [],
			long_term: [],
		},
		projects: [],
		interests: {
			high_priority: [],
			medium_priority: [],
			low_priority: [],
		},
		challenges: [],
		preferences: {
			communication: {
				style: 'direct',
				length: 'concise',
				formality: 'casual',
			},
			tech_stack: {
				languages: ['TypeScript'],
				frameworks: [],
				package_manager: 'bun',
				testing: 'vitest',
			},
			news: {
				format: 'bullet_points',
				max_items: 10,
				preferred_sources: [],
			},
		},
		learned: [],
	};
}

/**
 * Generate a unique ID for goals, projects, etc.
 */
export function generateId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}
