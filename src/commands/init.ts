/**
 * Init Command - Initialize Yxhyx for first-time use
 *
 * Creates the necessary directory structure, gathers initial identity info,
 * and sets up configuration files.
 */

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { stringify } from 'yaml';
import { bold, colors, info, success, warning } from '../lib/cli/formatting';
import { getIdentityPath, getYxhyxDir, isInitialized, saveIdentity } from '../lib/context-loader';
import { stateManager } from '../lib/memory/state-manager';
import { DEFAULT_ROUTING_CONFIG } from '../lib/model-router';
import { detectOpenCode, setupOpenCodeIntegration } from '../lib/opencode-integration';
import { createDefaultIdentity } from '../lib/schemas/identity';
import { generateViews } from '../lib/view-generator';

const execAsync = promisify(exec);

/**
 * Check if at least one API key is configured
 */
function hasApiKey(): boolean {
	return !!(
		process.env.KIMI_API_KEY ||
		process.env.MOONSHOT_API_KEY ||
		process.env.OPENROUTER_API_KEY ||
		process.env.ANTHROPIC_API_KEY
	);
}

/**
 * Get the name of the configured API provider
 */
function getConfiguredProvider(): string {
	if (process.env.ANTHROPIC_API_KEY) return 'Anthropic';
	if (process.env.OPENROUTER_API_KEY) return 'OpenRouter';
	if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return 'Kimi/Moonshot';
	return 'None';
}

export const initCommand = new Command('init')
	.description('Initialize Yxhyx - your personal AI assistant')
	.option('-f, --force', 'Reinitialize even if already initialized')
	.action(async (options) => {
		try {
			// Check for API keys and OpenCode first
			const hasKey = hasApiKey();
			const openCodeStatus = await detectOpenCode();
			const openCodeAvailable = openCodeStatus.installed || openCodeStatus.configExists;

			if (!hasKey) {
				if (openCodeAvailable) {
					// OpenCode found - give user options
					console.log(`
${colors.yellow}${colors.bold}No API key configured${colors.reset}

${colors.green}✓ OpenCode detected!${colors.reset} ${openCodeStatus.installed ? '(installed)' : '(config found)'}
  You can use Yxhyx through OpenCode, which manages its own API keys.
`);

					const { apiKeyChoice } = await inquirer.prompt([
						{
							type: 'list',
							name: 'apiKeyChoice',
							message: 'How would you like to proceed?',
							choices: [
								{
									name: 'Continue with OpenCode only (recommended)',
									value: 'opencode_only',
								},
								{
									name: 'Add an API key now for standalone Yxhyx use',
									value: 'add_key',
								},
								{
									name: 'Set up both (OpenCode + standalone API key)',
									value: 'both',
								},
							],
						},
					]);

					if (apiKeyChoice === 'add_key' || apiKeyChoice === 'both') {
						const { provider } = await inquirer.prompt([
							{
								type: 'list',
								name: 'provider',
								message: 'Which API provider would you like to use?',
								choices: [
									{ name: 'Kimi (cheapest)', value: 'KIMI_API_KEY' },
									{ name: 'OpenRouter (many models)', value: 'OPENROUTER_API_KEY' },
									{ name: 'Anthropic (highest quality)', value: 'ANTHROPIC_API_KEY' },
								],
							},
						]);

						const { apiKey } = await inquirer.prompt([
							{
								type: 'password',
								name: 'apiKey',
								message: `Enter your ${provider.replace('_API_KEY', '')} API key:`,
								mask: '*',
								validate: (input: string) => input.trim().length > 0 || 'API key is required',
							},
						]);

						// Set the environment variable for this session
						process.env[provider] = apiKey.trim();

						console.log(`
${colors.green}✓ API key set for this session${colors.reset}

${colors.yellow}To make this permanent, add to your shell profile (~/.zshrc or ~/.bashrc):${colors.reset}
  ${colors.cyan}export ${provider}="${apiKey.trim().slice(0, 8)}...${apiKey.trim().slice(-4)}"${colors.reset}
`);
					}

					// If opencode_only, we continue without requiring an API key
					// The user will use Yxhyx through OpenCode
				} else {
					// No OpenCode and no API key - show error with option to add key
					console.log(`
${colors.red}${colors.bold}No API key configured${colors.reset}

Yxhyx requires at least one AI provider API key to function.
`);

					const { addKeyNow } = await inquirer.prompt([
						{
							type: 'confirm',
							name: 'addKeyNow',
							message: 'Would you like to add an API key now?',
							default: true,
						},
					]);

					if (addKeyNow) {
						const { provider } = await inquirer.prompt([
							{
								type: 'list',
								name: 'provider',
								message: 'Which API provider would you like to use?',
								choices: [
									{ name: 'Kimi (cheapest - recommended)', value: 'KIMI_API_KEY' },
									{ name: 'OpenRouter (many models)', value: 'OPENROUTER_API_KEY' },
									{ name: 'Anthropic (highest quality)', value: 'ANTHROPIC_API_KEY' },
								],
							},
						]);

						const { apiKey } = await inquirer.prompt([
							{
								type: 'password',
								name: 'apiKey',
								message: `Enter your ${provider.replace('_API_KEY', '')} API key:`,
								mask: '*',
								validate: (input: string) => input.trim().length > 0 || 'API key is required',
							},
						]);

						// Set the environment variable for this session
						process.env[provider] = apiKey.trim();

						console.log(`
${colors.green}✓ API key set for this session${colors.reset}

${colors.yellow}To make this permanent, add to your shell profile (~/.zshrc or ~/.bashrc):${colors.reset}
  ${colors.cyan}export ${provider}="${apiKey.trim().slice(0, 8)}...${apiKey.trim().slice(-4)}"${colors.reset}
`);
					} else {
						console.log(`
Please set one of the following environment variables:

  ${colors.cyan}export KIMI_API_KEY="your-key"${colors.reset}       # Recommended - cheapest
  ${colors.cyan}export OPENROUTER_API_KEY="your-key"${colors.reset} # Access to many models
  ${colors.cyan}export ANTHROPIC_API_KEY="your-key"${colors.reset}  # Highest quality

Add the export to your shell profile (~/.zshrc or ~/.bashrc) and restart your terminal.
`);
						process.exit(1);
					}
				}
			}

			// Check if already initialized
			if (await isInitialized()) {
				if (!options.force) {
					console.log(warning('\nYxhyx is already initialized. Use --force to reinitialize.\n'));
					console.log(`Identity: ${getIdentityPath()}`);
					return;
				}
				console.log(warning('\nReinitializing Yxhyx...\n'));
			}

			const provider = getConfiguredProvider();

			console.log(bold('\n Welcome to Yxhyx - Your Personal AI Assistant\n'));
			console.log(info(`API Provider: ${provider}`));
			console.log("Let's set up your personal context.\n");

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

			// Gather user information - simplified to just 3 prompts
			const prompts = [
				{
					type: 'input',
					name: 'name',
					message: 'What is your name?',
					validate: (input: string) => input.trim().length > 0 || 'Name is required',
				},
				{
					type: 'input',
					name: 'timezone',
					message: 'What is your timezone?',
					default: Intl.DateTimeFormat().resolvedOptions().timeZone,
				},
				{
					type: 'input',
					name: 'background',
					message: 'Brief description of who you are and what you do:',
					validate: (input: string) => input.trim().length > 0 || 'Please tell us about yourself',
				},
			];

			const answers = await inquirer.prompt(prompts);

			// Create identity
			const identity = createDefaultIdentity(answers.name.trim(), answers.timezone);
			identity.about.background = answers.background?.trim() || '';

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
			await stateManager.initializeState();
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

			// Copy built-in skills to user skills directory
			await copyBuiltinSkills(yxhyxDir);
			console.log(info(' Built-in skills installed'));

			// ============================================
			// OpenCode Integration
			// ============================================
			let openCodeSetUp = false;
			// Note: openCodeStatus was already detected at the start of init

			if (openCodeAvailable) {
				// OpenCode is installed or has been configured - ask about integration
				const { setupOpenCode } = await inquirer.prompt([
					{
						type: 'confirm',
						name: 'setupOpenCode',
						message: openCodeStatus.installed
							? 'OpenCode detected. Set up Yxhyx integration with OpenCode?'
							: 'OpenCode config directory found. Set up Yxhyx integration?',
						default: true,
					},
				]);

				if (setupOpenCode) {
					console.log(info('\n Setting up OpenCode integration...'));
					const { backupPath, filesCreated } = await setupOpenCodeIntegration();

					if (backupPath) {
						console.log(info(` Existing config backed up to: ${backupPath}`));
					}

					console.log(success(' OpenCode integration configured!'));
					console.log(info(` Created ${filesCreated.length} files:`));
					console.log('   - ~/.config/opencode/AGENTS.md (global rules)');
					console.log('   - ~/.config/opencode/opencode.json (config)');
					console.log('   - ~/.config/opencode/skills/yxhyx-*/SKILL.md (4 skills)');
					openCodeSetUp = true;
				}
			} else {
				// OpenCode not detected - offer to set up anyway
				const { setupOpenCode } = await inquirer.prompt([
					{
						type: 'confirm',
						name: 'setupOpenCode',
						message:
							'OpenCode not detected. Set up integration anyway? (You can install OpenCode later)',
						default: false,
					},
				]);

				if (setupOpenCode) {
					console.log(info('\n Setting up OpenCode integration...'));
					const { filesCreated } = await setupOpenCodeIntegration();
					console.log(success(' OpenCode integration configured!'));
					console.log(info(` Created ${filesCreated.length} files`));
					openCodeSetUp = true;
				}
			}

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
			console.log(`     ${colors.cyan}yxhyx status${colors.reset}            - Quick overview`);

			if (openCodeSetUp) {
				console.log(`\n${bold('OpenCode Integration:')}`);
				console.log(
					`     ${colors.cyan}opencode${colors.reset}                - Launch OpenCode with Yxhyx context`
				);
				console.log(
					`     ${colors.cyan}yxhyx sync${colors.reset}              - Regenerate OpenCode files after identity changes`
				);
			}
			console.log('');
		} catch (error) {
			console.error(colors.red, '\nError during initialization:', error);
			process.exit(1);
		}
	});

/**
 * Copy built-in skills to user skills directory
 */
async function copyBuiltinSkills(yxhyxDir: string): Promise<void> {
	// Determine the built-in skills directory
	// In development: src/skills/
	// In production: dist/skills/ or bundled
	const possiblePaths = [
		join(import.meta.dirname || __dirname, '../skills'),
		join(import.meta.dirname || __dirname, '../../skills'),
		join(import.meta.dirname || __dirname, '../../src/skills'),
	];

	let builtinSkillsDir: string | null = null;
	for (const p of possiblePaths) {
		if (existsSync(p)) {
			builtinSkillsDir = p;
			break;
		}
	}

	if (!builtinSkillsDir) {
		console.log(warning(' Could not find built-in skills directory'));
		return;
	}

	const userSkillsDir = `${yxhyxDir}/skills`;

	try {
		const skillDirs = await readdir(builtinSkillsDir);

		for (const skillName of skillDirs) {
			const srcPath = join(builtinSkillsDir, skillName);
			const destPath = join(userSkillsDir, skillName);

			// Only copy if destination doesn't exist (don't overwrite user customizations)
			if (!existsSync(destPath)) {
				await cp(srcPath, destPath, { recursive: true });
			}
		}
	} catch (error) {
		console.log(warning(` Could not copy built-in skills: ${error}`));
	}
}
