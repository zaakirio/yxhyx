/**
 * Quick Check-In Mode - Low-friction check-ins for busy days
 *
 * When you don't have time for a full check-in, quick mode captures
 * the essentials with minimal friction.
 */

import inquirer from 'inquirer';
import { colors } from '../cli/formatting';
import { getActiveGoals, loadIdentity } from '../context-loader';
import { recordCheckin } from '../memory/state-manager';
import { modelRouter } from '../model-router';

// ============================================
// Quick Morning Check-In
// ============================================

/**
 * Quick morning check-in
 *
 * Single question: What's your top priority today?
 * Optionally gets an AI tip based on goals
 */
export async function quickMorning(): Promise<void> {
	const identity = await loadIdentity();

	console.log(`\n${colors.cyan}Quick Morning Check-in, ${identity.about.name}${colors.reset}\n`);

	// Single question
	const { priorities } = await inquirer.prompt([
		{
			type: 'input',
			name: 'priorities',
			message: 'Top priority today (or comma-separated list):',
		},
	]);

	const priorityList = priorities
		.split(',')
		.map((p: string) => p.trim())
		.filter((p: string) => p.length > 0);

	// Try to get a quick AI tip if we have a provider
	if (priorityList.length > 0 && modelRouter.hasAvailableProvider()) {
		try {
			const activeGoals = await getActiveGoals();

			const suggestion = await modelRouter.complete({
				model: 'cheapest',
				messages: [
					{
						role: 'user',
						content: `Given these priorities: "${priorities}"
And these active goals: ${activeGoals.map((g) => g.title).join(', ')}

Give one brief tip (1 sentence max) for today.`,
					},
				],
			});

			console.log(`\n${colors.yellow}Tip: ${suggestion.content.trim()}${colors.reset}`);
		} catch {
			// Skip tip if AI call fails
		}
	}

	// Record the check-in
	await recordCheckin('morning', {
		priorities: priorityList,
		quick: true,
	});

	console.log(`\n${colors.green}Quick check-in recorded. Have a great day!${colors.reset}\n`);
}

// ============================================
// Quick Evening Check-In
// ============================================

/**
 * Quick evening check-in
 *
 * Single question: What went well today?
 */
export async function quickEvening(): Promise<void> {
	const identity = await loadIdentity();

	console.log(`\n${colors.cyan}Quick Evening Check-in, ${identity.about.name}${colors.reset}\n`);

	const { wins } = await inquirer.prompt([
		{
			type: 'input',
			name: 'wins',
			message: 'What went well today?',
		},
	]);

	const accomplishments = wins
		.split(',')
		.map((w: string) => w.trim())
		.filter((w: string) => w.length > 0);

	// Record the check-in
	await recordCheckin('evening', {
		accomplishments,
		quick: true,
	});

	console.log(`\n${colors.green}Quick check-in recorded. Rest well!${colors.reset}\n`);
}

// ============================================
// Super Quick Check-In
// ============================================

/**
 * Super quick check-in - minimal interaction
 *
 * Just asks for a 1-10 rating of the day
 */
export async function superQuickCheckin(type: 'morning' | 'evening'): Promise<void> {
	const identity = await loadIdentity();

	console.log(
		`\n${colors.cyan}Super Quick ${type === 'morning' ? 'Morning' : 'Evening'}, ${identity.about.name}${colors.reset}\n`
	);

	const prompt = type === 'morning' ? 'Energy level (1-10):' : 'How was today (1-10)?';

	const { rating } = await inquirer.prompt([
		{
			type: 'input',
			name: 'rating',
			message: prompt,
			validate: (input: string) => {
				const num = Number.parseInt(input, 10);
				if (Number.isNaN(num) || num < 1 || num > 10) {
					return 'Please enter a number between 1 and 10';
				}
				return true;
			},
		},
	]);

	const emoji = Number.parseInt(rating, 10) >= 7 ? '' : Number.parseInt(rating, 10) >= 4 ? '' : '';

	await recordCheckin(type, {
		quick: true,
		responses: { rating },
	});

	console.log(`\n${emoji} Recorded. ${type === 'morning' ? 'Go get it!' : 'Rest up!'}\n`);
}
