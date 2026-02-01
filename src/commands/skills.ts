/**
 * Skills Command - Manage and execute skills
 *
 * Provides CLI interface for:
 * - Listing available skills
 * - Getting skill information
 * - Executing skills directly
 * - Creating custom skills
 */

import { Command } from 'commander';
import {
	formatBox,
	formatError,
	formatSuccess,
	formatTable,
	formatWarning,
} from '../lib/cli/formatting';
import { skillExecutor, skillLoader, skillRouter } from '../lib/skills';

// ============================================
// Skills Command
// ============================================

export const skillsCommand = new Command('skills')
	.description('Manage and execute skills')
	.addHelpText(
		'after',
		`
Examples:
  $ yxhyx skills list              # List all available skills
  $ yxhyx skills info research     # Show details about the research skill
  $ yxhyx skills run research      # Execute the research skill
  $ yxhyx skills run research quick "TypeScript tips"  # Run specific workflow
  $ yxhyx skills create my-skill   # Create a new custom skill
`
	);

// ============================================
// List Subcommand
// ============================================

skillsCommand
	.command('list')
	.alias('ls')
	.description('List all available skills')
	.option('-a, --all', 'Include skills that are not ready (missing env vars)')
	.action(async (options) => {
		try {
			const skills = await skillLoader.listSkills();

			if (skills.length === 0) {
				console.log(formatWarning('No skills found.'));
				console.log('\nSkills are loaded from:');
				console.log('  - Built-in: src/skills/');
				console.log('  - User: ~/.yxhyx/skills/');
				return;
			}

			console.log(formatBox('Available Skills', `${skills.length} skills loaded`));
			console.log();

			// Filter based on options
			const displaySkills = options.all ? skills : skills.filter((s) => s.isReady);

			if (displaySkills.length === 0) {
				console.log(formatWarning('No ready skills. Use --all to see all skills.'));
				return;
			}

			// Format as table
			const rows = displaySkills.map((skill) => [
				skill.name,
				skill.version,
				skill.workflows.join(', '),
				skill.isReady ? 'Ready' : 'Missing env vars',
			]);

			console.log(formatTable(['Skill', 'Version', 'Workflows', 'Status'], rows));

			if (!options.all) {
				const notReady = skills.filter((s) => !s.isReady);
				if (notReady.length > 0) {
					console.log(
						formatWarning(`\n${notReady.length} skill(s) not ready. Use --all to see them.`)
					);
				}
			}
		} catch (error) {
			console.error(formatError('Failed to list skills'), error);
			process.exit(1);
		}
	});

// ============================================
// Info Subcommand
// ============================================

skillsCommand
	.command('info <skill>')
	.description('Show detailed information about a skill')
	.action(async (skillName) => {
		try {
			const skill = await skillLoader.getSkill(skillName);

			if (!skill) {
				console.error(formatError(`Skill '${skillName}' not found`));
				console.log('\nAvailable skills:');
				const skills = await skillLoader.listSkills();
				for (const s of skills) {
					console.log(`  - ${s.name}`);
				}
				process.exit(1);
			}

			const def = skill.definition;

			console.log(formatBox(`${def.name} v${def.version}`, def.description));
			console.log();

			// Status
			if (skill.isReady) {
				console.log(formatSuccess('Status: Ready'));
			} else {
				console.log(formatWarning('Status: Not ready'));
				console.log(`Missing environment variables: ${skill.missingEnvVars.join(', ')}`);
			}
			console.log();

			// Triggers
			console.log('Trigger Patterns:');
			for (const pattern of def.triggers.patterns.slice(0, 5)) {
				console.log(`  - "${pattern}"`);
			}
			if (def.triggers.patterns.length > 5) {
				console.log(`  ... and ${def.triggers.patterns.length - 5} more`);
			}
			console.log();

			console.log('Keywords:');
			console.log(`  ${def.triggers.keywords.join(', ')}`);
			console.log();

			// Workflows
			console.log('Workflows:');
			for (const [name, wf] of Object.entries(def.workflows)) {
				const isDefault = wf.default ? ' (default)' : '';
				const time = wf.estimated_seconds ? ` ~${wf.estimated_seconds}s` : '';
				console.log(`  ${name}${isDefault}${time}`);
				console.log(`    ${wf.description}`);
				if (wf.triggers && wf.triggers.length > 0) {
					console.log(`    Triggers: ${wf.triggers.slice(0, 3).join(', ')}`);
				}
			}
			console.log();

			// Config
			if (Object.keys(def.config).length > 0) {
				console.log('Configuration:');
				for (const [key, value] of Object.entries(def.config)) {
					console.log(`  ${key}: ${JSON.stringify(value)}`);
				}
				console.log();
			}

			// Path
			console.log(`Location: ${skill.path}`);
		} catch (error) {
			console.error(formatError('Failed to get skill info'), error);
			process.exit(1);
		}
	});

// ============================================
// Run Subcommand
// ============================================

skillsCommand
	.command('run <skill> [workflow] [input...]')
	.description('Execute a skill with optional workflow and input')
	.option('-v, --verbose', 'Show detailed execution information')
	.option('-m, --model <model>', 'Use a specific model')
	.action(async (skillName, workflow, inputParts, options) => {
		try {
			const input = inputParts.join(' ') || `Run ${skillName} skill`;

			console.log(
				formatBox(
					`Executing: ${skillName}`,
					workflow ? `Workflow: ${workflow}` : 'Default workflow'
				)
			);
			console.log();

			const result = await skillExecutor.executeSkill(skillName, workflow, {
				input,
				verbose: options.verbose,
				preferredModel: options.model,
			});

			if (result.success) {
				console.log(result.output);
				console.log();
				console.log('---');
				console.log(
					`Skill: ${result.skill} | Workflow: ${result.workflow} | Model: ${result.model} | Cost: $${result.cost.toFixed(4)} | Time: ${result.duration.toFixed(1)}s`
				);
			} else {
				console.error(formatError('Skill execution failed'));
				console.error(result.error);
				process.exit(1);
			}
		} catch (error) {
			console.error(formatError('Failed to execute skill'), error);
			process.exit(1);
		}
	});

// ============================================
// Match Subcommand
// ============================================

skillsCommand
	.command('match <input...>')
	.description('Show which skill would handle an input')
	.option('-a, --all', 'Show all matching skills, not just the best')
	.action(async (inputParts, options) => {
		try {
			const input = inputParts.join(' ');

			console.log(`Input: "${input}"\n`);

			if (options.all) {
				const matches = await skillRouter.findAllMatches(input);

				if (matches.length === 0) {
					console.log(formatWarning('No skills matched this input.'));
					return;
				}

				console.log('Matching skills:');
				for (const match of matches) {
					console.log();
					console.log(
						`  ${match.skill.definition.name} (${(match.confidence * 100).toFixed(0)}% confidence)`
					);
					console.log(`    Workflow: ${match.workflow}`);
					console.log(`    Match type: ${match.matchType}`);
					if (match.matchedTrigger) {
						console.log(`    Matched: "${match.matchedTrigger}"`);
					}
				}
			} else {
				const match = await skillRouter.route(input);

				if (!match) {
					console.log(formatWarning('No skill matched this input.'));
					console.log('\nTry being more specific or use one of these triggers:');
					const skills = await skillLoader.listSkills();
					for (const skill of skills.slice(0, 5)) {
						const skill_ = await skillLoader.getSkill(skill.name);
						if (skill_) {
							console.log(`  - ${skill_.definition.triggers.patterns[0]}`);
						}
					}
					return;
				}

				console.log(formatSuccess(`Match found: ${match.skill.definition.name}`));
				console.log();
				console.log(`  Workflow: ${match.workflow}`);
				console.log(`  Confidence: ${(match.confidence * 100).toFixed(0)}%`);
				console.log(`  Match type: ${match.matchType}`);
				if (match.matchedTrigger) {
					console.log(`  Matched trigger: "${match.matchedTrigger}"`);
				}
			}
		} catch (error) {
			console.error(formatError('Failed to match input'), error);
			process.exit(1);
		}
	});

// ============================================
// Create Subcommand
// ============================================

skillsCommand
	.command('create <name>')
	.description('Create a new custom skill from template')
	.action(async (name) => {
		const { mkdir, writeFile } = await import('node:fs/promises');
		const { existsSync } = await import('node:fs');
		const { join } = await import('node:path');

		const skillDir = `${process.env.HOME}/.yxhyx/skills/${name}`;

		if (existsSync(skillDir)) {
			console.error(formatError(`Skill '${name}' already exists at ${skillDir}`));
			process.exit(1);
		}

		try {
			// Create directory structure
			await mkdir(join(skillDir, 'workflows'), { recursive: true });

			// Create skill.yaml
			const skillYaml = `name: ${name}
version: "1.0.0"
description: Custom skill description

triggers:
  patterns:
    - "${name}"
    - "use ${name}"
  keywords:
    - ${name}

dependencies: []

workflows:
  default:
    description: Default workflow for ${name}
    file: workflows/default.md
    default: true
    estimated_seconds: 30
    model_complexity: STANDARD

config:
  # Add custom configuration here

env:
  required: []
  optional: []

author: You
license: MIT
`;

			await writeFile(join(skillDir, 'skill.yaml'), skillYaml);

			// Create default workflow
			const workflowMd = `# Default Workflow

## Metadata
- **Skill**: ${name}
- **Workflow**: default
- **Estimated Time**: 30 seconds
- **Model Complexity**: STANDARD

## Description
Default workflow for the ${name} skill.

## Steps

### 1. Parse Input
Understand what the user is asking for.

### 2. Process
Do the main work of this skill.

\`\`\`prompt
Process this request:

Input: {{query}}

Requirements:
- Requirement 1
- Requirement 2

Response Format (JSON):
{
  "result": "The result",
  "details": ["Detail 1", "Detail 2"]
}
\`\`\`

### 3. Format Output
Present results in a clear format.

## Output Format

\`\`\`markdown
## ${name} Result

[Output here]

---
*${name} skill complete*
\`\`\`
`;

			await writeFile(join(skillDir, 'workflows', 'default.md'), workflowMd);

			console.log(formatSuccess(`Created skill '${name}' at ${skillDir}`));
			console.log();
			console.log('Files created:');
			console.log(`  - ${skillDir}/skill.yaml`);
			console.log(`  - ${skillDir}/workflows/default.md`);
			console.log();
			console.log('Next steps:');
			console.log('  1. Edit skill.yaml to customize triggers and config');
			console.log('  2. Edit workflows/default.md to define the workflow');
			console.log(`  3. Test with: yxhyx skills run ${name}`);
		} catch (error) {
			console.error(formatError('Failed to create skill'), error);
			process.exit(1);
		}
	});

// ============================================
// Reload Subcommand
// ============================================

skillsCommand
	.command('reload')
	.description('Reload all skills from disk')
	.action(async () => {
		try {
			await skillLoader.reloadAll();
			const skills = await skillLoader.listSkills();
			console.log(formatSuccess(`Reloaded ${skills.length} skills`));
		} catch (error) {
			console.error(formatError('Failed to reload skills'), error);
			process.exit(1);
		}
	});
