/**
 * Check-In Runner - Execute interactive check-in sessions
 *
 * Handles the full check-in flow:
 * 1. Display context and questions
 * 2. Capture user responses
 * 3. Parse structured data (priorities, accomplishments)
 * 4. Update goals and learnings
 * 5. Record the check-in
 */

import inquirer from 'inquirer';
import { colors } from '../cli/formatting';
import { updateIdentity } from '../context-loader';
import { type CheckinEntry, type CheckinType, recordCheckin } from '../memory/state-manager';
import { modelRouter } from '../model-router';
import {
	type CheckinPrompt,
	buildEveningPrompt,
	buildMorningPrompt,
	buildWeeklyPrompt,
} from './templates';

// ============================================
// Types
// ============================================

export interface CheckinResult {
	type: CheckinType;
	timestamp: string;
	responses: Record<string, string>;
	priorities?: string[];
	accomplishments?: string[];
	learnings?: string[];
	goalUpdates?: Array<{ goalId: string; progress: number }>;
}

// ============================================
// Check-In Runner Class
// ============================================

export class CheckinRunner {
	/**
	 * Run morning check-in
	 */
	async runMorning(): Promise<CheckinResult> {
		const prompt = await buildMorningPrompt();
		return this.runInteractive(prompt);
	}

	/**
	 * Run evening check-in
	 */
	async runEvening(): Promise<CheckinResult> {
		const prompt = await buildEveningPrompt();
		return this.runInteractive(prompt);
	}

	/**
	 * Run weekly check-in
	 */
	async runWeekly(): Promise<CheckinResult> {
		const prompt = await buildWeeklyPrompt();
		return this.runInteractive(prompt);
	}

	/**
	 * Run an interactive check-in session
	 */
	private async runInteractive(prompt: CheckinPrompt): Promise<CheckinResult> {
		// Display header
		console.log(`\n${colors.bold}${prompt.greeting}${colors.reset}\n`);
		console.log(prompt.context);
		console.log(`\n${'='.repeat(50)}\n`);

		const responses: Record<string, string> = {};

		// Ask each question
		for (const question of prompt.questions) {
			const { response } = await inquirer.prompt([
				{
					type: 'input',
					name: 'response',
					message: question,
				},
			]);
			responses[question] = response.trim();
		}

		// Parse structured data from responses
		const result: CheckinResult = {
			type: prompt.type,
			timestamp: new Date().toISOString(),
			responses,
		};

		// Extract priorities from morning check-in
		if (prompt.type === 'morning') {
			const priorityResponse = responses[prompt.questions[0]];
			result.priorities = this.extractListItems(priorityResponse);
		}

		// Extract accomplishments and learnings from evening
		if (prompt.type === 'evening') {
			result.accomplishments = this.extractListItems(responses[prompt.questions[0]]);
			result.learnings = this.extractListItems(responses[prompt.questions[2]]);

			// Check for goal progress updates
			const progressResponse = responses[prompt.questions[3]];
			if (progressResponse && progressResponse.length > 10) {
				result.goalUpdates = await this.parseGoalUpdates(progressResponse);
			}
		}

		// Extract from weekly as well
		if (prompt.type === 'weekly') {
			result.accomplishments = this.extractListItems(responses[prompt.questions[0]]);
			result.learnings = this.extractListItems(responses[prompt.questions[1]]);

			// Check for goal progress updates
			const goalUpdateResponse = responses[prompt.questions[2]];
			if (goalUpdateResponse && goalUpdateResponse.length > 10) {
				result.goalUpdates = await this.parseGoalUpdates(goalUpdateResponse);
			}
		}

		// Record the check-in
		await recordCheckin(prompt.type, {
			priorities: result.priorities,
			accomplishments: result.accomplishments,
			learnings: result.learnings,
			goalUpdates: result.goalUpdates,
			responses,
		} as CheckinEntry);

		// Apply goal updates if any
		if (result.goalUpdates && result.goalUpdates.length > 0) {
			await this.applyGoalUpdates(result.goalUpdates);
		}

		// Add learnings to identity
		if (result.learnings && result.learnings.length > 0) {
			await this.addLearnings(result.learnings);
		}

		// Generate summary
		await this.showSummary(result);

		return result;
	}

	/**
	 * Extract list items from text
	 */
	private extractListItems(text: string): string[] {
		if (!text) return [];

		const lines = text.split('\n');
		const items: string[] = [];

		for (const line of lines) {
			const trimmed = line.trim();
			// Match: - item, * item, 1. item, 1) item
			const match = trimmed.match(/^[-*\d.)\s]*(.+)$/);
			if (match?.[1]) {
				const item = match[1].trim();
				// Skip headers (lines with :)
				if (item.length > 0 && !item.endsWith(':')) {
					items.push(item);
				}
			}
		}

		return items.filter((i) => i.length > 0);
	}

	/**
	 * Parse goal progress updates from text using AI
	 */
	private async parseGoalUpdates(
		text: string
	): Promise<Array<{ goalId: string; progress: number }>> {
		try {
			const { loadIdentity } = await import('../context-loader');
			const identity = await loadIdentity();

			const allGoals = [
				...identity.goals.short_term,
				...identity.goals.medium_term,
				...identity.goals.long_term,
			];

			// Don't call AI if we don't have any providers available
			if (!modelRouter.hasAvailableProvider()) {
				return [];
			}

			const response = await modelRouter.complete({
				model: 'cheapest',
				messages: [
					{
						role: 'user',
						content: `Extract goal progress updates from this text. 
          
Available goals:
${allGoals.map((g) => `- ${g.id}: ${g.title} (currently ${Math.round(g.progress * 100)}%)`).join('\n')}

User text:
"${text}"

Return ONLY a JSON array of updates, or empty array if none mentioned:
[{ "goalId": "goal-id", "progress": 0.5 }]

Only include goals that the user explicitly mentions progress on.
Response must be valid JSON array only, no other text.`,
					},
				],
			});

			const parsed = JSON.parse(response.content.trim());
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	/**
	 * Apply goal progress updates to identity
	 */
	private async applyGoalUpdates(
		updates: Array<{ goalId: string; progress: number }>
	): Promise<void> {
		await updateIdentity((identity) => {
			const updateGoals = <T extends { id: string; progress: number }>(goals: T[]): T[] =>
				goals.map((g) => {
					const update = updates.find((u) => u.goalId === g.id);
					return update ? { ...g, progress: Math.min(1, Math.max(0, update.progress)) } : g;
				});

			return {
				...identity,
				goals: {
					short_term: updateGoals(identity.goals.short_term),
					medium_term: updateGoals(identity.goals.medium_term),
					long_term: updateGoals(identity.goals.long_term),
				},
			};
		});

		console.log(`\n${colors.green}Updated ${updates.length} goal(s)${colors.reset}`);
	}

	/**
	 * Add learnings to identity
	 */
	private async addLearnings(learnings: string[]): Promise<void> {
		const today = new Date().toISOString().split('T')[0];

		await updateIdentity((identity) => ({
			...identity,
			learned: [
				...identity.learned,
				...learnings.map((lesson) => ({
					lesson,
					context: 'From check-in',
					date: today,
				})),
			],
		}));
	}

	/**
	 * Show check-in summary
	 */
	private async showSummary(result: CheckinResult): Promise<void> {
		console.log(`\n${'='.repeat(50)}`);
		console.log(`${colors.bold}CHECK-IN COMPLETE${colors.reset}`);
		console.log('='.repeat(50));

		if (result.priorities && result.priorities.length > 0) {
			console.log(`\n${colors.cyan}Today's Priorities:${colors.reset}`);
			for (const p of result.priorities) {
				console.log(`  - ${p}`);
			}
		}

		if (result.accomplishments && result.accomplishments.length > 0) {
			console.log(`\n${colors.green}Accomplishments:${colors.reset}`);
			for (const a of result.accomplishments) {
				console.log(`  - ${a}`);
			}
		}

		if (result.learnings && result.learnings.length > 0) {
			console.log(`\n${colors.yellow}Learnings Added:${colors.reset}`);
			for (const l of result.learnings) {
				console.log(`  - ${l}`);
			}
		}

		if (result.goalUpdates && result.goalUpdates.length > 0) {
			console.log(`\n${colors.magenta}Goals Updated:${colors.reset}`);
			for (const u of result.goalUpdates) {
				console.log(`  - ${u.goalId}: ${Math.round(u.progress * 100)}%`);
			}
		}

		console.log('');
	}
}

// Export singleton instance
export const checkinRunner = new CheckinRunner();
