/**
 * Status Command - Quick overview of your Yxhyx state
 *
 * Shows:
 * - Check-in status for today
 * - Active goals and progress
 * - Active projects
 * - Current work session (if any)
 * - Monthly cost summary
 */

import { Command } from 'commander';
import { colors, progressBar } from '../lib/cli/formatting';
import { getActiveGoals, getActiveProjects, loadIdentity } from '../lib/context-loader';
import { getCheckinHistory, getCheckinStreak, getMonthlyCost } from '../lib/memory/state-manager';
import { workManager } from '../lib/memory/work-manager';

// ============================================
// Status Command
// ============================================

export const statusCommand = new Command('status')
	.description('Quick status overview')
	.option('-v, --verbose', 'Show more details')
	.action(async (options: { verbose?: boolean }) => {
		try {
			const identity = await loadIdentity();
			const activeGoals = await getActiveGoals();
			const activeProjects = await getActiveProjects();
			const currentWork = await workManager.getCurrentWork();
			const monthlyCost = await getMonthlyCost();
			const recentCheckins = await getCheckinHistory(7);
			const streak = await getCheckinStreak();

			// Check today's check-ins
			const today = new Date().toISOString().split('T')[0];
			const hasTodayMorning = recentCheckins.some(
				(c) => c.type === 'morning' && c.timestamp.startsWith(today)
			);
			const hasTodayEvening = recentCheckins.some(
				(c) => c.type === 'evening' && c.timestamp.startsWith(today)
			);

			// Header
			console.log(`
${colors.bold}${'='.repeat(45)}${colors.reset}
${colors.bold}  YXHYX STATUS - ${identity.about.name}${colors.reset}
${colors.bold}${'='.repeat(45)}${colors.reset}
`);

			// Check-ins
			console.log(`${colors.cyan}CHECK-INS${colors.reset}`);
			console.log(
				`  Morning: ${hasTodayMorning ? `${colors.green}Done${colors.reset}` : `${colors.yellow}Pending${colors.reset}`}`
			);
			console.log(
				`  Evening: ${hasTodayEvening ? `${colors.green}Done${colors.reset}` : `${colors.yellow}Pending${colors.reset}`}`
			);
			console.log(`  Streak: ${streak.morning}d morning / ${streak.evening}d evening`);

			// Goals
			console.log(`\n${colors.cyan}ACTIVE GOALS (${activeGoals.length})${colors.reset}`);
			if (activeGoals.length > 0) {
				const goalsToShow = options.verbose ? activeGoals : activeGoals.slice(0, 5);
				for (const goal of goalsToShow) {
					console.log(`  ${progressBar(goal.progress, 15)} ${goal.title}`);
				}
				if (!options.verbose && activeGoals.length > 5) {
					console.log(`  ${colors.dim}... and ${activeGoals.length - 5} more${colors.reset}`);
				}
			} else {
				console.log(`  ${colors.dim}No active goals${colors.reset}`);
			}

			// Projects
			console.log(`\n${colors.cyan}ACTIVE PROJECTS (${activeProjects.length})${colors.reset}`);
			if (activeProjects.length > 0) {
				for (const project of activeProjects) {
					console.log(`  - ${project.name}`);
				}
			} else {
				console.log(`  ${colors.dim}No active projects${colors.reset}`);
			}

			// Current work
			if (currentWork) {
				console.log(`\n${colors.cyan}CURRENT WORK${colors.reset}`);
				console.log(`  ${currentWork.id}`);
				console.log(
					`  ${colors.dim}Started: ${new Date(currentWork.started).toLocaleTimeString()}${colors.reset}`
				);
			}

			// Lessons
			if (options.verbose) {
				const recentLessons = identity.learned.slice(-3);
				if (recentLessons.length > 0) {
					console.log(`\n${colors.cyan}RECENT LESSONS${colors.reset}`);
					for (const lesson of recentLessons) {
						console.log(`  - ${lesson.lesson}`);
					}
				}
			}

			// Cost
			console.log(`\n${colors.cyan}MONTHLY COST${colors.reset}`);
			console.log(`  $${monthlyCost.toFixed(4)}`);

			// Footer
			console.log(`
${colors.dim}${'='.repeat(45)}${colors.reset}
${colors.dim}Last updated: ${new Date(identity.last_updated).toLocaleString()}${colors.reset}
`);

			// Suggestions
			if (!hasTodayMorning && new Date().getHours() < 12) {
				console.log(
					`${colors.yellow}Tip: Start your day with a check-in: yxhyx checkin${colors.reset}\n`
				);
			} else if (!hasTodayEvening && new Date().getHours() >= 17) {
				console.log(
					`${colors.yellow}Tip: End your day with a check-in: yxhyx checkin evening${colors.reset}\n`
				);
			}
		} catch (err) {
			if (err instanceof Error && err.message.includes('not initialized')) {
				console.log(`\n${colors.yellow}Yxhyx not initialized. Run: yxhyx init${colors.reset}\n`);
			} else {
				console.error(
					`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
				);
			}
		}
	});
