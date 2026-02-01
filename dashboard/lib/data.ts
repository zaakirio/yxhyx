/**
 * Data Layer - Read yxhyx data from ~/.yxhyx directory
 *
 * Server-side functions to load identity, check-ins, learnings, and costs.
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { readFile, readdir, stat } from 'fs/promises';
import { parse } from 'yaml';

// ============================================
// Paths
// ============================================

const YXHYX_DIR = join(homedir(), '.yxhyx');
const IDENTITY_PATH = join(YXHYX_DIR, 'identity', 'identity.yaml');
const STATE_DIR = join(YXHYX_DIR, 'memory', 'state');
const LEARNING_DIR = join(YXHYX_DIR, 'memory', 'learning');
const SIGNALS_DIR = join(LEARNING_DIR, 'signals');
const PATTERNS_DIR = join(LEARNING_DIR, 'patterns');
const POSITIVE_DIR = join(LEARNING_DIR, 'positive');

// ============================================
// Types
// ============================================

export interface Goal {
	id: string;
	title: string;
	description?: string;
	deadline?: string;
	progress: number;
	related_projects: string[];
	created?: string;
}

export interface Project {
	id: string;
	name: string;
	status: 'active' | 'paused' | 'completed' | 'abandoned';
	description: string;
	repo?: string;
	next_actions: string[];
	related_goals: string[];
	created?: string;
}

export interface Interest {
	topic: string;
	subtopics: string[];
}

export interface Belief {
	statement: string;
	confidence: number;
	added: string;
}

export interface Challenge {
	id: string;
	title: string;
	description: string;
	status: 'active' | 'resolved' | 'abandoned';
	related_goals: string[];
	created?: string;
}

export interface Lesson {
	lesson: string;
	context?: string;
	date: string;
}

export interface Identity {
	version: string;
	last_updated: string;
	about: {
		name: string;
		timezone: string;
		location?: string;
		background: string;
		expertise: string[];
	};
	mission: string;
	beliefs: Belief[];
	goals: {
		short_term: Goal[];
		medium_term: Goal[];
		long_term: Goal[];
	};
	projects: Project[];
	interests: {
		high_priority: Interest[];
		medium_priority: Interest[];
		low_priority: Interest[];
	};
	challenges: Challenge[];
	preferences: {
		communication: {
			style: 'direct' | 'diplomatic' | 'socratic';
			length: 'concise' | 'detailed' | 'adaptive';
			formality: 'formal' | 'casual' | 'professional';
		};
		tech_stack: {
			languages: string[];
			frameworks: string[];
			package_manager: string;
			testing: string;
		};
		news: {
			format: 'bullet_points' | 'paragraphs' | 'headlines_only';
			max_items: number;
			preferred_sources: string[];
		};
	};
	learned: Lesson[];
}

export interface CheckinEntry {
	type: 'morning' | 'evening' | 'weekly';
	timestamp: string;
	priorities?: string[];
	accomplishments?: string[];
	learnings?: string[];
	goalUpdates?: Array<{ goalId: string; progress: number }>;
	responses?: Record<string, string>;
	quick?: boolean;
}

export interface Rating {
	id: string;
	timestamp: string;
	rating: number;
	source: 'explicit' | 'implicit';
	comment?: string;
	work_id?: string;
	prompt_snippet?: string;
	sentiment_summary?: string;
}

export interface Learning {
	id: string;
	timestamp: string;
	type: 'failure' | 'success';
	situation: string;
	what_went_wrong?: string;
	what_went_right?: string;
	lesson: string;
	action_items: string[];
	work_id?: string;
	rating_id?: string;
	tags: string[];
}

// ============================================
// Identity Data
// ============================================

export async function isInitialized(): Promise<boolean> {
	return existsSync(IDENTITY_PATH);
}

export async function loadIdentity(): Promise<Identity | null> {
	if (!existsSync(IDENTITY_PATH)) {
		return null;
	}

	try {
		const content = await readFile(IDENTITY_PATH, 'utf-8');
		return parse(content) as Identity;
	} catch (error) {
		console.error('Failed to load identity:', error);
		return null;
	}
}

// ============================================
// Check-in Data
// ============================================

export async function getCheckinHistory(limit = 30): Promise<CheckinEntry[]> {
	const checkinFile = join(STATE_DIR, 'checkin-history.jsonl');

	if (!existsSync(checkinFile)) {
		return [];
	}

	try {
		const content = await readFile(checkinFile, 'utf-8');
		const entries = content
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => JSON.parse(line) as CheckinEntry);

		return entries.slice(-limit);
	} catch {
		return [];
	}
}

export async function getCheckinStats(): Promise<{
	totalCheckins: number;
	morningStreak: number;
	eveningStreak: number;
	weeklyCount: number;
	lastWeekCheckins: CheckinEntry[];
}> {
	const history = await getCheckinHistory(100);
	const today = new Date();
	const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

	// Calculate streaks
	let morningStreak = 0;
	let eveningStreak = 0;

	for (let i = 0; i < 30; i++) {
		const checkDate = new Date(today);
		checkDate.setDate(checkDate.getDate() - i);
		const dateStr = checkDate.toISOString().split('T')[0];

		const hasMorning = history.some((h) => h.type === 'morning' && h.timestamp.startsWith(dateStr));
		const hasEvening = history.some((h) => h.type === 'evening' && h.timestamp.startsWith(dateStr));

		if (hasMorning && i === morningStreak) morningStreak++;
		if (hasEvening && i === eveningStreak) eveningStreak++;
	}

	const lastWeekCheckins = history.filter((h) => new Date(h.timestamp) >= oneWeekAgo);

	return {
		totalCheckins: history.length,
		morningStreak,
		eveningStreak,
		weeklyCount: history.filter((h) => h.type === 'weekly').length,
		lastWeekCheckins,
	};
}

// ============================================
// Rating & Learning Data
// ============================================

export async function getRecentRatings(days = 30): Promise<Rating[]> {
	const ratingsFile = join(SIGNALS_DIR, 'ratings.jsonl');

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

export async function getRatingStats(days = 30): Promise<{
	total: number;
	average: number;
	min: number;
	max: number;
	distribution: Record<number, number>;
	trend: Array<{ date: string; average: number; count: number }>;
}> {
	const ratings = await getRecentRatings(days);

	if (ratings.length === 0) {
		return {
			total: 0,
			average: 0,
			min: 0,
			max: 0,
			distribution: {},
			trend: [],
		};
	}

	const values = ratings.map((r) => r.rating);
	const sum = values.reduce((acc, val) => acc + val, 0);

	// Build distribution
	const distribution: Record<number, number> = {};
	for (const rating of values) {
		distribution[rating] = (distribution[rating] || 0) + 1;
	}

	// Build daily trend
	const dailyData: Record<string, { sum: number; count: number }> = {};
	for (const rating of ratings) {
		const date = rating.timestamp.split('T')[0];
		if (!dailyData[date]) {
			dailyData[date] = { sum: 0, count: 0 };
		}
		dailyData[date].sum += rating.rating;
		dailyData[date].count += 1;
	}

	const trend = Object.entries(dailyData)
		.map(([date, data]) => ({
			date,
			average: data.sum / data.count,
			count: data.count,
		}))
		.sort((a, b) => a.date.localeCompare(b.date));

	return {
		total: ratings.length,
		average: sum / ratings.length,
		min: Math.min(...values),
		max: Math.max(...values),
		distribution,
		trend,
	};
}

export async function getAllLearnings(): Promise<Learning[]> {
	const learnings: Learning[] = [];

	for (const dir of [PATTERNS_DIR, POSITIVE_DIR]) {
		if (!existsSync(dir)) continue;

		try {
			const months = await readdir(dir);

			for (const month of months) {
				const monthDir = join(dir, month);
				const monthStat = await stat(monthDir);

				if (!monthStat.isDirectory()) continue;

				const files = await readdir(monthDir);

				for (const file of files) {
					if (!file.endsWith('.jsonl')) continue;

					try {
						const content = await readFile(join(monthDir, file), 'utf-8');
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

	return learnings.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	);
}

// ============================================
// Cost Data
// ============================================

export async function getCostData(): Promise<{
	monthlyTotal: number;
	breakdown: Record<string, number>;
	projected: number;
	history: Array<{ month: string; total: number; breakdown: Record<string, number> }>;
}> {
	const costFile = join(STATE_DIR, 'cost-tracking.json');

	if (!existsSync(costFile)) {
		return {
			monthlyTotal: 0,
			breakdown: {},
			projected: 0,
			history: [],
		};
	}

	try {
		const content = await readFile(costFile, 'utf-8');
		const tracking = JSON.parse(content) as Record<string, number>;

		const currentMonth = new Date().toISOString().substring(0, 7);
		const monthlyTotal = tracking[`${currentMonth}:total`] || 0;

		// Build current month breakdown
		const breakdown: Record<string, number> = {};
		for (const [key, cost] of Object.entries(tracking)) {
			if (key.startsWith(currentMonth) && !key.includes(':total')) {
				const model = key.split(':')[1];
				breakdown[model] = cost;
			}
		}

		// Calculate projected cost
		const today = new Date();
		const dayOfMonth = today.getDate();
		const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
		const projected = (monthlyTotal / dayOfMonth) * daysInMonth;

		// Build history (last 6 months)
		const history: Array<{ month: string; total: number; breakdown: Record<string, number> }> = [];
		const months = new Set<string>();

		for (const key of Object.keys(tracking)) {
			const month = key.split(':')[0];
			months.add(month);
		}

		for (const month of Array.from(months).sort().slice(-6)) {
			const total = tracking[`${month}:total`] || 0;
			const monthBreakdown: Record<string, number> = {};

			for (const [key, cost] of Object.entries(tracking)) {
				if (key.startsWith(month) && !key.includes(':total')) {
					const model = key.split(':')[1];
					monthBreakdown[model] = cost;
				}
			}

			history.push({ month, total, breakdown: monthBreakdown });
		}

		return {
			monthlyTotal,
			breakdown,
			projected,
			history,
		};
	} catch {
		return {
			monthlyTotal: 0,
			breakdown: {},
			projected: 0,
			history: [],
		};
	}
}

// ============================================
// Goals & Projects Aggregation
// ============================================

export async function getGoalStats(): Promise<{
	total: number;
	completed: number;
	inProgress: number;
	byTerm: {
		short: { total: number; avgProgress: number };
		medium: { total: number; avgProgress: number };
		long: { total: number; avgProgress: number };
	};
}> {
	const identity = await loadIdentity();

	if (!identity) {
		return {
			total: 0,
			completed: 0,
			inProgress: 0,
			byTerm: {
				short: { total: 0, avgProgress: 0 },
				medium: { total: 0, avgProgress: 0 },
				long: { total: 0, avgProgress: 0 },
			},
		};
	}

	const allGoals = [
		...identity.goals.short_term,
		...identity.goals.medium_term,
		...identity.goals.long_term,
	];

	const calcAvg = (goals: Goal[]) =>
		goals.length > 0 ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length : 0;

	return {
		total: allGoals.length,
		completed: allGoals.filter((g) => g.progress >= 1).length,
		inProgress: allGoals.filter((g) => g.progress > 0 && g.progress < 1).length,
		byTerm: {
			short: {
				total: identity.goals.short_term.length,
				avgProgress: calcAvg(identity.goals.short_term),
			},
			medium: {
				total: identity.goals.medium_term.length,
				avgProgress: calcAvg(identity.goals.medium_term),
			},
			long: {
				total: identity.goals.long_term.length,
				avgProgress: calcAvg(identity.goals.long_term),
			},
		},
	};
}

export async function getProjectStats(): Promise<{
	total: number;
	active: number;
	paused: number;
	completed: number;
}> {
	const identity = await loadIdentity();

	if (!identity) {
		return { total: 0, active: 0, paused: 0, completed: 0 };
	}

	return {
		total: identity.projects.length,
		active: identity.projects.filter((p) => p.status === 'active').length,
		paused: identity.projects.filter((p) => p.status === 'paused').length,
		completed: identity.projects.filter((p) => p.status === 'completed').length,
	};
}
