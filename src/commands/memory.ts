/**
 * Memory Command - View and manage the memory system
 *
 * Usage:
 *   yxhyx memory learnings   - View captured learnings
 *   yxhyx memory patterns    - Show synthesized patterns
 *   yxhyx memory rate <n>    - Rate last interaction
 *   yxhyx memory work        - View recent work sessions
 */

import { Command } from 'commander';
import { colors } from '../lib/cli/formatting';
import { learningManager } from '../lib/memory/learning-manager';
import { getCostBreakdown, getMonthlyCost } from '../lib/memory/state-manager';
import { workManager } from '../lib/memory/work-manager';

// ============================================
// Memory Command
// ============================================

export const memoryCommand = new Command('memory').description('View and manage memory system');

// ============================================
// Learnings Subcommand
// ============================================

memoryCommand
	.command('learnings')
	.description('View captured learnings')
	.option('-n, --limit <count>', 'Number to show', '10')
	.option('-t, --type <type>', 'Filter by type (failure, success, insight)')
	.action(async (options: { limit: string; type?: string }) => {
		const limit = Number.parseInt(options.limit, 10) || 10;
		let learnings = await learningManager.getAllLearnings();

		if (options.type) {
			learnings = learnings.filter((l) => l.type === options.type);
		}

		// Sort by recency
		learnings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
		learnings = learnings.slice(0, limit);

		if (learnings.length === 0) {
			console.log(`\n${colors.yellow}No learnings captured yet.${colors.reset}`);
			console.log('Learnings are captured when you rate interactions (type a number 1-10).\n');
			return;
		}

		console.log(`\n${colors.bold}Recent Learnings${colors.reset}`);
		console.log('='.repeat(50));

		for (const learning of learnings) {
			const date = new Date(learning.timestamp).toLocaleDateString();
			const typeColor = {
				failure: colors.red,
				success: colors.green,
				insight: colors.cyan,
			}[learning.type];

			const typeIcon = {
				failure: '',
				success: '',
				insight: '',
			}[learning.type];

			console.log(
				`\n${typeColor}[${learning.type.toUpperCase()}]${colors.reset} ${typeIcon} ${date}`
			);
			console.log(`  Situation: ${learning.situation}`);
			console.log(`  ${colors.bold}Lesson:${colors.reset} ${learning.lesson}`);

			if (learning.tags.length > 0) {
				console.log(`  ${colors.dim}Tags: ${learning.tags.join(', ')}${colors.reset}`);
			}
		}

		console.log('');
	});

// ============================================
// Patterns Subcommand
// ============================================

memoryCommand
	.command('patterns')
	.description('Show synthesized patterns from recent ratings')
	.action(async () => {
		console.log(`\n${colors.bold}Synthesizing patterns...${colors.reset}\n`);

		const patterns = await learningManager.synthesizePatterns();
		console.log(patterns);
		console.log('');
	});

// ============================================
// Rate Subcommand
// ============================================

memoryCommand
	.command('rate <rating>')
	.description('Rate last interaction (1-10)')
	.option('-c, --comment <text>', 'Optional comment')
	.action(async (rating: string, options: { comment?: string }) => {
		const ratingNum = Number.parseInt(rating, 10);

		if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
			console.log(`${colors.red}Rating must be a number between 1 and 10${colors.reset}`);
			return;
		}

		await learningManager.captureRating({
			id: `rating-${Date.now()}`,
			timestamp: new Date().toISOString(),
			rating: ratingNum,
			source: 'explicit',
			comment: options.comment,
		});

		const emoji = ratingNum >= 8 ? '' : ratingNum >= 5 ? '' : '';
		console.log(
			`\n${colors.green}${emoji} Rated: ${ratingNum}/10${options.comment ? ` - ${options.comment}` : ''}${colors.reset}\n`
		);
	});

// ============================================
// Work Subcommand
// ============================================

memoryCommand
	.command('work')
	.description('View recent work sessions')
	.option('-n, --limit <count>', 'Number to show', '10')
	.action(async (options: { limit: string }) => {
		const limit = Number.parseInt(options.limit, 10) || 10;
		const recentWork = await workManager.getRecentWork(limit);

		if (recentWork.length === 0) {
			console.log(`\n${colors.yellow}No work sessions recorded yet.${colors.reset}`);
			console.log('Work is automatically tracked when you use chat.\n');
			return;
		}

		console.log(`\n${colors.bold}Recent Work Sessions${colors.reset}`);
		console.log('='.repeat(50));

		for (const work of recentWork) {
			const date = new Date(work.created).toLocaleDateString();
			const time = new Date(work.created).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
			});

			console.log(`\n${colors.cyan}${date} ${time}${colors.reset}`);
			console.log(`  ${work.title}`);
			console.log(`  ${colors.dim}ID: ${work.id}${colors.reset}`);
		}

		console.log('');
	});

// ============================================
// Cost Subcommand
// ============================================

memoryCommand
	.command('cost')
	.description('View API costs')
	.option('-m, --month <YYYY-MM>', 'Specific month')
	.option('-d, --detailed', 'Show breakdown by model')
	.action(async (options: { month?: string; detailed?: boolean }) => {
		const month = options.month || new Date().toISOString().substring(0, 7);
		const total = await getMonthlyCost(month);

		console.log(`\n${colors.bold}API Costs for ${month}${colors.reset}`);
		console.log('='.repeat(30));
		console.log(`Total: $${total.toFixed(4)}`);

		if (options.detailed) {
			const breakdown = await getCostBreakdown(month);
			const models = Object.keys(breakdown);

			if (models.length > 0) {
				console.log('\nBreakdown by model:');
				for (const [model, cost] of Object.entries(breakdown)) {
					console.log(`  ${model}: $${cost.toFixed(4)}`);
				}
			}
		}

		// Projected cost
		const today = new Date();
		const dayOfMonth = today.getDate();
		const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
		const projected = (total / dayOfMonth) * daysInMonth;

		console.log(`\nProjected monthly: $${projected.toFixed(2)}`);
		console.log('');
	});
