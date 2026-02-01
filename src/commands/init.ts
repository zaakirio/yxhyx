/**
 * Init Command - Initialize Yxhyx for first-time use
 *
 * Creates the necessary directory structure, gathers initial identity info,
 * and sets up configuration files.
 */

import { exec } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { stringify } from 'yaml';
import { bold, colors, info, success, warning } from '../lib/cli/formatting';
import { getIdentityPath, getYxhyxDir, isInitialized, saveIdentity } from '../lib/context-loader';
import { stateManager } from '../lib/memory/state-manager';
import { DEFAULT_ROUTING_CONFIG } from '../lib/model-router';
import { createDefaultIdentity } from '../lib/schemas/identity';
import { generateViews } from '../lib/view-generator';

const execAsync = promisify(exec);

export const initCommand = new Command('init')
	.description('Initialize Yxhyx - your personal AI assistant')
	.option('-f, --force', 'Reinitialize even if already initialized')
	.action(async (options) => {
		try {
			// Check if already initialized
			if (await isInitialized()) {
				if (!options.force) {
					console.log(warning('\nYxhyx is already initialized. Use --force to reinitialize.\n'));
					console.log(`Identity: ${getIdentityPath()}`);
					return;
				}
				console.log(warning('\nReinitializing Yxhyx...\n'));
			}

			console.log(bold('\n Welcome to Yxhyx - Your Personal AI Assistant\n'));
			console.log("Let's set up your personal context. This will take about 2-3 minutes.\n");

			// Define directories
			const yxhyxDir = getYxhyxDir();
			const dirs = [
				`${yxhyxDir}/identity/views`,
				`${yxhyxDir}/config`,
				`${yxhyxDir}/memory/work`,
				`${yxhyxDir}/memory/learning/signals`,
				`${yxhyxDir}/memory/learning/patterns`,
				`${yxhyxDir}/memory/learning/positive`,
				`${yxhyxDir}/memory/learning/synthesis`,
				`${yxhyxDir}/memory/state`,
				`${yxhyxDir}/skills`,
			];

			// Create directories
			for (const dir of dirs) {
				await mkdir(dir, { recursive: true });
			}

			// Gather user information
			const answers = await inquirer.prompt([
				{
					type: 'input',
					name: 'name',
					message: 'What is your name?',
					validate: (input) => input.trim().length > 0 || 'Name is required',
				},
				{
					type: 'input',
					name: 'timezone',
					message: 'What is your timezone?',
					default: Intl.DateTimeFormat().resolvedOptions().timeZone,
				},
				{
					type: 'input',
					name: 'location',
					message: 'Where are you located? (optional)',
				},
				{
					type: 'editor',
					name: 'background',
					message: 'Brief description of who you are and what you do (opens editor):',
				},
				{
					type: 'editor',
					name: 'mission',
					message: 'What is your life mission or purpose? (opens editor):',
				},
				{
					type: 'checkbox',
					name: 'interests',
					message: 'Select your main interests (for content curation):',
					choices: [
						'AI/ML',
						'Security',
						'Web Development',
						'Mobile Development',
						'DevOps/Cloud',
						'Data Science',
						'Startups',
						'Finance/Investing',
						'Health/Fitness',
						'Productivity',
						'Philosophy',
						'Science',
						'Design/UX',
						'Gaming',
					],
				},
				{
					type: 'list',
					name: 'communicationStyle',
					message: 'How do you prefer AI responses?',
					choices: [
						{ name: 'Direct - Get to the point', value: 'direct' },
						{ name: 'Diplomatic - Balanced and considerate', value: 'diplomatic' },
						{ name: 'Socratic - Guide me with questions', value: 'socratic' },
					],
					default: 'direct',
				},
				{
					type: 'list',
					name: 'communicationLength',
					message: 'Preferred response length?',
					choices: [
						{ name: 'Concise - Brief and to the point', value: 'concise' },
						{ name: 'Detailed - Comprehensive explanations', value: 'detailed' },
						{ name: 'Adaptive - Depends on the question', value: 'adaptive' },
					],
					default: 'concise',
				},
			]);

			// Create identity
			const identity = createDefaultIdentity(answers.name.trim(), answers.timezone);

			// Update with user answers
			identity.about.location = answers.location.trim() || undefined;
			identity.about.background = answers.background?.trim() || '';
			identity.mission = answers.mission?.trim() || '';

			// Set communication preferences
			identity.preferences.communication.style = answers.communicationStyle as
				| 'direct'
				| 'diplomatic'
				| 'socratic';
			identity.preferences.communication.length = answers.communicationLength as
				| 'concise'
				| 'detailed'
				| 'adaptive';

			// Distribute interests by priority (first 3 high, next 3 medium, rest low)
			const interests = answers.interests as string[];
			identity.interests.high_priority = interests
				.slice(0, 3)
				.map((topic) => ({ topic, subtopics: [] }));
			identity.interests.medium_priority = interests
				.slice(3, 6)
				.map((topic) => ({ topic, subtopics: [] }));
			identity.interests.low_priority = interests
				.slice(6)
				.map((topic) => ({ topic, subtopics: [] }));

			// Save identity
			await saveIdentity(identity);

			// Initialize git in identity directory
			const identityDir = `${yxhyxDir}/identity`;
			try {
				await execAsync('git init', { cwd: identityDir });
				await execAsync('git add identity.yaml', { cwd: identityDir });
				await execAsync('git commit -m "Initial identity"', { cwd: identityDir });
				console.log(info('\n Git initialized for identity versioning'));
			} catch {
				console.log(warning('\n Could not initialize git (optional for versioning)'));
			}

			// Generate views
			await generateViews();
			console.log(info(' Markdown views generated'));

			// Initialize state manager
			await stateManager.initialize();
			console.log(info(' State manager initialized'));

			// Create ratings file
			await writeFile(`${yxhyxDir}/memory/learning/signals/ratings.jsonl`, '');

			// Create cost tracking file
			await writeFile(`${yxhyxDir}/memory/state/cost-tracking.json`, '{}');

			// Create models config
			await writeFile(`${yxhyxDir}/config/models.yaml`, stringify(DEFAULT_ROUTING_CONFIG));

			// Create feeds config
			await writeFile(
				`${yxhyxDir}/config/feeds.yaml`,
				stringify({
					feeds: {
						tech_ai: [
							{
								name: 'Hacker News',
								url: 'https://hnrss.org/frontpage',
								type: 'aggregator',
								priority: 'high',
							},
							{ name: 'TLDR', url: 'https://tldr.tech/feed', type: 'newsletter', priority: 'high' },
						],
						security: [
							{
								name: 'tl;dr sec',
								url: 'https://tldrsec.com/feed.xml',
								type: 'newsletter',
								priority: 'high',
							},
							{
								name: 'Krebs on Security',
								url: 'https://krebsonsecurity.com/feed/',
								type: 'investigative',
								priority: 'high',
							},
						],
						custom: [],
					},
					settings: {
						max_items_per_feed: 20,
						max_age_hours: 48,
						dedup_threshold: 0.8,
					},
				})
			);

			// Create .env template
			await writeFile(
				`${yxhyxDir}/.env.example`,
				`# Yxhyx API Keys
# At least one is required for AI functionality

# Kimi (Moonshot) - Cheapest for simple tasks
KIMI_API_KEY=your_kimi_api_key_here

# OpenRouter - Access to many models
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Anthropic - For complex/critical tasks
ANTHROPIC_API_KEY=your_anthropic_api_key_here
`
			);

			// Print success message
			console.log(success('\n Yxhyx initialized successfully!\n'));
			console.log(`${bold('Your identity is stored at:')} ${getIdentityPath()}`);
			console.log(`${bold('Configuration:')} ${yxhyxDir}/config/`);
			console.log(`${bold('Memory:')} ${yxhyxDir}/memory/\n`);

			console.log(bold('Next steps:'));
			console.log(`  1. Set up API keys in ${yxhyxDir}/.env or as environment variables`);
			console.log(
				'     At minimum, set one of: KIMI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY\n'
			);
			console.log('  2. Start using Yxhyx:');
			console.log(`     ${colors.cyan}yxhyx chat "Hello!"${colors.reset}     - Start chatting`);
			console.log(`     ${colors.cyan}yxhyx identity show${colors.reset}     - View your identity`);
			console.log(
				`     ${colors.cyan}yxhyx checkin morning${colors.reset}   - Do a morning check-in`
			);
			console.log(`     ${colors.cyan}yxhyx status${colors.reset}            - Quick overview\n`);
		} catch (error) {
			console.error(colors.red, '\nError during initialization:', error);
			process.exit(1);
		}
	});
