/**
 * Identity Command - Manage your personal context
 *
 * Add/update goals, projects, interests, lessons, and view your identity.
 */

import { Command } from 'commander';
import {
	bold,
	dim,
	error,
	info,
	progressBarSimple,
	success,
	table,
	warning,
} from '../lib/cli/formatting';
import { getActiveGoals, loadIdentity, updateIdentity } from '../lib/context-loader';
import { type Goal, type Project, generateId } from '../lib/schemas/identity';
import { generateViews } from '../lib/view-generator';

export const identityCommand = new Command('identity')
	.description('Manage your identity and context')
	.alias('id');

// ============================================
// Show Command
// ============================================

identityCommand
	.command('show')
	.description('Display your identity summary')
	.option(
		'-s, --section <section>',
		'Show specific section (about, goals, projects, interests, learned)'
	)
	.option('-j, --json', 'Output as JSON')
	.action(async (options) => {
		try {
			const identity = await loadIdentity();

			if (options.json) {
				if (options.section) {
					const section = (identity as Record<string, unknown>)[options.section];
					console.log(JSON.stringify(section, null, 2));
				} else {
					console.log(JSON.stringify(identity, null, 2));
				}
				return;
			}

			if (options.section) {
				const section = (identity as Record<string, unknown>)[options.section];
				if (section) {
					console.log(JSON.stringify(section, null, 2));
				} else {
					console.log(error(`Unknown section: ${options.section}`));
				}
				return;
			}

			// Full summary
			console.log(bold('\n═══════════════════════════════════════'));
			console.log(bold(`   ${identity.about.name}'s Identity`));
			console.log(bold('═══════════════════════════════════════\n'));

			// About
			console.log(info('ABOUT'));
			console.log(`  Location: ${identity.about.location || 'Not specified'}`);
			console.log(`  Timezone: ${identity.about.timezone}`);
			if (identity.about.expertise.length > 0) {
				console.log(`  Expertise: ${identity.about.expertise.join(', ')}`);
			}

			// Mission
			if (identity.mission) {
				console.log(info('\nMISSION'));
				console.log(
					`  ${identity.mission.substring(0, 150)}${identity.mission.length > 150 ? '...' : ''}`
				);
			}

			// Goals
			const allGoals = [
				...identity.goals.short_term,
				...identity.goals.medium_term,
				...identity.goals.long_term,
			];
			const activeGoals = allGoals.filter((g) => g.progress < 1);

			console.log(info(`\nGOALS (${activeGoals.length} active)`));
			if (activeGoals.length === 0) {
				console.log(dim('  No active goals. Add one with: yxhyx identity add-goal "Your goal"'));
			} else {
				for (const g of activeGoals.slice(0, 5)) {
					const term = identity.goals.short_term.includes(g)
						? 'S'
						: identity.goals.medium_term.includes(g)
							? 'M'
							: 'L';
					console.log(`  ${progressBarSimple(g.progress)} [${term}] ${g.title}`);
				}
				if (activeGoals.length > 5) {
					console.log(dim(`  ... and ${activeGoals.length - 5} more`));
				}
			}

			// Projects
			const activeProjects = identity.projects.filter((p) => p.status === 'active');
			console.log(info(`\nPROJECTS (${activeProjects.length} active)`));
			if (activeProjects.length === 0) {
				console.log(dim('  No active projects.'));
			} else {
				for (const p of activeProjects) {
					console.log(`  • ${p.name}`);
					if (p.next_actions.length > 0) {
						console.log(dim(`    Next: ${p.next_actions[0]}`));
					}
				}
			}

			// Interests
			const highInterests = identity.interests.high_priority.map((i) => i.topic);
			if (highInterests.length > 0) {
				console.log(info('\nTOP INTERESTS'));
				console.log(`  ${highInterests.join(', ')}`);
			}

			// Recent lessons
			if (identity.learned.length > 0) {
				console.log(info(`\nRECENT LESSONS (${identity.learned.length} total)`));
				for (const l of identity.learned.slice(-3)) {
					console.log(`  • ${l.lesson.substring(0, 80)}${l.lesson.length > 80 ? '...' : ''}`);
				}
			}

			// Communication preferences
			console.log(info('\nPREFERENCES'));
			console.log(`  Style: ${identity.preferences.communication.style}`);
			console.log(`  Length: ${identity.preferences.communication.length}`);

			console.log(dim('\n─────────────────────────────────────────'));
			console.log(dim(`Last updated: ${new Date(identity.last_updated).toLocaleString()}`));
			console.log('');
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});

// ============================================
// Add Goal Command
// ============================================

identityCommand
	.command('add-goal <title>')
	.description('Add a new goal')
	.option('-t, --term <term>', 'Goal term: short, medium, long', 'short')
	.option('-d, --deadline <date>', 'Deadline (YYYY-MM-DD)')
	.option('-p, --project <id>', 'Related project ID')
	.option('--description <text>', 'Goal description')
	.action(async (title, options) => {
		try {
			const termKey = `${options.term}_term` as 'short_term' | 'medium_term' | 'long_term';

			if (!['short_term', 'medium_term', 'long_term'].includes(termKey)) {
				console.log(error('Invalid term. Use: short, medium, or long'));
				return;
			}

			const goal: Goal = {
				id: generateId(`goal-${options.term[0]}t`),
				title,
				description: options.description,
				deadline: options.deadline,
				progress: 0,
				related_projects: options.project ? [options.project] : [],
				created: new Date().toISOString(),
			};

			await updateIdentity((identity) => ({
				...identity,
				goals: {
					...identity.goals,
					[termKey]: [...identity.goals[termKey], goal],
				},
			}));

			await generateViews();

			console.log(success(`\n Added ${options.term}-term goal: ${title}`));
			console.log(dim(`  ID: ${goal.id}`));
			if (options.deadline) {
				console.log(dim(`  Deadline: ${options.deadline}`));
			}
			console.log('');
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});

// ============================================
// Update Progress Command
// ============================================

identityCommand
	.command('progress <goalId> <percent>')
	.description('Update goal progress (0-100)')
	.action(async (goalId, percent) => {
		try {
			const progress = Number.parseInt(percent, 10) / 100;

			if (Number.isNaN(progress) || progress < 0 || progress > 1) {
				console.log(error('Progress must be a number between 0 and 100'));
				return;
			}

			let found = false;
			let goalTitle = '';

			await updateIdentity((identity) => {
				const updateGoals = (goals: Goal[]) =>
					goals.map((g) => {
						if (g.id === goalId) {
							found = true;
							goalTitle = g.title;
							return { ...g, progress };
						}
						return g;
					});

				return {
					...identity,
					goals: {
						short_term: updateGoals(identity.goals.short_term),
						medium_term: updateGoals(identity.goals.medium_term),
						long_term: updateGoals(identity.goals.long_term),
					},
				};
			});

			if (!found) {
				console.log(error(`Goal not found: ${goalId}`));
				console.log(dim('\nAvailable goals:'));
				const activeGoals = await getActiveGoals();
				for (const g of activeGoals) {
					console.log(dim(`  ${g.id}: ${g.title}`));
				}
				return;
			}

			await generateViews();

			const statusIcon = progress >= 1 ? '🎉' : '📈';
			console.log(success(`\n${statusIcon} Updated "${goalTitle}" to ${percent}%\n`));
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});

// ============================================
// Add Lesson Command
// ============================================

identityCommand
	.command('add-lesson <lesson>')
	.description('Add a lesson learned')
	.option('-c, --context <context>', 'Context for the lesson')
	.action(async (lesson, options) => {
		try {
			await updateIdentity((identity) => ({
				...identity,
				learned: [
					...identity.learned,
					{
						lesson,
						context: options.context,
						date: new Date().toISOString().split('T')[0],
					},
				],
			}));

			await generateViews();

			console.log(success('\n📝 Lesson added'));
			console.log(dim(`  "${lesson}"`));
			if (options.context) {
				console.log(dim(`  Context: ${options.context}`));
			}
			console.log('');
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});

// ============================================
// Add Interest Command
// ============================================

identityCommand
	.command('add-interest <topic>')
	.description('Add an interest')
	.option('-s, --subtopics <topics>', 'Comma-separated subtopics')
	.option('-p, --priority <level>', 'Priority: high, medium, low', 'medium')
	.action(async (topic, options) => {
		try {
			const priorityKey = `${options.priority}_priority` as
				| 'high_priority'
				| 'medium_priority'
				| 'low_priority';

			if (!['high_priority', 'medium_priority', 'low_priority'].includes(priorityKey)) {
				console.log(error('Invalid priority. Use: high, medium, or low'));
				return;
			}

			const subtopics = options.subtopics
				? options.subtopics.split(',').map((s: string) => s.trim())
				: [];

			await updateIdentity((identity) => ({
				...identity,
				interests: {
					...identity.interests,
					[priorityKey]: [...identity.interests[priorityKey], { topic, subtopics }],
				},
			}));

			await generateViews();

			console.log(success(`\n🎯 Added ${options.priority}-priority interest: ${topic}`));
			if (subtopics.length > 0) {
				console.log(dim(`  Subtopics: ${subtopics.join(', ')}`));
			}
			console.log('');
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});

// ============================================
// Add Project Command
// ============================================

identityCommand
	.command('add-project <name>')
	.description('Add a new project')
	.option('-d, --description <text>', 'Project description')
	.option('-r, --repo <url>', 'Repository URL')
	.option('-g, --goal <id>', 'Related goal ID')
	.action(async (name, options) => {
		try {
			const project: Project = {
				id: generateId('project'),
				name,
				status: 'active',
				description: options.description || '',
				repo: options.repo,
				next_actions: [],
				related_goals: options.goal ? [options.goal] : [],
				created: new Date().toISOString(),
			};

			await updateIdentity((identity) => ({
				...identity,
				projects: [...identity.projects, project],
			}));

			await generateViews();

			console.log(success(`\n🚀 Added project: ${name}`));
			console.log(dim(`  ID: ${project.id}`));
			console.log('');
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});

// ============================================
// List Goals Command
// ============================================

identityCommand
	.command('goals')
	.description('List all goals')
	.option('-a, --all', 'Include completed goals')
	.action(async (options) => {
		try {
			const identity = await loadIdentity();
			const allGoals = [
				...identity.goals.short_term.map((g) => ({ ...g, term: 'Short' })),
				...identity.goals.medium_term.map((g) => ({ ...g, term: 'Medium' })),
				...identity.goals.long_term.map((g) => ({ ...g, term: 'Long' })),
			];

			const goals = options.all ? allGoals : allGoals.filter((g) => g.progress < 1);

			if (goals.length === 0) {
				console.log(
					warning('\nNo goals found. Add one with: yxhyx identity add-goal "Your goal"\n')
				);
				return;
			}

			console.log(bold('\n Goals\n'));

			const rows = goals.map((g) => [
				g.term,
				`${Math.round(g.progress * 100)}%`,
				g.title,
				g.deadline || '-',
				g.id,
			]);

			console.log(table(['Term', 'Progress', 'Title', 'Deadline', 'ID'], rows));
			console.log('');
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});

// ============================================
// List Projects Command
// ============================================

identityCommand
	.command('projects')
	.description('List all projects')
	.option('-a, --all', 'Include non-active projects')
	.action(async (options) => {
		try {
			const identity = await loadIdentity();
			const projects = options.all
				? identity.projects
				: identity.projects.filter((p) => p.status === 'active');

			if (projects.length === 0) {
				console.log(
					warning('\nNo projects found. Add one with: yxhyx identity add-project "Name"\n')
				);
				return;
			}

			console.log(bold('\n Projects\n'));

			const rows = projects.map((p) => [p.status, p.name, p.next_actions[0] || '-', p.id]);

			console.log(table(['Status', 'Name', 'Next Action', 'ID'], rows));
			console.log('');
		} catch (err) {
			console.error(error(`\nError: ${err instanceof Error ? err.message : err}\n`));
			process.exit(1);
		}
	});
