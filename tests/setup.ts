/**
 * Test Setup - Global setup for Vitest
 *
 * This file runs before all tests to:
 * - Set up test environment variables
 * - Create temporary test directories
 * - Mock filesystem operations where needed
 */

import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { afterAll, beforeAll } from 'vitest';

// Use a unique test directory per test run to avoid conflicts
const TEST_HOME = `/tmp/yxhyx-test-${process.pid}`;

// Override HOME for tests - MUST happen before any imports
process.env.HOME = TEST_HOME;

// Override HOME for tests
beforeAll(async () => {
	// Ensure HOME is set
	process.env.HOME = TEST_HOME;

	// Clean and create test directory with retries
	for (let i = 0; i < 3; i++) {
		try {
			if (existsSync(TEST_HOME)) {
				await rm(TEST_HOME, { recursive: true, force: true });
			}
			await mkdir(TEST_HOME, { recursive: true });
			await mkdir(`${TEST_HOME}/.yxhyx`, { recursive: true });
			break;
		} catch (e) {
			if (i === 2) throw e;
			await new Promise((r) => setTimeout(r, 100));
		}
	}
});

afterAll(async () => {
	// Clean up test directory
	try {
		await rm(TEST_HOME, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
});

afterAll(async () => {
	// Clean up test directory
	try {
		await rm(TEST_HOME, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
});

afterAll(async () => {
	// Restore original HOME
	if (process.env.ORIGINAL_HOME) {
		process.env.HOME = process.env.ORIGINAL_HOME;
	}

	// Clean up test directory
	await rm(TEST_HOME, { recursive: true, force: true });
});

// Reset test directory between test suites if needed
beforeEach(async () => {
	// Individual tests can opt into clean state
});

afterEach(async () => {
	// Cleanup after each test if needed
});

// Export test helpers - these are functions so they pick up the current HOME
export const getTestDir = () => process.env.HOME || TEST_HOME;
export const getTestYxhyxDir = () => `${process.env.HOME || TEST_HOME}/.yxhyx`;

// For backwards compatibility
export const TEST_DIR = `/tmp/yxhyx-test-${process.pid}`;
export const TEST_YXHYX_DIR = `${TEST_DIR}/.yxhyx`;

/**
 * Helper to create a fresh test environment
 */
export async function resetTestEnvironment(): Promise<void> {
	const yxhyxDir = getTestYxhyxDir();

	try {
		// Only remove subdirectories, not the main .yxhyx dir
		const { readdir } = await import('node:fs/promises');
		if (existsSync(yxhyxDir)) {
			const entries = await readdir(yxhyxDir);
			for (const entry of entries) {
				await rm(`${yxhyxDir}/${entry}`, { recursive: true, force: true });
			}
		}
	} catch {
		// Ignore errors
	}

	// Ensure directory exists
	await mkdir(yxhyxDir, { recursive: true });
}

/**
 * Helper to create a mock identity for tests
 */
export function createMockIdentity(overrides: Record<string, unknown> = {}) {
	return {
		version: '1.0',
		last_updated: new Date().toISOString(),
		about: {
			name: 'Test User',
			timezone: 'UTC',
			background: 'Test background',
			expertise: ['testing', 'development'],
		},
		mission: 'Test mission',
		beliefs: [],
		goals: {
			short_term: [
				{
					id: 'goal-short-1',
					title: 'Complete tests',
					progress: 0.5,
					related_projects: [],
				},
			],
			medium_term: [],
			long_term: [],
		},
		projects: [
			{
				id: 'project-1',
				name: 'Test Project',
				status: 'active',
				description: 'A test project',
				next_actions: [],
				related_goals: ['goal-short-1'],
			},
		],
		interests: {
			high_priority: [{ topic: 'Testing', subtopics: ['unit', 'integration'] }],
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
				frameworks: ['Vitest'],
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
		...overrides,
	};
}
