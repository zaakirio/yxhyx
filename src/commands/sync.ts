/**
 * Sync Command - Regenerate views and OpenCode integration files
 *
 * This command ensures that generated files (Markdown views, OpenCode AGENTS.md, skills)
 * are up to date with the source of truth (identity.yaml).
 *
 * Usage:
 *   yxhyx sync              # Regenerate everything
 *   yxhyx sync --views      # Only regenerate identity views
 *   yxhyx sync --opencode   # Only regenerate OpenCode files
 */

import { Command } from 'commander';
import { colors, info, success, warning } from '../lib/cli/formatting';
import { isInitialized } from '../lib/context-loader';
import { isOpenCodeIntegrationSetUp, syncOpenCodeIntegration } from '../lib/opencode-integration';
import { generateViews } from '../lib/view-generator';

export const syncCommand = new Command('sync')
	.description('Regenerate views and OpenCode integration files')
	.option('-v, --views', 'Only regenerate identity views')
	.option('-o, --opencode', 'Only regenerate OpenCode integration files')
	.option('--verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			// Check if initialized
			if (!(await isInitialized())) {
				console.log(
					`${colors.red}Error: Yxhyx not initialized. Run \`yxhyx init\` first.${colors.reset}`
				);
				process.exit(1);
			}

			const syncAll = !options.views && !options.opencode;
			const results: string[] = [];

			// Regenerate views
			if (syncAll || options.views) {
				if (options.verbose) {
					console.log(info('Regenerating identity views...'));
				}
				await generateViews();
				results.push('Identity views regenerated');

				if (options.verbose) {
					console.log('  - ~/.yxhyx/identity/views/ABOUT.md');
					console.log('  - ~/.yxhyx/identity/views/GOALS.md');
					console.log('  - ~/.yxhyx/identity/views/PROJECTS.md');
					console.log('  - ~/.yxhyx/identity/views/INTERESTS.md');
					console.log('  - ~/.yxhyx/identity/views/LEARNED.md');
					console.log('  - ~/.yxhyx/identity/views/CHALLENGES.md');
				}
			}

			// Regenerate OpenCode files
			if (syncAll || options.opencode) {
				if (!isOpenCodeIntegrationSetUp()) {
					if (options.opencode) {
						// User explicitly requested OpenCode sync but it's not set up
						console.log(warning('OpenCode integration not set up. Run `yxhyx init` to set it up.'));
					} else if (options.verbose) {
						console.log(info('OpenCode integration not set up, skipping.'));
					}
				} else {
					if (options.verbose) {
						console.log(info('Regenerating OpenCode integration files...'));
					}
					await syncOpenCodeIntegration();
					results.push('OpenCode integration files regenerated');

					if (options.verbose) {
						console.log('  - ~/.config/opencode/AGENTS.md');
						console.log('  - ~/.config/opencode/skills/yxhyx-checkin/SKILL.md');
						console.log('  - ~/.config/opencode/skills/yxhyx-research/SKILL.md');
						console.log('  - ~/.config/opencode/skills/yxhyx-news/SKILL.md');
						console.log('  - ~/.config/opencode/skills/yxhyx-identity/SKILL.md');
					}
				}
			}

			// Print summary
			if (results.length > 0) {
				console.log(success('\n✓ Sync complete:'));
				for (const result of results) {
					console.log(`  - ${result}`);
				}
			} else {
				console.log(info('Nothing to sync.'));
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`${colors.red}Error during sync: ${errorMessage}${colors.reset}`);
			process.exit(1);
		}
	});
