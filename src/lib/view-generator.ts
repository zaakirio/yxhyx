/**
 * View Generator - Auto-generate markdown views from identity
 *
 * Creates human-readable markdown files from the structured identity.yaml.
 * These views are for reference only - the YAML is the source of truth.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { loadIdentity } from './context-loader';
import type { Goal, Identity } from './schemas/identity';

const VIEWS_DIR = `${process.env.HOME}/.yxhyx/identity/views`;

/**
 * Generate all views from identity
 */
export async function generateViews(): Promise<void> {
	const identity = await loadIdentity();

	await mkdir(VIEWS_DIR, { recursive: true });

	await Promise.all([
		generateAboutView(identity),
		generateGoalsView(identity),
		generateProjectsView(identity),
		generateInterestsView(identity),
		generateLearnedView(identity),
		generateChallengesView(identity),
	]);
}

/**
 * Generate About view
 */
async function generateAboutView(identity: Identity): Promise<void> {
	const content = `# About Me

**Name:** ${identity.about.name}
**Location:** ${identity.about.location || 'Not specified'}
**Timezone:** ${identity.about.timezone}

## Background

${identity.about.background || '_Not yet specified_'}

## Expertise

${identity.about.expertise.length > 0 ? identity.about.expertise.map((e) => `- ${e}`).join('\n') : '_No expertise listed_'}

## Mission

${identity.mission || '_Not yet defined_'}

## Core Beliefs

${
	identity.beliefs.length > 0
		? identity.beliefs
				.map((b) => `- ${b.statement} (${Math.round(b.confidence * 100)}% confident)`)
				.join('\n')
		: '_No beliefs recorded_'
}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

	await writeFile(`${VIEWS_DIR}/ABOUT.md`, content);
}

/**
 * Generate Goals view
 */
async function generateGoalsView(identity: Identity): Promise<void> {
	const formatGoal = (g: Goal) => {
		const checkbox = g.progress >= 1 ? '[x]' : '[ ]';
		const progress = `${Math.round(g.progress * 100)}%`;
		const deadline = g.deadline ? `Due: ${g.deadline}` : 'No deadline';
		const related =
			g.related_projects.length > 0 ? `Related: ${g.related_projects.join(', ')}` : '';

		return `- ${checkbox} **${g.title}** (${progress})
  - ${deadline}${related ? `\n  - ${related}` : ''}`;
	};

	const content = `# Goals

## Short-Term (1-30 days)

${identity.goals.short_term.length > 0 ? identity.goals.short_term.map(formatGoal).join('\n\n') : '_No short-term goals_'}

## Medium-Term (1-6 months)

${identity.goals.medium_term.length > 0 ? identity.goals.medium_term.map(formatGoal).join('\n\n') : '_No medium-term goals_'}

## Long-Term (6+ months)

${identity.goals.long_term.length > 0 ? identity.goals.long_term.map(formatGoal).join('\n\n') : '_No long-term goals_'}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

	await writeFile(`${VIEWS_DIR}/GOALS.md`, content);
}

/**
 * Generate Projects view
 */
async function generateProjectsView(identity: Identity): Promise<void> {
	const activeProjects = identity.projects.filter((p) => p.status === 'active');
	const pausedProjects = identity.projects.filter((p) => p.status === 'paused');
	const completedProjects = identity.projects.filter((p) => p.status === 'completed');

	const formatProject = (p: (typeof identity.projects)[number]) => `
## ${p.name}

**Status:** ${p.status}
**Repository:** ${p.repo || 'None'}

${p.description}

### Next Actions

${p.next_actions.length > 0 ? p.next_actions.map((a) => `- [ ] ${a}`).join('\n') : '_No next actions_'}

### Related Goals

${p.related_goals.length > 0 ? p.related_goals.map((g) => `- ${g}`).join('\n') : '_None_'}
`;

	const content = `# Projects

## Active (${activeProjects.length})

${activeProjects.length > 0 ? activeProjects.map(formatProject).join('\n---\n') : '_No active projects_'}

## Paused (${pausedProjects.length})

${pausedProjects.length > 0 ? pausedProjects.map(formatProject).join('\n---\n') : '_No paused projects_'}

## Completed (${completedProjects.length})

${completedProjects.length > 0 ? completedProjects.map(formatProject).join('\n---\n') : '_No completed projects_'}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

	await writeFile(`${VIEWS_DIR}/PROJECTS.md`, content);
}

/**
 * Generate Interests view
 */
async function generateInterestsView(identity: Identity): Promise<void> {
	const formatInterest = (i: { topic: string; subtopics: string[] }) =>
		`- **${i.topic}**${i.subtopics.length > 0 ? `: ${i.subtopics.join(', ')}` : ''}`;

	const content = `# Interests

## High Priority

${
	identity.interests.high_priority.length > 0
		? identity.interests.high_priority.map(formatInterest).join('\n')
		: '_None_'
}

## Medium Priority

${
	identity.interests.medium_priority.length > 0
		? identity.interests.medium_priority.map(formatInterest).join('\n')
		: '_None_'
}

## Low Priority

${
	identity.interests.low_priority.length > 0
		? identity.interests.low_priority.map(formatInterest).join('\n')
		: '_None_'
}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

	await writeFile(`${VIEWS_DIR}/INTERESTS.md`, content);
}

/**
 * Generate Learned view
 */
async function generateLearnedView(identity: Identity): Promise<void> {
	// Sort by date descending
	const sortedLessons = [...identity.learned].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);

	const formatLesson = (l: { lesson: string; context?: string; date: string }) => `
### ${l.date}

**${l.lesson}**

${l.context ? `_Context: ${l.context}_` : ''}
`;

	const content = `# Lessons Learned

Total lessons: ${identity.learned.length}

${sortedLessons.length > 0 ? sortedLessons.map(formatLesson).join('\n---\n') : '_No lessons recorded yet_'}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

	await writeFile(`${VIEWS_DIR}/LEARNED.md`, content);
}

/**
 * Generate Challenges view
 */
async function generateChallengesView(identity: Identity): Promise<void> {
	const activeChallenges = identity.challenges.filter((c) => c.status === 'active');
	const resolvedChallenges = identity.challenges.filter((c) => c.status === 'resolved');

	const formatChallenge = (c: (typeof identity.challenges)[number]) => `
### ${c.title}

${c.description}

**Related Goals:** ${c.related_goals.length > 0 ? c.related_goals.join(', ') : 'None'}
`;

	const content = `# Challenges

## Active (${activeChallenges.length})

${activeChallenges.length > 0 ? activeChallenges.map(formatChallenge).join('\n---\n') : '_No active challenges_'}

## Resolved (${resolvedChallenges.length})

${resolvedChallenges.length > 0 ? resolvedChallenges.map(formatChallenge).join('\n---\n') : '_No resolved challenges_'}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

	await writeFile(`${VIEWS_DIR}/CHALLENGES.md`, content);
}
