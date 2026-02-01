#!/usr/bin/env bun

/**
 * Yxhyx - Your Personal AI Assistant
 *
 * Main CLI entry point. Coordinates all commands and provides
 * the core interface for interacting with your personal AI.
 */

import { Command } from 'commander';
import { colors } from '../lib/cli/formatting';

import { chat } from '../commands/chat';
import { checkinCommand } from '../commands/checkin';
import { identityCommand } from '../commands/identity';
// Import commands
import { initCommand } from '../commands/init';
import { memoryCommand } from '../commands/memory';
import { newsCommand } from '../commands/news';
import { skillsCommand } from '../commands/skills';
import { verifyCommand } from '../commands/verify';
import { learningManager } from '../lib/memory/learning-manager';
import { executeSkill, skillRouter } from '../lib/skills';

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

// Phase 7: Skills Framework
program.addCommand(skillsCommand);

// Phase 3: Check-ins
program.addCommand(checkinCommand);

// Utility commands
program.addCommand(verifyCommand);

// Chat command
program
	.command('chat [message...]')
	.description('Chat with Yxhyx')
	.option('-m, --model <model>', 'Force specific model')
	.option('-i, --interactive', 'Start interactive session')
	.action(async (message, _options) => {
		if (!message || message.length === 0) {
			console.log(`\n${colors.cyan}Chat with Yxhyx${colors.reset}`);
			console.log('Usage: yxhyx chat "your message"');
			console.log('   or: yxhyx "your message" (shorthand)\n');
			return;
		}
		await chat(message.join(' '));
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

		// Check if a skill matches this input
		try {
			const skillMatch = await skillRouter.route(fullMessage, { minConfidence: 0.6 });
			if (skillMatch) {
				console.log(
					`${colors.dim}Using ${skillMatch.skill.definition.name} skill (${skillMatch.workflow} workflow)${colors.reset}\n`
				);
				const result = await executeSkill(fullMessage);
				if (result.success) {
					console.log(result.output);
					console.log();
					console.log(
						`${colors.dim}---\nSkill: ${result.skill} | Workflow: ${result.workflow} | Model: ${result.model} | Cost: $${result.cost.toFixed(4)}${colors.reset}`
					);
				} else {
					console.error(`${colors.red}Skill error: ${result.error}${colors.reset}`);
					// Fall back to chat
					await chat(fullMessage);
				}
				return;
			}
		} catch {
			// Skill routing failed, fall back to chat
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
