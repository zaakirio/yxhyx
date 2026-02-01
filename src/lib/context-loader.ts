/**
 * Context Loader - Load and manage identity data
 *
 * Provides CRUD operations for the identity.yaml file,
 * with atomic updates and validation.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse, stringify } from 'yaml';
import { type Goal, type Identity, IdentitySchema, type Project } from './schemas/identity';

// Paths
const YXHYX_DIR = `${process.env.HOME}/.yxhyx`;
const IDENTITY_DIR = `${YXHYX_DIR}/identity`;
const IDENTITY_PATH = `${IDENTITY_DIR}/identity.yaml`;

/**
 * Check if Yxhyx is initialized
 */
export async function isInitialized(): Promise<boolean> {
	return existsSync(IDENTITY_PATH);
}

/**
 * Get the Yxhyx root directory
 */
export function getYxhyxDir(): string {
	return YXHYX_DIR;
}

/**
 * Get the identity file path
 */
export function getIdentityPath(): string {
	return IDENTITY_PATH;
}

/**
 * Load identity from YAML file
 * @throws Error if identity file doesn't exist or is invalid
 */
export async function loadIdentity(): Promise<Identity> {
	if (!existsSync(IDENTITY_PATH)) {
		throw new Error('Yxhyx not initialized. Run `yxhyx init` first.');
	}

	const content = await readFile(IDENTITY_PATH, 'utf-8');
	const data = parse(content);

	// Validate and return
	return IdentitySchema.parse(data);
}

/**
 * Save identity to YAML file
 * Creates parent directories if needed
 */
export async function saveIdentity(identity: Identity): Promise<void> {
	// Validate before saving
	IdentitySchema.parse(identity);

	// Ensure directory exists
	await mkdir(dirname(IDENTITY_PATH), { recursive: true });

	// Update timestamp
	identity.last_updated = new Date().toISOString();

	// Write file
	const content = stringify(identity, {
		lineWidth: 120,
		defaultStringType: 'QUOTE_DOUBLE',
		defaultKeyType: 'PLAIN',
	});
	await writeFile(IDENTITY_PATH, content, 'utf-8');
}

/**
 * Update identity with an updater function
 * Provides atomic update with validation
 */
export async function updateIdentity(
	updater: (current: Identity) => Identity | Promise<Identity>
): Promise<Identity> {
	const current = await loadIdentity();
	const updated = await updater(current);

	// Validate and save
	await saveIdentity(updated);
	return updated;
}

// ============================================
// Query Helpers
// ============================================

/**
 * Get all active goals (not completed)
 */
export async function getActiveGoals(): Promise<Goal[]> {
	const identity = await loadIdentity();
	return [
		...identity.goals.short_term,
		...identity.goals.medium_term,
		...identity.goals.long_term,
	].filter((g) => g.progress < 1);
}

/**
 * Get goals by term
 */
export async function getGoalsByTerm(
	term: 'short_term' | 'medium_term' | 'long_term'
): Promise<Goal[]> {
	const identity = await loadIdentity();
	return identity.goals[term];
}

/**
 * Get a goal by ID
 */
export async function getGoalById(goalId: string): Promise<Goal | undefined> {
	const identity = await loadIdentity();
	const allGoals = [
		...identity.goals.short_term,
		...identity.goals.medium_term,
		...identity.goals.long_term,
	];
	return allGoals.find((g) => g.id === goalId);
}

/**
 * Get all active projects
 */
export async function getActiveProjects(): Promise<Project[]> {
	const identity = await loadIdentity();
	return identity.projects.filter((p) => p.status === 'active');
}

/**
 * Get a project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | undefined> {
	const identity = await loadIdentity();
	return identity.projects.find((p) => p.id === projectId);
}

/**
 * Get all interests flattened
 */
export async function getAllInterests(): Promise<{ topic: string; subtopics: string[] }[]> {
	const identity = await loadIdentity();
	return [
		...identity.interests.high_priority,
		...identity.interests.medium_priority,
		...identity.interests.low_priority,
	];
}

/**
 * Get recent lessons
 */
export async function getRecentLessons(
	limit = 10
): Promise<{ lesson: string; context?: string; date: string }[]> {
	const identity = await loadIdentity();
	return identity.learned
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, limit);
}

/**
 * Get active challenges
 */
export async function getActiveChallenges(): Promise<
	{ id: string; title: string; description: string }[]
> {
	const identity = await loadIdentity();
	return identity.challenges.filter((c) => c.status === 'active');
}

// ============================================
// Context Building for AI
// ============================================

export type TaskType = 'chat' | 'checkin' | 'news' | 'research' | 'project';

/**
 * Build context string for AI interactions
 */
export async function buildContext(taskType: TaskType): Promise<string> {
	const identity = await loadIdentity();

	// Always include core identity
	const baseContext = {
		name: identity.about.name,
		timezone: identity.about.timezone,
		communication_preferences: identity.preferences.communication,
	};

	// Task-specific context
	const taskContextBuilders: Record<TaskType, () => Record<string, unknown>> = {
		chat: () => ({
			background: identity.about.background,
			expertise: identity.about.expertise,
			recent_lessons: identity.learned.slice(-5),
		}),

		checkin: () => ({
			goals: identity.goals,
			projects: identity.projects.filter((p) => p.status === 'active'),
			challenges: identity.challenges.filter((c) => c.status === 'active'),
		}),

		news: () => ({
			interests: identity.interests,
			news_preferences: identity.preferences.news,
		}),

		research: () => ({
			expertise: identity.about.expertise,
			interests: identity.interests.high_priority,
		}),

		project: () => ({
			tech_preferences: identity.preferences.tech_stack,
			active_projects: identity.projects.filter((p) => p.status === 'active'),
		}),
	};

	const context = {
		...baseContext,
		...taskContextBuilders[taskType](),
	};

	return stringify(context);
}

/**
 * Format context as system prompt section
 */
export async function formatContextForPrompt(taskType: TaskType): Promise<string> {
	const context = await buildContext(taskType);
	const identity = await loadIdentity();

	return `
<user_context>
${context}
</user_context>

Use this context to personalize your response. Reference the user by name (${identity.about.name}).
Align suggestions with their goals and interests.
Respect their communication preferences (${identity.preferences.communication.style}, ${identity.preferences.communication.length}).
`;
}
