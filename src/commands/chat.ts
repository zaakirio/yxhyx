/**
 * Chat Command - Interactive chat with Yxhyx
 *
 * Supports:
 * - Single message mode: yxhyx chat "Hello"
 * - Interactive mode: yxhyx chat -i
 * - Rating integration: Just type a number (1-10) to rate
 */

import * as readline from 'node:readline';
import { Command } from 'commander';
import { Spinner, colors } from '../lib/cli/formatting';
import { buildEnhancedContext } from '../lib/memory/context-injection';
import { learningManager } from '../lib/memory/learning-manager';
import { workManager } from '../lib/memory/work-manager';
import { modelRouter } from '../lib/model-router';

// ============================================
// Chat Command
// ============================================

export const chatCommand = new Command('chat')
	.description('Chat with Yxhyx')
	.argument('[message...]', 'Message to send')
	.option('-m, --model <model>', 'Force specific model')
	.option('-i, --interactive', 'Start interactive session')
	.option('-v, --verbose', 'Show detailed response metadata')
	.action(
		async (
			message: string[] | undefined,
			options: { model?: string; interactive?: boolean; verbose?: boolean }
		) => {
			if (options.interactive || !message || message.length === 0) {
				await interactiveChat(options);
			} else {
				await singleChat(message.join(' '), options);
			}
		}
	);

// ============================================
// Single Message Chat
// ============================================

/**
 * Handle a single chat message
 */
export async function singleChat(
	message: string,
	options: { model?: string; verbose?: boolean } = {}
): Promise<string | null> {
	// Check for explicit rating
	const rating = learningManager.parseExplicitRating(message);
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
		return null;
	}

	// Build context
	const spinner = new Spinner('Thinking...');
	spinner.start();

	try {
		const context = await buildEnhancedContext(message, 'chat');

		// Create work item
		const workId = await workManager.createWork(message, 'QUICK');

		// Get response
		const startTime = Date.now();
		const response = await modelRouter.complete({
			model: options.model,
			messages: [
				{ role: 'system', content: context },
				{ role: 'user', content: message },
			],
		});
		const duration = (Date.now() - startTime) / 1000;

		spinner.succeed('Done');

		// Display response
		console.log(`\n${response.content}\n`);

		// Show metadata
		if (options.verbose) {
			console.log(
				`${colors.dim}[Model: ${response.model} | Cost: $${response.cost.toFixed(4)} | Time: ${duration.toFixed(1)}s | Tokens: ${response.inputTokens}/${response.outputTokens}]${colors.reset}`
			);
		} else {
			console.log(
				`${colors.dim}[${response.model} | $${response.cost.toFixed(4)} | ${duration.toFixed(1)}s]${colors.reset}`
			);
		}

		// Complete work
		await workManager.completeWork(workId);

		return response.content;
	} catch (error) {
		spinner.fail('Error');
		if (error instanceof Error) {
			console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);

			// Check for missing API keys
			if (error.message.includes('No models available')) {
				console.log('To use chat, set at least one API key:');
				console.log(`  ${colors.cyan}export KIMI_API_KEY=your_key${colors.reset}`);
				console.log(`  ${colors.cyan}export OPENROUTER_API_KEY=your_key${colors.reset}`);
				console.log(`  ${colors.cyan}export ANTHROPIC_API_KEY=your_key${colors.reset}`);
			}
		}
		return null;
	}
}

// ============================================
// Interactive Chat
// ============================================

/**
 * Start an interactive chat session
 */
async function interactiveChat(options: { model?: string; verbose?: boolean }): Promise<void> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log(`\n${colors.cyan}Yxhyx Interactive Mode${colors.reset}`);
	console.log('Type your message, "exit" to quit, or a number (1-10) to rate.\n');

	const conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
	let workId: string | null = null;

	const prompt = (): void => {
		rl.question(`${colors.green}You:${colors.reset} `, async (input) => {
			const trimmed = input.trim();

			// Exit commands
			if (['exit', 'quit', 'bye', '/q'].includes(trimmed.toLowerCase())) {
				console.log('\nGoodbye!\n');
				if (workId) {
					await workManager.completeWork(workId);
				}
				rl.close();
				return;
			}

			// Empty input
			if (trimmed === '') {
				prompt();
				return;
			}

			// Check for rating
			const rating = learningManager.parseExplicitRating(trimmed);
			if (rating) {
				await learningManager.captureRating({
					id: `rating-${Date.now()}`,
					timestamp: new Date().toISOString(),
					rating: rating.rating,
					source: 'explicit',
					comment: rating.comment,
					work_id: workId || undefined,
				});
				console.log(
					`${colors.green}Rated: ${rating.rating}/10${rating.comment ? ` - ${rating.comment}` : ''}${colors.reset}\n`
				);
				prompt();
				return;
			}

			try {
				// Build context for first message
				if (conversationHistory.length === 0) {
					const context = await buildEnhancedContext(trimmed, 'chat');
					conversationHistory.push({ role: 'system', content: context });

					// Create work session
					workId = await workManager.createWork(trimmed, 'STANDARD');
				}

				conversationHistory.push({ role: 'user', content: trimmed });

				const spinner = new Spinner('Thinking...');
				spinner.start();

				const startTime = Date.now();
				const response = await modelRouter.complete({
					model: options.model,
					messages: conversationHistory,
				});
				const duration = (Date.now() - startTime) / 1000;

				spinner.succeed('');

				conversationHistory.push({ role: 'assistant', content: response.content });

				console.log(`\n${colors.cyan}Yxhyx:${colors.reset} ${response.content}`);
				console.log(
					`${colors.dim}[${response.model} | $${response.cost.toFixed(4)} | ${duration.toFixed(1)}s]${colors.reset}\n`
				);
			} catch (error) {
				if (error instanceof Error) {
					console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
				}
			}

			prompt();
		});
	};

	prompt();
}

// ============================================
// Helper for default action
// ============================================

/**
 * Chat helper for use as default action
 */
export async function chat(message: string, options: { model?: string } = {}): Promise<void> {
	await singleChat(message, options);
}
