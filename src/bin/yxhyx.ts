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

// Phase 3: Core Skills
program.addCommand(chatCommand);
program.addCommand(checkinCommand);
program.addCommand(statusCommand);
program.addCommand(memoryCommand);

// Phase 4: News & Research (Coming Soon)
program
	.command('news')
	.description('Personalized news digest')
	.option('-c, --category <name>', 'Specific category')
	.action(async (_options) => {
		console.log(`${colors.yellow}News functionality coming in Phase 4.${colors.reset}`);
		console.log('This will include:');
		console.log('  - RSS feed aggregation');
		console.log('  - AI-powered news digest');
		console.log('  - Goal-relevant article matching');
	});

program
	.command('research <query>')
	.description('Research a topic')
	.option('-d, --deep', 'Use multi-model deep research')
	.action(async (query, _options) => {
		console.log(`${colors.yellow}Research functionality coming in Phase 4.${colors.reset}`);
		console.log(`Your query: "${query}"`);
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
