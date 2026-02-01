#!/usr/bin/env bun

/**
 * Yxhyx - Your Personal AI Assistant
 *
 * Main CLI entry point. Coordinates all commands and provides
 * the core interface for interacting with your personal AI.
 */

import { Command } from 'commander';
import { colors } from '../lib/cli/formatting';

import { chat, chatCommand } from '../commands/chat';
import { checkinCommand } from '../commands/checkin';
import { identityCommand } from '../commands/identity';
// Import commands
import { initCommand } from '../commands/init';
import { memoryCommand } from '../commands/memory';
import { newsCommand } from '../commands/news';
import { statusCommand } from '../commands/status';
import { learningManager } from '../lib/memory/learning-manager';

const program = new Command();

program
	.name('yxhyx')
	.description(
		'Your personal AI assistant - knows you deeply, keeps you accountable, curates your world'
	)
	.version('0.1.0');

// ============================================
// Register Commands
// ============================================

// Phase 1: Foundation
program.addCommand(initCommand);
program.addCommand(identityCommand);

// Phase 2: Memory
program.addCommand(memoryCommand);

// Phase 4: Research & News
program.addCommand(newsCommand);

// Placeholder commands for Phase 3 (coming soon)
program
	.command('chat [message...]')
	.description('Chat with Yxhyx')
	.option('-m, --model <model>', 'Force specific model')
	.option('-i, --interactive', 'Start interactive session')
	.action((message, _options) => {
		if (!message || message.length === 0) {
			console.log(`${colors.yellow}Chat functionality coming in Phase 3.${colors.reset}`);
			console.log('For now, try:');
			console.log(`  ${colors.cyan}yxhyx init${colors.reset} - Initialize Yxhyx`);
			console.log(`  ${colors.cyan}yxhyx identity show${colors.reset} - View your identity`);
			console.log(`  ${colors.cyan}yxhyx news${colors.reset} - Get personalized news`);
			return;
		}
		console.log(
			`${colors.yellow}Chat with AI coming soon. Your message: "${message.join(' ')}"${colors.reset}`
		);
	});

program
	.command('checkin [type]')
	.description('Accountability check-ins (morning/evening/weekly)')
	.option('-q, --quick', 'Quick check-in mode')
	.action((_type, _options) => {
		console.log(`${colors.yellow}Check-in functionality coming in Phase 3.${colors.reset}`);
	});

// Phase 4: News & Research (Coming Soon)
program
	.command('status')
	.description('Quick status overview')
	.action(async () => {
		try {
			const { loadIdentity, getActiveGoals, getActiveProjects } = await import(
				'../lib/context-loader'
			);
			const { workManager } = await import('../lib/memory/work-manager');
			const { learningManager } = await import('../lib/memory/learning-manager');
			const { stateManager } = await import('../lib/memory/state-manager');

			const identity = await loadIdentity();
			const activeGoals = await getActiveGoals();
			const activeProjects = await getActiveProjects();
			const currentWork = await workManager.getCurrentWork();
			const ratingStats = await learningManager.getRatingStats(7);
			const monthlyCost = await stateManager.getMonthlyCost();
			const lastCheckin = await stateManager.getLastCheckin();

			console.log(`
${colors.bold}═════════════════════════════════════════${colors.reset}
${colors.bold}  YXHYX STATUS - ${identity.about.name}${colors.reset}
${colors.bold}═════════════════════════════════════════${colors.reset}

${colors.cyan}📋 GOALS${colors.reset}
  Active: ${activeGoals.length}
${activeGoals
	.slice(0, 3)
	.map((g) => `  • ${g.title} (${Math.round(g.progress * 100)}%)`)
	.join('\n')}
${activeGoals.length > 3 ? `  ... and ${activeGoals.length - 3} more` : ''}

${colors.cyan}🚀 PROJECTS${colors.reset}
  Active: ${activeProjects.length}
${activeProjects.map((p) => `  • ${p.name}`).join('\n') || '  None'}

${colors.cyan}🧠 MEMORY (7 days)${colors.reset}
  Ratings: ${ratingStats.total} (avg: ${ratingStats.average.toFixed(1)}/10)
  Current work: ${currentWork ? `${currentWork.id.substring(0, 30)}...` : 'None'}

${colors.cyan}💰 COSTS${colors.reset}
  This month: $${monthlyCost.toFixed(4)}

${colors.cyan}✅ CHECK-INS${colors.reset}
  Last: ${lastCheckin ? `${lastCheckin.type} (${new Date(lastCheckin.timestamp).toLocaleDateString()})` : 'None'}

${colors.dim}─────────────────────────────────────────${colors.reset}
${colors.dim}Last updated: ${new Date(identity.last_updated).toLocaleString()}${colors.reset}
`);
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

// Cost command - quick access to cost tracking
program
	.command('cost')
	.description('View API costs')
	.option('-m, --month <YYYY-MM>', 'Specific month')
	.option('-d, --detailed', 'Show breakdown by model')
	.action(async (options) => {
		// Delegate to memory cost subcommand
		const { getMonthlyCost, getCostBreakdown, getProjectedMonthlyCost } = await import(
			'../lib/memory/state-manager'
		);

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
					console.log(`  ${model}: $${(cost as number).toFixed(4)}`);
				}
			}
		}

		const projected = await getProjectedMonthlyCost();
		console.log(`\nProjected monthly: $${projected.toFixed(2)}`);
		console.log('');
	});

// ============================================
// Default Action - Chat or Help
// ============================================

program.arguments('[message...]').action(async (message: string[] | undefined) => {
	if (message && message.length > 0) {
		const fullMessage = message.join(' ');

		// Check if it's a rating
		const rating = learningManager.parseExplicitRating(fullMessage);
		if (rating) {
			await learningManager.captureRating({
				id: `rating-${Date.now()}`,
				timestamp: new Date().toISOString(),
				rating: rating.rating,
				source: 'explicit',
				comment: rating.comment,
			});
			console.log(
				`\n${colors.green}Rated: ${rating.rating}/10${rating.comment ? ` - ${rating.comment}` : ''}${colors.reset}\n`
			);
			return;
		}

		// Otherwise, treat as chat message
		await chat(fullMessage);
	} else {
		program.help();
	}
});

// ============================================
// Error Handling
// ============================================

program.configureOutput({
	writeErr: (str) => {
		// Remove 'error: ' prefix and colorize
		const message = str.replace(/^error:\s*/i, '');
		process.stderr.write(`${colors.red}Error: ${message}${colors.reset}`);
	},
});

// ============================================
// Parse and Execute
// ============================================

program.parse();
