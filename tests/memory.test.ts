/**
 * Memory System Tests
 *
 * Tests for:
 * - Work Manager
 * - Learning Manager
 * - State Manager
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_YXHYX_DIR, resetTestEnvironment } from './setup';

// ============================================
// Work Manager Tests
// ============================================

describe('Work Manager', () => {
	beforeEach(async () => {
		await resetTestEnvironment();
	});

	describe('createWork', () => {
		it('should create a QUICK work session', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Test quick task', 'QUICK');

			expect(id).toBeDefined();
			expect(id.length).toBeGreaterThan(0);

			// Should create a JSONL file
			expect(existsSync(`${TEST_YXHYX_DIR}/memory/work/${id}.jsonl`)).toBe(true);
		});

		it('should create a STANDARD work session with directory', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Test standard task', 'STANDARD');

			// Should create a directory with meta.yaml
			expect(existsSync(`${TEST_YXHYX_DIR}/memory/work/${id}/meta.yaml`)).toBe(true);
			expect(existsSync(`${TEST_YXHYX_DIR}/memory/work/${id}/items.jsonl`)).toBe(true);
		});

		it('should not persist TRIVIAL work', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Trivial task', 'TRIVIAL');

			expect(id).toBeDefined();

			// Should NOT create any files
			expect(existsSync(`${TEST_YXHYX_DIR}/memory/work/${id}.jsonl`)).toBe(false);
			expect(existsSync(`${TEST_YXHYX_DIR}/memory/work/${id}`)).toBe(false);
		});

		it('should track current work in state', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Test task', 'QUICK');
			const current = await workManager.getCurrentWork();

			expect(current?.id).toBe(id);
			expect(current?.effort).toBe('QUICK');
		});
	});

	describe('completeWork', () => {
		it('should clear current work after completion', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Test task', 'QUICK');
			expect(await workManager.getCurrentWork()).not.toBeNull();

			await workManager.completeWork(id);
			expect(await workManager.getCurrentWork()).toBeNull();
		});

		it('should complete STANDARD work without error', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Standard task', 'STANDARD');

			// Give filesystem time to sync
			await new Promise((r) => setTimeout(r, 50));

			// Complete should not throw
			await workManager.completeWork(id);

			// Work should be cleared
			expect(await workManager.getCurrentWork()).toBeNull();
		});
	});

	describe('addItem', () => {
		it('should add items to QUICK work', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Test task', 'QUICK');

			// Wait for file to be created
			await new Promise((r) => setTimeout(r, 50));

			await workManager.addItem(id, {
				prompt: 'Additional prompt',
				response: 'Some response',
			});

			const items = await workManager.getItems(id);
			expect(items.length).toBeGreaterThanOrEqual(1);
		});

		it('should not add items to TRIVIAL work', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			const id = await workManager.createWork('Trivial task', 'TRIVIAL');

			await workManager.addItem(id, {
				prompt: 'Should not persist',
			});

			const items = await workManager.getItems(id);
			expect(items).toHaveLength(0);
		});
	});

	describe('getRecentWork', () => {
		it('should return recent work sessions', async () => {
			const { workManager } = await import('../src/lib/memory/work-manager');

			// Create a work session
			await workManager.createWork('Test task', 'QUICK');

			// Wait for filesystem
			await new Promise((r) => setTimeout(r, 50));

			const recent = await workManager.getRecentWork(10);

			// Should have at least the one we created
			expect(recent.length).toBeGreaterThanOrEqual(1);
		});
	});
});

// ============================================
// Learning Manager Tests
// ============================================

describe('Learning Manager', () => {
	beforeEach(async () => {
		await resetTestEnvironment();
		// Create learning directories
		await mkdir(`${TEST_YXHYX_DIR}/memory/learning/signals`, { recursive: true });
	});

	describe('parseExplicitRating', () => {
		it('should parse simple numeric ratings', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			expect(learningManager.parseExplicitRating('7')).toEqual({ rating: 7 });
			expect(learningManager.parseExplicitRating('10')).toEqual({ rating: 10 });
			expect(learningManager.parseExplicitRating('1')).toEqual({ rating: 1 });
		});

		it('should parse ratings with comments', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			const result = learningManager.parseExplicitRating('8 - great response');
			expect(result?.rating).toBe(8);
			expect(result?.comment).toBe('great response');
		});

		it('should parse "rating: N" format', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			expect(learningManager.parseExplicitRating('rating: 9')).toEqual({ rating: 9 });
		});

		it('should return null for non-rating input', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			expect(learningManager.parseExplicitRating('hello world')).toBeNull();
			expect(learningManager.parseExplicitRating('15')).toBeNull(); // Out of range
			expect(learningManager.parseExplicitRating('0')).toBeNull(); // Out of range
		});
	});

	describe('captureRating', () => {
		it('should store ratings in JSONL file', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			await learningManager.captureRating({
				id: 'test-rating-1',
				timestamp: new Date().toISOString(),
				rating: 8,
				source: 'explicit',
				comment: 'Good response',
			});

			const ratingsFile = `${TEST_YXHYX_DIR}/memory/learning/signals/ratings.jsonl`;
			expect(existsSync(ratingsFile)).toBe(true);

			const content = await readFile(ratingsFile, 'utf-8');
			const rating = JSON.parse(content.trim());
			expect(rating.rating).toBe(8);
			expect(rating.comment).toBe('Good response');
		});

		it('should trigger failure learning for low ratings', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			await learningManager.captureRating({
				id: 'low-rating',
				timestamp: new Date().toISOString(),
				rating: 3,
				source: 'explicit',
				comment: 'Bad experience',
			});

			// Should create a failure learning
			const learnings = await learningManager.getAllLearnings();
			const failures = learnings.filter((l) => l.type === 'failure');
			expect(failures.length).toBeGreaterThanOrEqual(1);
		});

		it('should trigger success learning for high ratings', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			await learningManager.captureRating({
				id: 'high-rating',
				timestamp: new Date().toISOString(),
				rating: 9,
				source: 'explicit',
				comment: 'Excellent!',
			});

			// Should create a success learning
			const learnings = await learningManager.getAllLearnings();
			const successes = learnings.filter((l) => l.type === 'success');
			expect(successes.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('getRecentRatings', () => {
		it('should return ratings from the specified period', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			// Add some ratings
			await learningManager.captureRating({
				id: 'recent-1',
				timestamp: new Date().toISOString(),
				rating: 7,
				source: 'explicit',
			});

			const ratings = await learningManager.getRecentRatings(7);
			expect(ratings.length).toBeGreaterThanOrEqual(1);
		});

		it('should return empty array when no ratings file exists', async () => {
			// Remove ratings file
			await rm(`${TEST_YXHYX_DIR}/memory/learning/signals/ratings.jsonl`, { force: true });

			const { learningManager } = await import('../src/lib/memory/learning-manager');
			const ratings = await learningManager.getRecentRatings(7);

			expect(ratings).toEqual([]);
		});
	});

	describe('getRatingStats', () => {
		it('should calculate correct statistics', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			// Add multiple ratings
			for (const rating of [6, 7, 8, 8, 9]) {
				await learningManager.captureRating({
					id: `stat-rating-${rating}-${Date.now()}`,
					timestamp: new Date().toISOString(),
					rating,
					source: 'explicit',
				});
			}

			const stats = await learningManager.getRatingStats(7);

			expect(stats.total).toBe(5);
			expect(stats.average).toBe(7.6);
			expect(stats.min).toBe(6);
			expect(stats.max).toBe(9);
			expect(stats.distribution[8]).toBe(2);
		});

		it('should return zero stats when no ratings exist', async () => {
			await rm(`${TEST_YXHYX_DIR}/memory/learning/signals/ratings.jsonl`, { force: true });

			const { learningManager } = await import('../src/lib/memory/learning-manager');
			const stats = await learningManager.getRatingStats(7);

			expect(stats.total).toBe(0);
			expect(stats.average).toBe(0);
		});
	});

	describe('retrieveRelevantLearnings', () => {
		beforeEach(async () => {
			// Create some test learnings
			await mkdir(
				`${TEST_YXHYX_DIR}/memory/learning/patterns/${new Date().toISOString().substring(0, 7)}`,
				{
					recursive: true,
				}
			);
			await mkdir(
				`${TEST_YXHYX_DIR}/memory/learning/positive/${new Date().toISOString().substring(0, 7)}`,
				{
					recursive: true,
				}
			);
		});

		it('should retrieve learnings matching context keywords', async () => {
			const { learningManager } = await import('../src/lib/memory/learning-manager');

			// First, create some learnings by capturing ratings
			await learningManager.captureRating({
				id: 'ts-rating',
				timestamp: new Date().toISOString(),
				rating: 9,
				source: 'explicit',
				prompt_snippet: 'TypeScript coding question',
				comment: 'Great TypeScript help',
			});

			await learningManager.captureRating({
				id: 'py-rating',
				timestamp: new Date().toISOString(),
				rating: 9,
				source: 'explicit',
				prompt_snippet: 'Python script help',
				comment: 'Good Python assistance',
			});

			// Retrieve learnings for TypeScript context
			const learnings = await learningManager.retrieveRelevantLearnings(
				'Help me with TypeScript generics',
				5
			);

			// Should find TypeScript-related learnings
			expect(learnings.some((l) => l.situation?.includes('TypeScript'))).toBe(true);
		});
	});
});

// ============================================
// State Manager Tests
// ============================================

describe('State Manager', () => {
	beforeEach(async () => {
		await resetTestEnvironment();
	});

	describe('getState / setState', () => {
		it('should return default state when not initialized', async () => {
			const { getState } = await import('../src/lib/memory/state-manager');
			const state = await getState();

			expect(state.initialized).toBe(false);
		});

		it('should persist state updates', async () => {
			const { getState, setState } = await import('../src/lib/memory/state-manager');

			await setState({ initialized: true, sessionStart: '2024-01-01' });
			const state = await getState();

			expect(state.initialized).toBe(true);
			expect(state.sessionStart).toBe('2024-01-01');
		});

		it('should merge updates with existing state', async () => {
			const { getState, setState } = await import('../src/lib/memory/state-manager');

			await setState({ initialized: true });
			await setState({ sessionStart: '2024-01-02' });

			const state = await getState();
			expect(state.initialized).toBe(true);
			expect(state.sessionStart).toBe('2024-01-02');
		});
	});

	describe('Check-in Management', () => {
		it('should record and retrieve check-ins', async () => {
			const { recordCheckin, getCheckinHistory } = await import('../src/lib/memory/state-manager');

			await recordCheckin('morning', {
				priorities: ['Task 1', 'Task 2'],
			});

			const history = await getCheckinHistory(10);
			expect(history).toHaveLength(1);
			expect(history[0].type).toBe('morning');
			expect(history[0].priorities).toEqual(['Task 1', 'Task 2']);
		});

		it('should update lastCheckin state', async () => {
			const { recordCheckin, getState } = await import('../src/lib/memory/state-manager');

			await recordCheckin('evening', {
				accomplishments: ['Finished tests'],
			});

			const state = await getState();
			expect(state.lastCheckin?.type).toBe('evening');
		});

		it('should calculate check-in streak', async () => {
			const { recordCheckin, getCheckinStreak } = await import('../src/lib/memory/state-manager');

			// Record today's check-ins
			await recordCheckin('morning', { priorities: [] });
			await recordCheckin('evening', { accomplishments: [] });

			const streak = await getCheckinStreak();
			expect(streak.morning).toBe(1);
			expect(streak.evening).toBe(1);
		});
	});

	describe('Cost Tracking', () => {
		it('should record and retrieve costs', async () => {
			const { recordCost, getMonthlyCost } = await import('../src/lib/memory/state-manager');

			await recordCost('kimi-8k', 0.001);
			await recordCost('kimi-8k', 0.002);
			await recordCost('claude-sonnet', 0.05);

			const total = await getMonthlyCost();
			expect(total).toBeCloseTo(0.053, 4);
		});

		it('should get cost breakdown by model', async () => {
			const { recordCost, getCostBreakdown } = await import('../src/lib/memory/state-manager');

			await recordCost('kimi-8k', 0.001);
			await recordCost('claude-sonnet', 0.05);

			const breakdown = await getCostBreakdown();
			expect(breakdown['kimi-8k']).toBeCloseTo(0.001, 4);
			expect(breakdown['claude-sonnet']).toBeCloseTo(0.05, 4);
		});

		it('should project monthly cost', async () => {
			const { recordCost, getProjectedMonthlyCost } = await import(
				'../src/lib/memory/state-manager'
			);

			await recordCost('test-model', 1.0);

			const projected = await getProjectedMonthlyCost();
			// Projected should be current * (days in month / current day)
			expect(projected).toBeGreaterThanOrEqual(1.0);
		});
	});

	describe('Utility Functions', () => {
		it('isToday should correctly identify today', async () => {
			const { isToday } = await import('../src/lib/memory/state-manager');

			expect(isToday(new Date())).toBe(true);

			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			expect(isToday(yesterday)).toBe(false);
		});

		it('isYesterday should correctly identify yesterday', async () => {
			const { isYesterday } = await import('../src/lib/memory/state-manager');

			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			expect(isYesterday(yesterday)).toBe(true);

			expect(isYesterday(new Date())).toBe(false);
		});

		it('getWeekStart should return Monday', async () => {
			const { getWeekStart } = await import('../src/lib/memory/state-manager');

			// Test with a known date (e.g., Thursday Jan 4, 2024)
			const thursday = new Date('2024-01-04');
			const weekStart = getWeekStart(thursday);

			expect(weekStart.getDay()).toBe(1); // Monday
			expect(weekStart.toISOString().substring(0, 10)).toBe('2024-01-01');
		});
	});
});
