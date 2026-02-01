#!/usr/bin/env bun

/**
 * Yxhyx - Your Personal AI Assistant
 *
 * Main CLI entry point. Coordinates all commands and provides
 * the core interface for interacting with your personal AI.
 */

import { Command } from 'commander';
import { identityCommand } from '../commands/identity';
import { initCommand } from '../commands/init';
import { memoryCommand } from '../commands/memory';
import { colors } from '../lib/cli/formatting';

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

program.addCommand(initCommand);
program.addCommand(identityCommand);
program.addCommand(memoryCommand);

// Placeholder commands for Phase 3+
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

program
	.command('news')
	.description('Personalized news digest')
	.option('-c, --category <name>', 'Specific category')
	.action((_options) => {
		console.log(`${colors.yellow}News functionality coming in Phase 4.${colors.reset}`);
	});

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

program
	.command('cost')
	.description('View API costs')
	.option('-m, --month <YYYY-MM>', 'Specific month')
	.option('-d, --detailed', 'Show breakdown by model')
	.action(async (options) => {
		try {
			const { readFile } = await import('node:fs/promises');
			const { existsSync } = await import('node:fs');
			const costPath = `${process.env.HOME}/.yxhyx/memory/state/cost-tracking.json`;

			if (!existsSync(costPath)) {
				console.log(
					`\n${colors.yellow}No cost data yet. Costs are tracked when you use AI features.${colors.reset}\n`
				);
				return;
			}

			const content = await readFile(costPath, 'utf-8');
			const tracking = JSON.parse(content) as Record<string, number>;

			const month = options.month || new Date().toISOString().substring(0, 7);
			const total = tracking[`${month}:total`] || 0;

			console.log(`\n${colors.bold}API Costs for ${month}${colors.reset}`);
			console.log('═'.repeat(30));
			console.log(`Total: $${total.toFixed(4)}`);

			if (options.detailed) {
				console.log('\nBreakdown by model:');
				for (const [key, cost] of Object.entries(tracking)) {
					if (key.startsWith(month) && !key.includes(':total')) {
						const model = key.split(':')[1];
						console.log(`  ${model}: $${cost.toFixed(4)}`);
					}
				}
			}

			// Projected
			const today = new Date();
			const dayOfMonth = today.getDate();
			const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
			const projected = (total / dayOfMonth) * daysInMonth;

			console.log(`\nProjected monthly: $${projected.toFixed(2)}`);
			console.log('');
		} catch (err) {
			console.error(
				`${colors.red}Error: ${err instanceof Error ? err.message : err}${colors.reset}`
			);
		}
	});

// ============================================
// Default Action - Show Help or Chat
// ============================================

program.arguments('[message...]').action(async (message) => {
	if (message && message.length > 0) {
		// Future: Treat as chat message
		console.log(`${colors.yellow}Chat functionality coming soon.${colors.reset}`);
		console.log(`Your message: "${message.join(' ')}"`);
	} else {
		program.help();
	}
});

// ============================================
// Parse and Execute
// ============================================

program.parse();
