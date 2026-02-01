/**
 * Memory Commands - CLI interface for memory system
 *
 * Commands:
 * - memory learnings - View captured learnings
 * - memory patterns - View synthesized patterns
 * - memory work - View work history
 * - memory rate <rating> - Rate last interaction
 * - memory add <type> - Add a manual learning
 */

import { Command } from 'commander';
import { colors } from '../lib/cli/formatting';
import { learningManager } from '../lib/memory/learning-manager';
import { stateManager } from '../lib/memory/state-manager';
import { workManager } from '../lib/memory/work-manager';

export const memoryCommand = new Command('memory').description('View and manage memory system');

// ============================================
// memory learnings
// ============================================

memoryCommand
	.command('learnings')
	.description('View captured learnings')
	.option('-n, --limit <count>', 'Number to show', '10')
	.option('-t, --type <type>', 'Filter by type: failure, success, insight')
	.option('--markdown', 'Output as markdown')
	.action(async (options) => {
		try {
			const limit = Number.parseInt(options.limit, 10);
			let learnings = await learningManager.getAllLearnings();

			// Filter by type if specified
			if (options.type) {
				learnings = learnings.filter((l) => l.type === options.type);
			}

			learnings = learnings.slice(0, limit);

			if (learnings.length === 0) {
				console.log(`\n${colors.yellow}No learnings captured yet.${colors.reset}`);
				console.log('Learnings are automatically created from:');
				console.log('  - Low ratings (1-5) -> failure learnings');
				console.log('  - High ratings (8-10) -> success learnings');
				console.log(`\nTry: ${colors.cyan}yxhyx memory rate 8 - great response${colors.reset}`);
				return;
			}

			if (options.markdown) {
				console.log(learningManager.formatLearningsAsMarkdown(learnings));
				return;
			}

			console.log(`\n${colors.bold}Recent Learnings${colors.reset}`);
			console.log('═'.repeat(50));

			for (const learning of learnings) {
				const typeColor =
					learning.type === 'failure'
						? colors.red
						: learning.type === 'success'
							? colors.green
							: colors.cyan;
				const typeLabel = `[${learning.type.toUpperCase()}]`;

				console.log(`\n${typeColor}${typeLabel}${colors.reset} ${learning.situation}`);
				console.log(`${colors.dim}Lesson:${colors.reset} ${learning.lesson}`);

				if (learning.what_went_wrong) {
					console.log(`${colors.dim}What went wrong:${colors.reset} ${learning.what_went_wrong}`);
				}
				if (learning.what_went_right) {
					console.log(`${colors.dim}What went right:${colors.reset} ${learning.what_went_right}`);
				}

				const date = new Date(learning.timestamp).toLocaleDateString();
				console.log(`${colors.dim}Captured: ${date}${colors.reset}`);
			}

			console.log('');
		} catch (err) {
			console.error(
				`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
			);
		}
	});

// ============================================
// memory patterns
// ============================================

memoryCommand
	.command('patterns')
	.description('View synthesized patterns and statistics')
	.option('-d, --days <count>', 'Analysis period in days', '7')
	.option('--markdown', 'Output as markdown')
	.action(async (options) => {
		try {
			const days = Number.parseInt(options.days, 10);

			console.log(`\n${colors.dim}Analyzing last ${days} days...${colors.reset}\n`);

			const synthesis = await learningManager.synthesizePatterns(days);

			if (options.markdown) {
				console.log(learningManager.formatSynthesisAsMarkdown(synthesis));
				return;
			}

			console.log(`${colors.bold}Pattern Synthesis${colors.reset}`);
			console.log('═'.repeat(50));

			console.log(`\n${colors.cyan}Statistics${colors.reset}`);
			console.log(`  Total interactions: ${synthesis.total_interactions}`);
			console.log(`  Average rating: ${synthesis.average_rating.toFixed(1)}/10`);

			// Rating distribution
			const highRatings = Object.entries(synthesis.rating_distribution)
				.filter(([r]) => Number.parseInt(r) >= 8)
				.reduce((sum, [, count]) => sum + count, 0);
			const lowRatings = Object.entries(synthesis.rating_distribution)
				.filter(([r]) => Number.parseInt(r) <= 5)
				.reduce((sum, [, count]) => sum + count, 0);

			console.log(`  High satisfaction (8+): ${colors.green}${highRatings}${colors.reset}`);
			console.log(`  Low satisfaction (1-5): ${colors.red}${lowRatings}${colors.reset}`);

			if (synthesis.common_failures.length > 0) {
				console.log(`\n${colors.red}Failures to Avoid${colors.reset}`);
				for (const failure of synthesis.common_failures) {
					console.log(`  - ${failure}`);
				}
			}

			if (synthesis.common_successes.length > 0) {
				console.log(`\n${colors.green}Successes to Replicate${colors.reset}`);
				for (const success of synthesis.common_successes) {
					console.log(`  - ${success}`);
				}
			}

			if (synthesis.recurring_themes.length > 0) {
				console.log(`\n${colors.cyan}Recurring Themes${colors.reset}`);
				console.log(`  ${synthesis.recurring_themes.join(', ')}`);
			}

			if (synthesis.action_items.length > 0) {
				console.log(`\n${colors.yellow}Recommended Actions${colors.reset}`);
				for (const item of synthesis.action_items) {
					console.log(`  [ ] ${item}`);
				}
			}

			console.log('');
		} catch (err) {
			console.error(
				`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
			);
		}
	});

// ============================================
// memory work
// ============================================

memoryCommand
	.command('work')
	.description('View work history')
	.option('-n, --limit <count>', 'Number to show', '10')
	.option('-s, --status <status>', 'Filter by status: active, completed, abandoned')
	.action(async (options) => {
		try {
			const limit = Number.parseInt(options.limit, 10);

			// Get current work
			const currentWork = await workManager.getCurrentWork();

			console.log(`\n${colors.bold}Work History${colors.reset}`);
			console.log('═'.repeat(50));

			if (currentWork) {
				console.log(`\n${colors.green}Current Work${colors.reset}`);
				console.log(`  ID: ${currentWork.id}`);
				console.log(`  Effort: ${currentWork.effort}`);
				console.log(`  Items: ${currentWork.item_count}`);
				console.log(`  Started: ${new Date(currentWork.started).toLocaleString()}`);
			}

			// Get recent work
			let recentWork = await workManager.listRecentWork(limit);

			if (options.status && options.status !== 'active') {
				const statusWork = await workManager.getWorkByStatus(options.status);
				recentWork = statusWork.slice(0, limit).map((meta) => ({
					id: meta.id,
					effort: meta.effort,
					meta,
				}));
			}

			if (recentWork.length > 0) {
				console.log(`\n${colors.cyan}Recent Work${colors.reset}`);

				for (const work of recentWork) {
					const statusColor =
						work.meta?.status === 'completed'
							? colors.green
							: work.meta?.status === 'abandoned'
								? colors.red
								: colors.yellow;
					const status = work.meta?.status || 'active';

					console.log(`\n  ${colors.bold}${work.id}${colors.reset}`);
					console.log(`    Effort: ${work.effort}`);
					console.log(`    Status: ${statusColor}${status}${colors.reset}`);

					if (work.meta) {
						console.log(`    Items: ${work.meta.total_items}`);
						if (work.meta.total_cost_usd > 0) {
							console.log(`    Cost: $${work.meta.total_cost_usd.toFixed(4)}`);
						}
						if (work.meta.average_rating) {
							console.log(`    Rating: ${work.meta.average_rating}/10`);
						}
					}
				}
			} else {
				console.log(`\n${colors.dim}No work history yet.${colors.reset}`);
			}

			console.log('');
		} catch (err) {
			console.error(
				`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
			);
		}
	});

// ============================================
// memory rate
// ============================================

memoryCommand
	.command('rate <rating>')
	.description('Rate the last interaction (1-10)')
	.option('-c, --comment <text>', 'Optional comment')
	.action(async (ratingStr, options) => {
		try {
			const rating = Number.parseInt(ratingStr, 10);

			if (Number.isNaN(rating) || rating < 1 || rating > 10) {
				console.error(`${colors.red}Rating must be between 1 and 10${colors.reset}`);
				return;
			}

			// Get current work context if available
			const currentWork = await workManager.getCurrentWork();

			const capturedRating = await learningManager.captureExplicitRating(
				options.comment ? `${rating} - ${options.comment}` : String(rating),
				{
					work_id: currentWork?.id,
					prompt_snippet: 'Manual rating from CLI',
				}
			);

			if (capturedRating) {
				const ratingColor = rating >= 8 ? colors.green : rating <= 5 ? colors.red : colors.yellow;
				console.log(`\n${ratingColor}Rated: ${rating}/10${colors.reset}`);

				if (options.comment) {
					console.log(`Comment: ${options.comment}`);
				}

				if (rating <= 5) {
					console.log(
						`${colors.dim}A failure learning was captured to help improve.${colors.reset}`
					);
				} else if (rating >= 8) {
					console.log(`${colors.dim}A success learning was captured to replicate.${colors.reset}`);
				}
			}

			console.log('');
		} catch (err) {
			console.error(
				`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
			);
		}
	});

// ============================================
// memory add
// ============================================

memoryCommand
	.command('add <type>')
	.description('Add a manual learning (failure, success, insight)')
	.option('-s, --situation <text>', 'What happened (required)')
	.option('-l, --lesson <text>', 'What to learn (required)')
	.option('-a, --action <items>', 'Action items (comma-separated)')
	.option('-t, --tags <tags>', 'Tags (comma-separated)')
	.action(async (type, options) => {
		try {
			if (!['failure', 'success', 'insight'].includes(type)) {
				console.error(`${colors.red}Type must be: failure, success, or insight${colors.reset}`);
				return;
			}

			if (!options.situation || !options.lesson) {
				console.error(`${colors.red}Both --situation and --lesson are required${colors.reset}`);
				console.log('\nExample:');
				console.log(
					`  ${colors.cyan}yxhyx memory add success -s "Explained complex topic simply" -l "Use analogies for complex concepts"${colors.reset}`
				);
				return;
			}

			const actionItems = options.action
				? options.action.split(',').map((a: string) => a.trim())
				: [];
			const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];

			const learning = await learningManager.addLearning(
				type as 'failure' | 'success' | 'insight',
				options.situation,
				options.lesson,
				{
					action_items: actionItems,
					tags: ['manual', ...tags],
					what_went_wrong: type === 'failure' ? options.situation : undefined,
					what_went_right: type === 'success' ? options.situation : undefined,
				}
			);

			const typeColor =
				type === 'failure' ? colors.red : type === 'success' ? colors.green : colors.cyan;

			console.log(`\n${typeColor}Learning added: ${type.toUpperCase()}${colors.reset}`);
			console.log(`Situation: ${learning.situation}`);
			console.log(`Lesson: ${learning.lesson}`);

			if (actionItems.length > 0) {
				console.log(`Action items: ${actionItems.join(', ')}`);
			}

			console.log('');
		} catch (err) {
			console.error(
				`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
			);
		}
	});

// ============================================
// memory stats
// ============================================

memoryCommand
	.command('stats')
	.description('View memory system statistics')
	.action(async () => {
		try {
			console.log(`\n${colors.bold}Memory System Statistics${colors.reset}`);
			console.log('═'.repeat(50));

			// Ratings stats
			const ratingStats = await learningManager.getRatingStats(30);
			console.log(`\n${colors.cyan}Ratings (Last 30 days)${colors.reset}`);
			console.log(`  Total ratings: ${ratingStats.total}`);
			console.log(`  Average rating: ${ratingStats.average.toFixed(1)}/10`);
			console.log(`  Explicit: ${ratingStats.bySource.explicit}`);
			console.log(`  Implicit: ${ratingStats.bySource.implicit}`);

			// Learnings stats
			const allLearnings = await learningManager.getAllLearnings();
			const failures = allLearnings.filter((l) => l.type === 'failure').length;
			const successes = allLearnings.filter((l) => l.type === 'success').length;
			const insights = allLearnings.filter((l) => l.type === 'insight').length;

			console.log(`\n${colors.cyan}Learnings${colors.reset}`);
			console.log(`  Total: ${allLearnings.length}`);
			console.log(`  Failures: ${colors.red}${failures}${colors.reset}`);
			console.log(`  Successes: ${colors.green}${successes}${colors.reset}`);
			console.log(`  Insights: ${colors.cyan}${insights}${colors.reset}`);

			// Work stats
			const recentWork = await workManager.listRecentWork(100);
			const activeWork = recentWork.filter((w) => w.meta?.status === 'active').length;
			const completedWork = recentWork.filter((w) => w.meta?.status === 'completed').length;

			console.log(`\n${colors.cyan}Work${colors.reset}`);
			console.log(`  Recent: ${recentWork.length}`);
			console.log(`  Active: ${activeWork}`);
			console.log(`  Completed: ${completedWork}`);

			// Cost stats
			const monthlyCost = await stateManager.getMonthlyCost();
			const projectedCost = await stateManager.getProjectedMonthlyCost();
			const totalCost = await stateManager.getTotalCost();

			console.log(`\n${colors.cyan}Costs${colors.reset}`);
			console.log(`  This month: $${monthlyCost.toFixed(4)}`);
			console.log(`  Projected: $${projectedCost.toFixed(2)}`);
			console.log(`  All time: $${totalCost.toFixed(4)}`);

			// Check-in stats
			const checkins = await stateManager.getCheckinHistory(30);
			const morningCheckins = checkins.filter((c) => c.type === 'morning').length;
			const eveningCheckins = checkins.filter((c) => c.type === 'evening').length;
			const weeklyCheckins = checkins.filter((c) => c.type === 'weekly').length;

			console.log(`\n${colors.cyan}Check-ins (Last 30)${colors.reset}`);
			console.log(`  Morning: ${morningCheckins}`);
			console.log(`  Evening: ${eveningCheckins}`);
			console.log(`  Weekly: ${weeklyCheckins}`);

			console.log('');
		} catch (err) {
			console.error(
				`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
			);
		}
	});
