/**
 * State Manager - Track application state, check-ins, and costs
 *
 * Manages:
 * - Current application state
 * - Check-in history
 * - Cost tracking by model and month
 */

import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';

// ============================================
// Paths
// ============================================

const YXHYX_DIR = `${process.env.HOME}/.yxhyx`;
const STATE_DIR = `${YXHYX_DIR}/memory/state`;
const STATE_FILE = `${STATE_DIR}/current.json`;
const CHECKIN_FILE = `${STATE_DIR}/checkin-history.jsonl`;
const COST_FILE = `${STATE_DIR}/cost-tracking.json`;

// ============================================
// Types
// ============================================

export interface AppState {
	initialized: boolean;
	currentWork?: { id: string; effort: string; started: string };
	lastCheckin?: { type: string; timestamp: string };
	sessionStart?: string;
}

export type CheckinType = 'morning' | 'evening' | 'weekly';

export interface CheckinEntry {
	type: CheckinType;
	timestamp: string;
	priorities?: string[];
	accomplishments?: string[];
	learnings?: string[];
	goalUpdates?: Array<{ goalId: string; progress: number }>;
	responses?: Record<string, string>;
	quick?: boolean;
}

// ============================================
// State Management
// ============================================

/**
 * Get current application state
 */
export async function getState(): Promise<AppState> {
	try {
		const content = await readFile(STATE_FILE, 'utf-8');
		return JSON.parse(content);
	} catch {
		return { initialized: false };
	}
}

/**
 * Update application state
 */
export async function setState(updates: Partial<AppState>): Promise<void> {
	await mkdir(STATE_DIR, { recursive: true });

	const current = await getState();
	const updated = { ...current, ...updates };
	await writeFile(STATE_FILE, JSON.stringify(updated, null, 2));
}

/**
 * Initialize state (called by init command)
 */
export async function initializeState(): Promise<void> {
	await setState({
		initialized: true,
		sessionStart: new Date().toISOString(),
	});
}

// ============================================
// Check-in History
// ============================================

/**
 * Record a check-in
 */
export async function recordCheckin(type: CheckinType, data: Partial<CheckinEntry>): Promise<void> {
	await mkdir(STATE_DIR, { recursive: true });

	const entry: CheckinEntry = {
		type,
		timestamp: new Date().toISOString(),
		...data,
	};

	await appendFile(CHECKIN_FILE, `${JSON.stringify(entry)}\n`);
	await setState({ lastCheckin: { type, timestamp: entry.timestamp } });
}

/**
 * Get check-in history
 */
export async function getCheckinHistory(limit = 30): Promise<CheckinEntry[]> {
	if (!existsSync(CHECKIN_FILE)) {
		return [];
	}

	try {
		const content = await readFile(CHECKIN_FILE, 'utf-8');
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

/**
 * Get check-ins for a specific day
 */
export async function getCheckinsForDate(date: Date): Promise<CheckinEntry[]> {
	const dateStr = date.toISOString().split('T')[0];
	const history = await getCheckinHistory(100);

	return history.filter((entry) => entry.timestamp.startsWith(dateStr));
}

/**
 * Calculate check-in streak
 */
export async function getCheckinStreak(): Promise<{ morning: number; evening: number }> {
	const history = await getCheckinHistory(100);
	const today = new Date();

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

	return { morning: morningStreak, evening: eveningStreak };
}

// ============================================
// Cost Tracking
// ============================================

/**
 * Record API cost
 */
export async function recordCost(model: string, cost: number): Promise<void> {
	await mkdir(STATE_DIR, { recursive: true });

	let tracking: Record<string, number> = {};

	if (existsSync(COST_FILE)) {
		try {
			const content = await readFile(COST_FILE, 'utf-8');
			tracking = JSON.parse(content);
		} catch {
			// Start fresh if file is corrupted
		}
	}

	const month = new Date().toISOString().substring(0, 7); // YYYY-MM
	const modelKey = `${month}:${model}`;
	const totalKey = `${month}:total`;

	tracking[modelKey] = (tracking[modelKey] || 0) + cost;
	tracking[totalKey] = (tracking[totalKey] || 0) + cost;

	await writeFile(COST_FILE, JSON.stringify(tracking, null, 2));
}

/**
 * Get monthly cost total
 */
export async function getMonthlyCost(month?: string): Promise<number> {
	const targetMonth = month || new Date().toISOString().substring(0, 7);

	if (!existsSync(COST_FILE)) {
		return 0;
	}

	try {
		const content = await readFile(COST_FILE, 'utf-8');
		const tracking = JSON.parse(content);
		return tracking[`${targetMonth}:total`] || 0;
	} catch {
		return 0;
	}
}

/**
 * Get cost breakdown by model
 */
export async function getCostBreakdown(month?: string): Promise<Record<string, number>> {
	const targetMonth = month || new Date().toISOString().substring(0, 7);

	if (!existsSync(COST_FILE)) {
		return {};
	}

	try {
		const content = await readFile(COST_FILE, 'utf-8');
		const tracking = JSON.parse(content) as Record<string, number>;

		const breakdown: Record<string, number> = {};

		for (const [key, cost] of Object.entries(tracking)) {
			if (key.startsWith(targetMonth) && !key.includes(':total')) {
				const model = key.split(':')[1];
				breakdown[model] = cost;
			}
		}

		return breakdown;
	} catch {
		return {};
	}
}

/**
 * Get projected monthly cost
 */
export async function getProjectedMonthlyCost(): Promise<number> {
	const currentCost = await getMonthlyCost();
	const today = new Date();
	const dayOfMonth = today.getDate();
	const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

	return (currentCost / dayOfMonth) * daysInMonth;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
	const today = new Date();
	return date.toDateString() === today.toDateString();
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: Date): boolean {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return date.toDateString() === yesterday.toDateString();
}

/**
 * Get start of current week (Monday)
 */
export function getWeekStart(date: Date = new Date()): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
	return new Date(d.setDate(diff));
}

/**
 * Get last check-in entry
 */
export async function getLastCheckin(): Promise<CheckinEntry | null> {
	const history = await getCheckinHistory(1);
	return history[0] || null;
}

// ============================================
// StateManager Class (for singleton pattern)
// ============================================

/**
 * StateManager provides a class-based interface to state operations
 */
export class StateManager {
	async getState(): Promise<AppState> {
		return getState();
	}

	async setState(updates: Partial<AppState>): Promise<void> {
		return setState(updates);
	}

	async initializeState(): Promise<void> {
		return initializeState();
	}

	async recordCheckin(type: CheckinType, data: Partial<CheckinEntry>): Promise<void> {
		return recordCheckin(type, data);
	}

	async getCheckinHistory(limit = 30): Promise<CheckinEntry[]> {
		return getCheckinHistory(limit);
	}

	async getLastCheckin(): Promise<CheckinEntry | null> {
		return getLastCheckin();
	}

	async getCheckinStreak(): Promise<{ morning: number; evening: number }> {
		return getCheckinStreak();
	}

	async recordCost(model: string, cost: number): Promise<void> {
		return recordCost(model, cost);
	}

	async getMonthlyCost(month?: string): Promise<number> {
		return getMonthlyCost(month);
	}

	async getCostBreakdown(month?: string): Promise<Record<string, number>> {
		return getCostBreakdown(month);
	}

	async getProjectedMonthlyCost(): Promise<number> {
		return getProjectedMonthlyCost();
	}
}

// Export singleton instance
export const stateManager = new StateManager();
