/**
 * Work Manager - Manages work tracking and persistence
 *
 * Handles creation, updates, and retrieval of work sessions.
 * Uses effort-based structure to avoid overhead for simple tasks.
 *
 * Storage structure:
 * - TRIVIAL: No persistence
 * - QUICK: ~/.yxhyx/memory/work/{id}.jsonl
 * - STANDARD/THOROUGH: ~/.yxhyx/memory/work/{id}/meta.yaml + items.jsonl
 */

import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';
import {
	type CurrentWork,
	CurrentWorkSchema,
	type EffortLevel,
	type WorkItem,
	WorkItemSchema,
	type WorkMeta,
	WorkMetaSchema,
	type WorkStatus,
	classifyEffort,
	createWorkItem,
	createWorkMeta,
	generateWorkId,
} from '../schemas/work';

// Paths
const YXHYX_DIR = `${process.env.HOME}/.yxhyx`;
const WORK_DIR = `${YXHYX_DIR}/memory/work`;
const STATE_DIR = `${YXHYX_DIR}/memory/state`;
const CURRENT_WORK_PATH = `${STATE_DIR}/current-work.json`;

/**
 * Work Manager class - handles all work tracking operations
 */
export class WorkManager {
	/**
	 * Create new work session
	 *
	 * @param prompt - The initial prompt/task
	 * @param effort - Effort level (or auto-classify from prompt)
	 * @param options - Additional options
	 * @returns Work ID
	 */
	async createWork(
		prompt: string,
		effort?: EffortLevel,
		options?: {
			relatedGoals?: string[];
			relatedProjects?: string[];
			tags?: string[];
		}
	): Promise<string> {
		const actualEffort = effort || classifyEffort(prompt);
		const workId = generateWorkId(prompt);

		// TRIVIAL: No persistence, just return ID for tracking
		if (actualEffort === 'TRIVIAL') {
			return workId;
		}

		// Create first work item
		const item = createWorkItem(workId, prompt, actualEffort);

		// Ensure directories exist
		await mkdir(WORK_DIR, { recursive: true });
		await mkdir(STATE_DIR, { recursive: true });

		if (actualEffort === 'QUICK') {
			// Single JSONL file
			const filePath = join(WORK_DIR, `${workId}.jsonl`);
			await writeFile(filePath, `${JSON.stringify(item)}\n`);
		} else {
			// Directory structure for STANDARD/THOROUGH
			const workDir = join(WORK_DIR, workId);
			await mkdir(workDir, { recursive: true });

			// Create metadata
			const meta = createWorkMeta(workId, prompt.substring(0, 100), actualEffort, {
				total_items: 1,
				related_goals: options?.relatedGoals || [],
				related_projects: options?.relatedProjects || [],
				tags: options?.tags || [],
			});

			await writeFile(join(workDir, 'meta.yaml'), stringify(meta));
			await writeFile(join(workDir, 'items.jsonl'), `${JSON.stringify(item)}\n`);

			// Create artifacts directory for THOROUGH
			if (actualEffort === 'THOROUGH') {
				await mkdir(join(workDir, 'artifacts'), { recursive: true });
			}
		}

		// Set as current work
		await this.setCurrentWork(workId, actualEffort);

		return workId;
	}

	/**
	 * Add an item to existing work
	 */
	async addItem(
		workId: string,
		item: Partial<Omit<WorkItem, 'id' | 'timestamp' | 'effort'>>
	): Promise<WorkItem> {
		const effort = await this.getWorkEffort(workId);

		if (!effort || effort === 'TRIVIAL') {
			throw new Error(`Cannot add item to work ${workId}: work not found or is trivial`);
		}

		// Create full item
		const fullItem = WorkItemSchema.parse({
			id: `${workId}-${Date.now()}`,
			timestamp: new Date().toISOString(),
			effort,
			status: 'active',
			files_changed: [],
			tools_used: [],
			...item,
		});

		// Append to appropriate file
		if (effort === 'QUICK') {
			const filePath = join(WORK_DIR, `${workId}.jsonl`);
			await appendFile(filePath, `${JSON.stringify(fullItem)}\n`);
		} else {
			const itemsPath = join(WORK_DIR, workId, 'items.jsonl');
			await appendFile(itemsPath, `${JSON.stringify(fullItem)}\n`);

			// Update metadata
			const items = await this.getItems(workId);
			await this.updateMeta(workId, {
				total_items: items.length,
				updated: new Date().toISOString(),
				total_cost_usd: items.reduce((sum, i) => sum + (i.cost_usd || 0), 0),
				total_input_tokens: items.reduce((sum, i) => sum + (i.input_tokens || 0), 0),
				total_output_tokens: items.reduce((sum, i) => sum + (i.output_tokens || 0), 0),
			});
		}

		// Update current work activity
		await this.updateCurrentWorkActivity();

		return fullItem;
	}

	/**
	 * Complete work session
	 */
	async completeWork(workId: string, rating?: number): Promise<void> {
		const effort = await this.getWorkEffort(workId);

		if (!effort || effort === 'TRIVIAL') {
			// Just clear current work
			await this.clearCurrentWork();
			return;
		}

		if (effort !== 'QUICK') {
			// Update metadata status
			await this.updateMeta(workId, {
				status: 'completed',
				updated: new Date().toISOString(),
				average_rating: rating,
			});
		}

		// Clear current work state
		const currentWork = await this.getCurrentWork();
		if (currentWork?.id === workId) {
			await this.clearCurrentWork();
		}
	}

	/**
	 * Abandon work session
	 */
	async abandonWork(workId: string): Promise<void> {
		const effort = await this.getWorkEffort(workId);

		if (effort && effort !== 'QUICK' && effort !== 'TRIVIAL') {
			await this.updateMeta(workId, {
				status: 'abandoned',
				updated: new Date().toISOString(),
			});
		}

		const currentWork = await this.getCurrentWork();
		if (currentWork?.id === workId) {
			await this.clearCurrentWork();
		}
	}

	/**
	 * Get current work
	 */
	async getCurrentWork(): Promise<CurrentWork | null> {
		try {
			if (!existsSync(CURRENT_WORK_PATH)) {
				return null;
			}
			const content = await readFile(CURRENT_WORK_PATH, 'utf-8');
			const data = JSON.parse(content);
			return CurrentWorkSchema.parse(data);
		} catch {
			return null;
		}
	}

	/**
	 * Set current work
	 */
	private async setCurrentWork(workId: string, effort: EffortLevel): Promise<void> {
		await mkdir(dirname(CURRENT_WORK_PATH), { recursive: true });

		const currentWork: CurrentWork = {
			id: workId,
			effort,
			started: new Date().toISOString(),
			last_activity: new Date().toISOString(),
			item_count: 1,
		};

		await writeFile(CURRENT_WORK_PATH, JSON.stringify(currentWork, null, 2));
	}

	/**
	 * Update current work activity timestamp
	 */
	private async updateCurrentWorkActivity(): Promise<void> {
		const current = await this.getCurrentWork();
		if (!current) return;

		current.last_activity = new Date().toISOString();
		current.item_count++;

		await writeFile(CURRENT_WORK_PATH, JSON.stringify(current, null, 2));
	}

	/**
	 * Clear current work
	 */
	async clearCurrentWork(): Promise<void> {
		try {
			if (existsSync(CURRENT_WORK_PATH)) {
				await writeFile(CURRENT_WORK_PATH, '{}');
			}
		} catch {
			// Ignore errors
		}
	}

	/**
	 * Get work effort level
	 */
	async getWorkEffort(workId: string): Promise<EffortLevel | null> {
		// Check for directory structure (STANDARD/THOROUGH)
		const metaPath = join(WORK_DIR, workId, 'meta.yaml');
		if (existsSync(metaPath)) {
			try {
				const content = await readFile(metaPath, 'utf-8');
				const meta = WorkMetaSchema.parse(parse(content));
				return meta.effort;
			} catch {
				return null;
			}
		}

		// Check for JSONL file (QUICK)
		const jsonlPath = join(WORK_DIR, `${workId}.jsonl`);
		if (existsSync(jsonlPath)) {
			return 'QUICK';
		}

		return null;
	}

	/**
	 * Get all items for a work session
	 */
	async getItems(workId: string): Promise<WorkItem[]> {
		const effort = await this.getWorkEffort(workId);

		if (!effort || effort === 'TRIVIAL') {
			return [];
		}

		const itemsPath =
			effort === 'QUICK'
				? join(WORK_DIR, `${workId}.jsonl`)
				: join(WORK_DIR, workId, 'items.jsonl');

		if (!existsSync(itemsPath)) {
			return [];
		}

		const content = await readFile(itemsPath, 'utf-8');
		return content
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => WorkItemSchema.parse(JSON.parse(line)));
	}

	/**
	 * Get work metadata
	 */
	async getMeta(workId: string): Promise<WorkMeta | null> {
		const metaPath = join(WORK_DIR, workId, 'meta.yaml');
		if (!existsSync(metaPath)) {
			return null;
		}

		try {
			const content = await readFile(metaPath, 'utf-8');
			return WorkMetaSchema.parse(parse(content));
		} catch {
			return null;
		}
	}

	/**
	 * Update work metadata
	 */
	async updateMeta(workId: string, updates: Partial<WorkMeta>): Promise<void> {
		const metaPath = join(WORK_DIR, workId, 'meta.yaml');
		const current = await this.getMeta(workId);

		if (!current) {
			throw new Error(`Work metadata not found: ${workId}`);
		}

		const updated = WorkMetaSchema.parse({
			...current,
			...updates,
		});

		await writeFile(metaPath, stringify(updated));
	}

	/**
	 * List recent work sessions
	 */
	async listRecentWork(
		limit = 10
	): Promise<Array<{ id: string; effort: EffortLevel; meta?: WorkMeta }>> {
		if (!existsSync(WORK_DIR)) {
			return [];
		}

		const entries = await readdir(WORK_DIR, { withFileTypes: true });
		const work: Array<{ id: string; effort: EffortLevel; meta?: WorkMeta; mtime: number }> = [];

		for (const entry of entries) {
			if (entry.isDirectory()) {
				// STANDARD/THOROUGH work
				const meta = await this.getMeta(entry.name);
				if (meta) {
					work.push({
						id: entry.name,
						effort: meta.effort,
						meta,
						mtime: new Date(meta.updated).getTime(),
					});
				}
			} else if (entry.name.endsWith('.jsonl')) {
				// QUICK work
				const id = entry.name.replace('.jsonl', '');
				const items = await this.getItems(id);
				const lastItem = items[items.length - 1];
				work.push({
					id,
					effort: 'QUICK',
					mtime: lastItem ? new Date(lastItem.timestamp).getTime() : 0,
				});
			}
		}

		// Sort by modification time (newest first)
		work.sort((a, b) => b.mtime - a.mtime);

		return work.slice(0, limit).map(({ id, effort, meta }) => ({ id, effort, meta }));
	}

	/**
	 * Get work by status
	 */
	async getWorkByStatus(status: WorkStatus): Promise<WorkMeta[]> {
		if (!existsSync(WORK_DIR)) {
			return [];
		}

		const entries = await readdir(WORK_DIR, { withFileTypes: true });
		const results: WorkMeta[] = [];

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const meta = await this.getMeta(entry.name);
				if (meta && meta.status === status) {
					results.push(meta);
				}
			}
		}

		return results;
	}

	/**
	 * Calculate total costs across all work
	 */
	async getTotalCosts(since?: Date): Promise<{ total: number; byModel: Record<string, number> }> {
		if (!existsSync(WORK_DIR)) {
			return { total: 0, byModel: {} };
		}

		const entries = await readdir(WORK_DIR, { withFileTypes: true });
		let total = 0;
		const byModel: Record<string, number> = {};

		for (const entry of entries) {
			let items: WorkItem[] = [];

			if (entry.isDirectory()) {
				items = await this.getItems(entry.name);
			} else if (entry.name.endsWith('.jsonl')) {
				items = await this.getItems(entry.name.replace('.jsonl', ''));
			}

			for (const item of items) {
				if (since && new Date(item.timestamp) < since) {
					continue;
				}

				if (item.cost_usd) {
					total += item.cost_usd;
					if (item.model_used) {
						byModel[item.model_used] = (byModel[item.model_used] || 0) + item.cost_usd;
					}
				}
			}
		}

		return { total, byModel };
	}
}

// Export singleton instance
export const workManager = new WorkManager();

// Export convenience functions
export async function createWork(
	prompt: string,
	effort?: EffortLevel,
	options?: { relatedGoals?: string[]; relatedProjects?: string[]; tags?: string[] }
): Promise<string> {
	return workManager.createWork(prompt, effort, options);
}

export async function addWorkItem(
	workId: string,
	item: Partial<Omit<WorkItem, 'id' | 'timestamp' | 'effort'>>
): Promise<WorkItem> {
	return workManager.addItem(workId, item);
}

export async function completeWork(workId: string, rating?: number): Promise<void> {
	return workManager.completeWork(workId, rating);
}

export async function getCurrentWork(): Promise<CurrentWork | null> {
	return workManager.getCurrentWork();
}
