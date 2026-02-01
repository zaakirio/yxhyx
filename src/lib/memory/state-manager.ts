/**
 * State Manager - Manages runtime and persistent state
 *
 * Handles:
 * - Application state (initialized, session info)
 * - Check-in history
 * - Cost tracking by model/month
 *
 * Storage:
 * ~/.yxhyx/memory/state/
 *   current.json         - Current app state
 *   checkin-history.jsonl - Check-in log
 *   cost-tracking.json   - Cost data by model/month
 */

import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

// Paths
const YXHYX_DIR = `${process.env.HOME}/.yxhyx`;
const STATE_DIR = `${YXHYX_DIR}/memory/state`;
const STATE_PATH = join(STATE_DIR, 'current.json');
const CHECKIN_PATH = join(STATE_DIR, 'checkin-history.jsonl');
const COST_PATH = join(STATE_DIR, 'cost-tracking.json');

// ============================================
// Schemas
// ============================================

/**
 * Check-in type
 */
export const CheckinType = z.enum(['morning', 'evening', 'weekly', 'quick']);
export type CheckinType = z.infer<typeof CheckinType>;

/**
 * Application state schema
 */
export const AppStateSchema = z.object({
	initialized: z.boolean().default(false),
	initialized_at: z.string().optional(),

	// Current work (redundant with current-work.json but kept for quick access)
	current_work_id: z.string().optional(),

	// Session info
	session_start: z.string().optional(),
	last_activity: z.string().optional(),

	// Check-in tracking
	last_checkin: z
		.object({
			type: CheckinType,
			timestamp: z.string(),
		})
		.optional(),

	// Settings
	verbose: z.boolean().default(false),
	debug: z.boolean().default(false),
});

export type AppState = z.infer<typeof AppStateSchema>;

/**
 * Check-in entry schema
 */
export const CheckinEntrySchema = z.object({
	id: z.string(),
	type: CheckinType,
	timestamp: z.string(),

	// Content
	summary: z.string().optional(),
	goals_discussed: z.array(z.string()).default([]),
	mood: z.enum(['great', 'good', 'okay', 'poor', 'bad']).optional(),
	energy_level: z.number().min(1).max(10).optional(),

	// Outcomes
	action_items: z.array(z.string()).default([]),
	insights: z.array(z.string()).default([]),

	// Cost
	cost_usd: z.number().optional(),
	model_used: z.string().optional(),
});

export type CheckinEntry = z.infer<typeof CheckinEntrySchema>;

/**
 * Cost tracking schema
 */
export const CostTrackingSchema = z.record(z.number());
export type CostTracking = z.infer<typeof CostTrackingSchema>;

// ============================================
// State Manager Class
// ============================================

export class StateManager {
	// ============================================
	// Application State
	// ============================================

	/**
	 * Get current application state
	 */
	async getState(): Promise<AppState> {
		try {
			if (!existsSync(STATE_PATH)) {
				return { initialized: false, verbose: false, debug: false };
			}
			const content = await readFile(STATE_PATH, 'utf-8');
			const data = JSON.parse(content);
			return AppStateSchema.parse(data);
		} catch {
			return { initialized: false, verbose: false, debug: false };
		}
	}

	/**
	 * Update application state
	 */
	async setState(updates: Partial<AppState>): Promise<AppState> {
		await mkdir(dirname(STATE_PATH), { recursive: true });

		const current = await this.getState();
		const updated = AppStateSchema.parse({
			...current,
			...updates,
			last_activity: new Date().toISOString(),
		});

		await writeFile(STATE_PATH, JSON.stringify(updated, null, 2));
		return updated;
	}

	/**
	 * Initialize state (called during `yxhyx init`)
	 */
	async initialize(): Promise<AppState> {
		return this.setState({
			initialized: true,
			initialized_at: new Date().toISOString(),
			session_start: new Date().toISOString(),
		});
	}

	/**
	 * Check if initialized
	 */
	async isInitialized(): Promise<boolean> {
		const state = await this.getState();
		return state.initialized;
	}

	/**
	 * Start a new session
	 */
	async startSession(): Promise<void> {
		await this.setState({
			session_start: new Date().toISOString(),
		});
	}

	// ============================================
	// Check-in History
	// ============================================

	/**
	 * Record a check-in
	 */
	async recordCheckin(entry: Omit<CheckinEntry, 'id' | 'timestamp'>): Promise<CheckinEntry> {
		await mkdir(dirname(CHECKIN_PATH), { recursive: true });

		const fullEntry = CheckinEntrySchema.parse({
			id: `checkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
			timestamp: new Date().toISOString(),
			...entry,
		});

		await appendFile(CHECKIN_PATH, `${JSON.stringify(fullEntry)}\n`);

		// Update last check-in in state
		await this.setState({
			last_checkin: {
				type: fullEntry.type,
				timestamp: fullEntry.timestamp,
			},
		});

		return fullEntry;
	}

	/**
	 * Get check-in history
	 */
	async getCheckinHistory(limit = 30): Promise<CheckinEntry[]> {
		if (!existsSync(CHECKIN_PATH)) {
			return [];
		}

		try {
			const content = await readFile(CHECKIN_PATH, 'utf-8');
			const entries = content
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => CheckinEntrySchema.parse(JSON.parse(line)));

			// Sort by timestamp (newest first) and limit
			return entries
				.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
				.slice(0, limit);
		} catch {
			return [];
		}
	}

	/**
	 * Get check-ins by type
	 */
	async getCheckinsByType(type: CheckinType, limit = 10): Promise<CheckinEntry[]> {
		const all = await this.getCheckinHistory(100);
		return all.filter((c) => c.type === type).slice(0, limit);
	}

	/**
	 * Get last check-in of a specific type
	 */
	async getLastCheckin(type?: CheckinType): Promise<CheckinEntry | null> {
		const history = await this.getCheckinHistory(50);

		if (type) {
			return history.find((c) => c.type === type) || null;
		}

		return history[0] || null;
	}

	/**
	 * Check if check-in is due
	 */
	async isCheckinDue(type: CheckinType): Promise<boolean> {
		const last = await this.getLastCheckin(type);
		if (!last) return true;

		const lastTime = new Date(last.timestamp).getTime();
		const now = Date.now();
		const hoursSince = (now - lastTime) / (1000 * 60 * 60);

		switch (type) {
			case 'morning':
			case 'evening':
				// Due if more than 20 hours (allows for schedule variance)
				return hoursSince > 20;
			case 'weekly':
				// Due if more than 6 days
				return hoursSince > 24 * 6;
			case 'quick':
				// Quick check-ins are always available
				return true;
			default:
				return true;
		}
	}

	// ============================================
	// Cost Tracking
	// ============================================

	/**
	 * Record a cost
	 */
	async recordCost(model: string, cost: number): Promise<void> {
		await mkdir(dirname(COST_PATH), { recursive: true });

		let tracking: CostTracking = {};
		if (existsSync(COST_PATH)) {
			try {
				const content = await readFile(COST_PATH, 'utf-8');
				tracking = CostTrackingSchema.parse(JSON.parse(content));
			} catch {
				// Start fresh if file is corrupted
			}
		}

		const month = new Date().toISOString().substring(0, 7); // YYYY-MM
		const modelKey = `${month}:${model}`;
		const totalKey = `${month}:total`;

		tracking[modelKey] = (tracking[modelKey] || 0) + cost;
		tracking[totalKey] = (tracking[totalKey] || 0) + cost;

		await writeFile(COST_PATH, JSON.stringify(tracking, null, 2));
	}

	/**
	 * Get monthly cost
	 */
	async getMonthlyCost(month?: string): Promise<number> {
		const targetMonth = month || new Date().toISOString().substring(0, 7);

		if (!existsSync(COST_PATH)) {
			return 0;
		}

		try {
			const content = await readFile(COST_PATH, 'utf-8');
			const tracking = CostTrackingSchema.parse(JSON.parse(content));
			return tracking[`${targetMonth}:total`] || 0;
		} catch {
			return 0;
		}
	}

	/**
	 * Get cost breakdown by model for a month
	 */
	async getCostBreakdown(month?: string): Promise<Record<string, number>> {
		const targetMonth = month || new Date().toISOString().substring(0, 7);

		if (!existsSync(COST_PATH)) {
			return {};
		}

		try {
			const content = await readFile(COST_PATH, 'utf-8');
			const tracking = CostTrackingSchema.parse(JSON.parse(content));

			const breakdown: Record<string, number> = {};
			for (const [key, value] of Object.entries(tracking)) {
				if (key.startsWith(targetMonth) && !key.endsWith(':total')) {
					const model = key.split(':')[1];
					breakdown[model] = value;
				}
			}

			return breakdown;
		} catch {
			return {};
		}
	}

	/**
	 * Get total cost across all months
	 */
	async getTotalCost(): Promise<number> {
		if (!existsSync(COST_PATH)) {
			return 0;
		}

		try {
			const content = await readFile(COST_PATH, 'utf-8');
			const tracking = CostTrackingSchema.parse(JSON.parse(content));

			let total = 0;
			for (const [key, value] of Object.entries(tracking)) {
				if (key.endsWith(':total')) {
					total += value;
				}
			}

			return total;
		} catch {
			return 0;
		}
	}

	/**
	 * Get cost history for multiple months
	 */
	async getCostHistory(months = 6): Promise<Array<{ month: string; cost: number }>> {
		const history: Array<{ month: string; cost: number }> = [];
		const now = new Date();

		for (let i = 0; i < months; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const month = date.toISOString().substring(0, 7);
			const cost = await this.getMonthlyCost(month);
			history.push({ month, cost });
		}

		return history;
	}

	/**
	 * Project monthly cost based on current usage
	 */
	async getProjectedMonthlyCost(): Promise<number> {
		const currentMonth = new Date().toISOString().substring(0, 7);
		const currentCost = await this.getMonthlyCost(currentMonth);

		const today = new Date();
		const dayOfMonth = today.getDate();
		const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

		return (currentCost / dayOfMonth) * daysInMonth;
	}
}

// Export singleton instance
export const stateManager = new StateManager();

// Export convenience functions
export async function getState(): Promise<AppState> {
	return stateManager.getState();
}

export async function setState(updates: Partial<AppState>): Promise<AppState> {
	return stateManager.setState(updates);
}

export async function recordCheckin(
	entry: Omit<CheckinEntry, 'id' | 'timestamp'>
): Promise<CheckinEntry> {
	return stateManager.recordCheckin(entry);
}

export async function getCheckinHistory(limit = 30): Promise<CheckinEntry[]> {
	return stateManager.getCheckinHistory(limit);
}

export async function recordCost(model: string, cost: number): Promise<void> {
	return stateManager.recordCost(model, cost);
}

export async function getMonthlyCost(month?: string): Promise<number> {
	return stateManager.getMonthlyCost(month);
}

export async function getCostBreakdown(month?: string): Promise<Record<string, number>> {
	return stateManager.getCostBreakdown(month);
}
