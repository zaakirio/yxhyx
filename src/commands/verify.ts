/**
 * Verify Command - Verify Yxhyx installation and configuration
 *
 * Checks:
 * 1. Identity file exists and is valid
 * 2. API keys are configured
 * 3. Memory system is ready
 * 4. Skills are loaded
 * 5. Optional: Test AI call
 */

import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { colors } from '../lib/cli/formatting';
import { getIdentityPath, isInitialized, loadIdentity } from '../lib/context-loader';
import { learningManager } from '../lib/memory/learning-manager';
import { stateManager } from '../lib/memory/state-manager';
import { modelRouter } from '../lib/model-router';
import { skillLoader } from '../lib/skills/loader';

// ============================================
// Types
// ============================================

interface VerificationResult {
	name: string;
	status: 'pass' | 'fail' | 'warn';
	message: string;
	details?: string;
}

// ============================================
// Verify Command
// ============================================

export const verifyCommand = new Command('verify')
	.description('Verify Yxhyx installation and configuration')
	.option('-v, --verbose', 'Show detailed output')
	.option('--test-ai', 'Test AI provider connection (makes an API call)')
	.action(async (options: { verbose?: boolean; testAi?: boolean }) => {
		console.log(`\n${colors.bold}Yxhyx Installation Verification${colors.reset}\n`);
		console.log('='.repeat(40));

		const results: VerificationResult[] = [];

		// 1. Check initialization
		results.push(await checkInitialization());

		// 2. Check identity
		results.push(await checkIdentity(options.verbose));

		// 3. Check API keys
		results.push(await checkApiKeys());

		// 4. Check memory system
		results.push(await checkMemorySystem(options.verbose));

		// 5. Check skills
		results.push(await checkSkills(options.verbose));

		// 6. Optional: Test AI call
		if (options.testAi) {
			results.push(await testAiCall());
		}

		// Print results
		console.log('');
		let hasFailures = false;
		let hasWarnings = false;

		for (const result of results) {
			const icon =
				result.status === 'pass'
					? `${colors.green}✓${colors.reset}`
					: result.status === 'warn'
						? `${colors.yellow}⚠${colors.reset}`
						: `${colors.red}✗${colors.reset}`;

			console.log(`${icon} ${result.name}: ${result.message}`);

			if (result.details && options.verbose) {
				console.log(`  ${colors.dim}${result.details}${colors.reset}`);
			}

			if (result.status === 'fail') hasFailures = true;
			if (result.status === 'warn') hasWarnings = true;
		}

		// Summary
		console.log(`\n${'='.repeat(40)}`);

		if (hasFailures) {
			console.log(
				`${colors.red}${colors.bold}Verification FAILED${colors.reset} - Some checks did not pass`
			);
			console.log(`\nRun ${colors.cyan}yxhyx init${colors.reset} to set up Yxhyx.`);
			process.exit(1);
		} else if (hasWarnings) {
			console.log(`${colors.yellow}${colors.bold}Verification PASSED with warnings${colors.reset}`);
			console.log('\nYxhyx is functional but some features may be limited.');
		} else {
			console.log(
				`${colors.green}${colors.bold}Verification PASSED${colors.reset} - All checks successful!`
			);
			console.log(`\nYxhyx is ready to use. Try: ${colors.cyan}yxhyx status${colors.reset}`);
		}

		console.log('');
	});

// ============================================
// Check Functions
// ============================================

async function checkInitialization(): Promise<VerificationResult> {
	const initialized = await isInitialized();

	if (initialized) {
		return {
			name: 'Initialization',
			status: 'pass',
			message: 'Yxhyx is initialized',
		};
	}

	return {
		name: 'Initialization',
		status: 'fail',
		message: 'Yxhyx is not initialized',
		details: 'Run: yxhyx init',
	};
}

async function checkIdentity(verbose?: boolean): Promise<VerificationResult> {
	const identityPath = getIdentityPath();

	if (!existsSync(identityPath)) {
		return {
			name: 'Identity',
			status: 'fail',
			message: 'Identity file not found',
			details: `Expected at: ${identityPath}`,
		};
	}

	try {
		const identity = await loadIdentity();

		const details = verbose
			? `Name: ${identity.about.name}, Goals: ${identity.goals.short_term.length + identity.goals.medium_term.length + identity.goals.long_term.length}, Interests: ${identity.interests.high_priority.length + identity.interests.medium_priority.length + identity.interests.low_priority.length}`
			: undefined;

		return {
			name: 'Identity',
			status: 'pass',
			message: `Valid identity for ${identity.about.name}`,
			details,
		};
	} catch (error) {
		return {
			name: 'Identity',
			status: 'fail',
			message: 'Identity file is invalid',
			details: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

async function checkApiKeys(): Promise<VerificationResult> {
	const providers: string[] = [];

	if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) {
		providers.push('Kimi/Moonshot');
	}
	if (process.env.OPENROUTER_API_KEY) {
		providers.push('OpenRouter');
	}
	if (process.env.ANTHROPIC_API_KEY) {
		providers.push('Anthropic');
	}

	if (providers.length === 0) {
		return {
			name: 'API Keys',
			status: 'fail',
			message: 'No API keys configured',
			details: 'Set KIMI_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY',
		};
	}

	return {
		name: 'API Keys',
		status: 'pass',
		message: `${providers.length} provider(s) configured`,
		details: providers.join(', '),
	};
}

async function checkMemorySystem(verbose?: boolean): Promise<VerificationResult> {
	try {
		const state = await stateManager.getState();
		const ratings = await learningManager.getRecentRatings(30);
		const learnings = await learningManager.getAllLearnings();

		const details = verbose
			? `State: ${state.initialized ? 'initialized' : 'not initialized'}, Ratings (30d): ${ratings.length}, Learnings: ${learnings.length}`
			: undefined;

		return {
			name: 'Memory System',
			status: 'pass',
			message: 'Memory system is functional',
			details,
		};
	} catch (error) {
		return {
			name: 'Memory System',
			status: 'warn',
			message: 'Memory system has issues',
			details: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

async function checkSkills(verbose?: boolean): Promise<VerificationResult> {
	try {
		const skills = await skillLoader.listSkills();
		const readySkills = skills.filter((s) => s.isReady);

		const details = verbose
			? skills.map((s) => `${s.name} (${s.isReady ? 'ready' : 'not ready'})`).join(', ')
			: undefined;

		if (skills.length === 0) {
			return {
				name: 'Skills',
				status: 'warn',
				message: 'No skills installed',
				details: 'Run: yxhyx init to install default skills',
			};
		}

		if (readySkills.length === 0) {
			return {
				name: 'Skills',
				status: 'warn',
				message: `${skills.length} skills found, but none are ready`,
				details: 'Check environment variables for required skills',
			};
		}

		return {
			name: 'Skills',
			status: 'pass',
			message: `${readySkills.length}/${skills.length} skills ready`,
			details,
		};
	} catch (error) {
		return {
			name: 'Skills',
			status: 'warn',
			message: 'Could not load skills',
			details: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

async function testAiCall(): Promise<VerificationResult> {
	if (!modelRouter.hasAvailableProvider()) {
		return {
			name: 'AI Connection',
			status: 'fail',
			message: 'No AI provider available',
			details: 'Configure at least one API key',
		};
	}

	try {
		const response = await modelRouter.complete({
			model: 'cheapest',
			messages: [
				{
					role: 'user',
					content: 'Say "Hello" in exactly one word.',
				},
			],
			maxTokens: 10,
		});

		return {
			name: 'AI Connection',
			status: 'pass',
			message: 'AI responded successfully',
			details: `Model: ${response.model}, Cost: $${response.cost.toFixed(6)}`,
		};
	} catch (error) {
		return {
			name: 'AI Connection',
			status: 'fail',
			message: 'AI call failed',
			details: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}
