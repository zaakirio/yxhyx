/**
 * Work Manager - Track work sessions with effort-based complexity
 *
 * Manages work tracking with appropriate overhead based on task complexity:
 * - TRIVIAL: No persistence
 * - QUICK: Single JSONL file
 * - STANDARD/THOROUGH: Directory structure with metadata
 */

import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse, stringify } from 'yaml';
import {
	type CurrentWork,
	type EffortLevel,
	type WorkItem,
	WorkItemSchema,
	type WorkMeta,
	generateWorkId,
	generateWorkItemId,
} from '../schemas/work';

// ============================================
// Paths
// ============================================

const YXHYX_DIR = `${process.env.HOME}/.yxhyx`;
const WORK_DIR = `${YXHYX_DIR}/memory/work`;
const STATE_FILE = `${YXHYX_DIR}/memory/state/current.json`;

// ============================================
// Work Manager Class
// ============================================

export class WorkManager {
	/**
	 * Create a new work session
	 *
	 * @param prompt - The initial prompt/request
	 * @param effort - Effort level determines structure
	 * @returns Work session ID
	 */
	async createWork(prompt: string, effort: EffortLevel): Promise<string> {
		const id = generateWorkId(prompt);
		const timestamp = new Date().toISOString();

		const item: WorkItem = {
			id: generateWorkItemId(id),
			timestamp,
			prompt,
			effort,
			status: 'active',
			files_changed: [],
			tools_used: [],
		};

		// Don't persist trivial work
		if (effort === 'TRIVIAL') {
			return id;
		}

		// Ensure work directory exists
		await mkdir(WORK_DIR, { recursive: true });

		if (effort === 'QUICK') {
			// Single file for quick work
			const filePath = `${WORK_DIR}/${id}.jsonl`;
			await appendFile(filePath, `${JSON.stringify(item)}\n`);
		} else {
			// Directory structure for complex work
			const workDir = `${WORK_DIR}/${id}`;
			await mkdir(workDir, { recursive: true });

			const meta: WorkMeta = {
				id,
				title: prompt.substring(0, 100),
				created: timestamp,
				updated: timestamp,
				effort,
				status: 'active',
				total_items: 1,
				total_cost_usd: 0,
				related_goals: [],
				tags: [],
			};

			await writeFile(`${workDir}/meta.yaml`, stringify(meta));
			await appendFile(`${workDir}/items.jsonl`, `${JSON.stringify(item)}\n`);
		}

		// Update current work state
		await this.setCurrentWork({ id, effort, started: timestamp });

		return id;
	}

	/**
	 * Add an item to an existing work session
	 */
	async addItem(workId: string, itemData: Partial<WorkItem>): Promise<void> {
		const effort = await this.getWorkEffort(workId);

		if (effort === 'TRIVIAL') {
			return; // Nothing to persist
		}

		const fullItem: WorkItem = WorkItemSchema.parse({
			id: generateWorkItemId(workId),
			timestamp: new Date().toISOString(),
			prompt: '',
			effort,
			status: 'active',
			files_changed: [],
			tools_used: [],
			...itemData,
		});

		if (effort === 'QUICK') {
			await appendFile(`${WORK_DIR}/${workId}.jsonl`, `${JSON.stringify(fullItem)}\n`);
		} else {
			await appendFile(`${WORK_DIR}/${workId}/items.jsonl`, `${JSON.stringify(fullItem)}\n`);
			const items = await this.getItems(workId);
			await this.updateMeta(workId, {
				total_items: items.length,
				updated: new Date().toISOString(),
			});
		}
	}

	/**
	 * Complete a work session
	 */
	async completeWork(workId: string, rating?: number): Promise<void> {
		const effort = await this.getWorkEffort(workId);

		if (effort !== 'TRIVIAL' && effort !== 'QUICK') {
			await this.updateMeta(workId, {
				status: 'completed',
				updated: new Date().toISOString(),
			});
		}

		// Clear current work
		await this.clearCurrentWork();

		// If rated, trigger learning capture
		if (rating !== undefined) {
			const { learningManager } = await import('./learning-manager');
			await learningManager.captureRating({
				id: `rating-${Date.now()}`,
				timestamp: new Date().toISOString(),
				rating,
				source: 'explicit',
				work_id: workId,
			});
		}
	}

	/**
	 * Abandon a work session
	 */
	async abandonWork(workId: string): Promise<void> {
		const effort = await this.getWorkEffort(workId);

		if (effort !== 'TRIVIAL' && effort !== 'QUICK') {
			await this.updateMeta(workId, {
				status: 'abandoned',
				updated: new Date().toISOString(),
			});
		}

		await this.clearCurrentWork();
	}

	/**
	 * Get current work session
	 */
	async getCurrentWork(): Promise<CurrentWork | null> {
		try {
			const content = await readFile(STATE_FILE, 'utf-8');
			const state = JSON.parse(content);
			return state.currentWork || null;
		} catch {
			return null;
		}
	}

	/**
	 * Get items from a work session
	 */
	async getItems(workId: string): Promise<WorkItem[]> {
		const effort = await this.getWorkEffort(workId);

		if (effort === 'TRIVIAL') {
			return [];
		}

		const path =
			effort === 'QUICK' ? `${WORK_DIR}/${workId}.jsonl` : `${WORK_DIR}/${workId}/items.jsonl`;

		try {
			const content = await readFile(path, 'utf-8');
			return content
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => JSON.parse(line));
		} catch {
			return [];
		}
	}

	/**
	 * Get work metadata
	 */
	async getMeta(workId: string): Promise<WorkMeta | null> {
		const metaPath = `${WORK_DIR}/${workId}/meta.yaml`;

		if (!existsSync(metaPath)) {
			return null;
		}

		try {
			const content = await readFile(metaPath, 'utf-8');
			return parse(content) as WorkMeta;
		} catch {
			return null;
		}
	}

	/**
	 * Get recent work sessions
	 */
	async getRecentWork(limit = 10): Promise<Array<{ id: string; title: string; created: string }>> {
		const { readdir } = await import('node:fs/promises');

		try {
			const entries = await readdir(WORK_DIR, { withFileTypes: true });
			const workItems: Array<{ id: string; title: string; created: string; timestamp: number }> =
				[];

			for (const entry of entries) {
				if (entry.isDirectory()) {
					const meta = await this.getMeta(entry.name);
					if (meta) {
						workItems.push({
							id: meta.id,
							title: meta.title,
							created: meta.created,
							timestamp: new Date(meta.created).getTime(),
						});
					}
				} else if (entry.name.endsWith('.jsonl')) {
					const id = entry.name.replace('.jsonl', '');
					const items = await this.getItems(id);
					if (items.length > 0) {
						workItems.push({
							id,
							title: items[0].prompt.substring(0, 100),
							created: items[0].timestamp,
							timestamp: new Date(items[0].timestamp).getTime(),
						});
					}
				}
			}

			return workItems
				.sort((a, b) => b.timestamp - a.timestamp)
				.slice(0, limit)
				.map(({ id, title, created }) => ({ id, title, created }));
		} catch {
			return [];
		}
	}

	// ============================================
	// Private Methods
	// ============================================

	private async setCurrentWork(work: CurrentWork): Promise<void> {
		const state = await this.getState();
		state.currentWork = work;
		await this.saveState(state);
	}

	private async clearCurrentWork(): Promise<void> {
		const state = await this.getState();
		state.currentWork = undefined;
		await this.saveState(state);
	}

	private async getState(): Promise<Record<string, unknown>> {
		try {
			const content = await readFile(STATE_FILE, 'utf-8');
			return JSON.parse(content);
		} catch {
			return { initialized: true };
		}
	}

	private async saveState(state: Record<string, unknown>): Promise<void> {
		const dir = `${YXHYX_DIR}/memory/state`;
		await mkdir(dir, { recursive: true });
		await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
	}

	private async getWorkEffort(workId: string): Promise<EffortLevel> {
		// Check if it's a directory (STANDARD/THOROUGH)
		if (existsSync(`${WORK_DIR}/${workId}/meta.yaml`)) {
			const content = await readFile(`${WORK_DIR}/${workId}/meta.yaml`, 'utf-8');
			const meta = parse(content) as WorkMeta;
			return meta.effort;
		}

		// Check if it's a JSONL file (QUICK)
		if (existsSync(`${WORK_DIR}/${workId}.jsonl`)) {
			return 'QUICK';
		}

		// Not found - assume TRIVIAL
		return 'TRIVIAL';
	}

	private async updateMeta(workId: string, updates: Partial<WorkMeta>): Promise<void> {
		const metaPath = `${WORK_DIR}/${workId}/meta.yaml`;

		try {
			const content = await readFile(metaPath, 'utf-8');
			const meta = parse(content) as WorkMeta;
			const updated = { ...meta, ...updates };
			await writeFile(metaPath, stringify(updated));
		} catch (err) {
			console.error(`Failed to update meta for ${workId}:`, err);
		}
	}
}

// Export singleton instance
export const workManager = new WorkManager();
