/**
 * Check-In Command - Accountability check-ins
 *
 * Usage:
 *   yxhyx checkin           - Auto-select based on time of day
 *   yxhyx checkin morning   - Morning check-in
 *   yxhyx checkin evening   - Evening check-in
 *   yxhyx checkin weekly    - Weekly review
 *   yxhyx checkin -q        - Quick mode
 *   yxhyx checkin history   - View check-in history
 *   yxhyx checkin streak    - View check-in streak
 */

import { Command } from 'commander';
import { quickEvening, quickMorning } from '../lib/checkin/quick';
import { checkinRunner } from '../lib/checkin/runner';
import { colors } from '../lib/cli/formatting';
import { type CheckinType, getCheckinHistory, getCheckinStreak } from '../lib/memory/state-manager';

// ============================================
// Check-In Command
// ============================================

export const checkinCommand = new Command('checkin')
	.description('Accountability check-ins')
	.argument('[type]', 'Check-in type: morning, evening, weekly')
	.option('-q, --quick', 'Quick check-in mode')
	.action(async (inputType: string | undefined, options: { quick?: boolean }) => {
		// Default to morning if AM, evening if PM
		const type = inputType ?? (new Date().getHours() < 12 ? 'morning' : 'evening');

		// Handle quick mode
		if (options.quick) {
			if (type === 'morning') {
				await quickMorning();
			} else if (type === 'evening') {
				await quickEvening();
			} else {
				console.log(
					`${colors.yellow}Quick mode not available for weekly reviews. Running full weekly review...${colors.reset}\n`
				);
				await checkinRunner.runWeekly();
			}
			return;
		}

		// Run appropriate check-in
		switch (type) {
			case 'morning':
				await checkinRunner.runMorning();
				break;
			case 'evening':
				await checkinRunner.runEvening();
				break;
			case 'weekly':
				await checkinRunner.runWeekly();
				break;
			default:
				console.log(`${colors.yellow}Unknown check-in type: ${type}${colors.reset}`);
				console.log('Available types: morning, evening, weekly');
		}
	});

// ============================================
// History Subcommand
// ============================================

checkinCommand
	.command('history')
	.description('View check-in history')
	.option('-n, --limit <count>', 'Number of entries', '10')
	.option('-t, --type <type>', 'Filter by type (morning, evening, weekly)')
	.action(async (options: { limit: string; type?: string }) => {
		const limit = Number.parseInt(options.limit, 10) || 10;
		const history = await getCheckinHistory(limit * 2); // Get extra to account for filtering

		let filtered = history;
		if (options.type) {
			filtered = history.filter((h) => h.type === options.type);
		}
		filtered = filtered.slice(-limit);

		if (filtered.length === 0) {
			console.log(`\n${colors.yellow}No check-ins found.${colors.reset}`);
			console.log('Start a check-in with: yxhyx checkin\n');
			return;
		}

		console.log(`\n${colors.bold}Check-in History${colors.reset}`);
		console.log('='.repeat(40));

		for (const entry of filtered.reverse()) {
			const date = new Date(entry.timestamp);
			const dateStr = date.toLocaleDateString();
			const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

			const typeIcon =
				{
					morning: '',
					evening: '',
					weekly: '',
				}[entry.type as CheckinType] || '';

			console.log(
				`\n${colors.cyan}[${entry.type.toUpperCase()}]${colors.reset} ${typeIcon} ${dateStr} ${timeStr}`
			);

			if (entry.quick) {
				console.log(`  ${colors.dim}(Quick check-in)${colors.reset}`);
			}

			if (entry.priorities && entry.priorities.length > 0) {
				console.log(`  ${colors.green}Priorities:${colors.reset} ${entry.priorities.join(', ')}`);
			}

			if (entry.accomplishments && entry.accomplishments.length > 0) {
				console.log(
					`  ${colors.yellow}Accomplishments:${colors.reset} ${entry.accomplishments.join(', ')}`
				);
			}

			if (entry.learnings && entry.learnings.length > 0) {
				console.log(`  ${colors.magenta}Learnings:${colors.reset} ${entry.learnings.join(', ')}`);
			}
		}

		console.log('');
	});

// ============================================
// Streak Subcommand
// ============================================

checkinCommand
	.command('streak')
	.description('View your check-in streak')
	.action(async () => {
		const streak = await getCheckinStreak();
		const history = await getCheckinHistory(100);

		// Count weekly reviews
		const weeklyCount = history.filter((h) => h.type === 'weekly').length;

		console.log(`\n${colors.bold}Check-in Streak${colors.reset}`);
		console.log('='.repeat(30));

		// Morning streak
		const morningEmoji = streak.morning >= 7 ? '' : streak.morning >= 3 ? '' : '';
		console.log(`Morning: ${morningEmoji} ${streak.morning} day${streak.morning !== 1 ? 's' : ''}`);

		// Evening streak
		const eveningEmoji = streak.evening >= 7 ? '' : streak.evening >= 3 ? '' : '';
		console.log(`Evening: ${eveningEmoji} ${streak.evening} day${streak.evening !== 1 ? 's' : ''}`);

		// Weekly reviews
		console.log(`Weekly reviews: ${weeklyCount} total`);

		// Encouragement
		const totalStreak = streak.morning + streak.evening;
		if (totalStreak >= 14) {
			console.log(`\n${colors.green}Amazing consistency! Keep it up!${colors.reset}`);
		} else if (totalStreak >= 7) {
			console.log(`\n${colors.cyan}You're building a great habit!${colors.reset}`);
		} else if (totalStreak >= 3) {
			console.log(`\n${colors.yellow}Good start! Keep going!${colors.reset}`);
		} else {
			console.log(`\n${colors.dim}Start building your streak today!${colors.reset}`);
		}

		console.log('');
	});
