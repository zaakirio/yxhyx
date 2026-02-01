/**
 * Context Injection - Build enhanced context with learnings
 *
 * The key innovation: automatically inject relevant learnings into AI context.
 * This makes past learnings actually useful by surfacing them at decision time.
 */

import { loadIdentity } from '../context-loader';
import { retrieveRelevantLearnings } from './learning-manager';
import { workManager } from './work-manager';

// ============================================
// Types
// ============================================

export type TaskType = 'chat' | 'checkin' | 'news' | 'research' | 'project';

// ============================================
// Context Building
// ============================================

/**
 * Build enhanced context with learnings for AI interactions
 *
 * This is where the magic happens - we take the user's identity,
 * find relevant past learnings, and inject them into the context.
 */
export async function buildEnhancedContext(prompt: string, taskType: TaskType): Promise<string> {
	// Get identity context
	const identity = await loadIdentity();

	// Get relevant past learnings
	const learnings = await retrieveRelevantLearnings(prompt, 3);

	// Get current work context
	const currentWork = await workManager.getCurrentWork();

	// Build the context string
	const sections: string[] = [];

	// User context section
	sections.push('<user_context>');
	sections.push(`Name: ${identity.about.name}`);
	sections.push(
		`Communication: ${identity.preferences.communication.style}, ${identity.preferences.communication.length}`
	);

	// Add task-specific context
	switch (taskType) {
		case 'checkin': {
			const activeGoals = [...identity.goals.short_term, ...identity.goals.medium_term].filter(
				(g) => g.progress < 1
			);

			sections.push('');
			sections.push('Active Goals:');
			for (const goal of activeGoals.slice(0, 5)) {
				sections.push(`- ${goal.title} (${Math.round(goal.progress * 100)}%)`);
			}

			const activeProjects = identity.projects.filter((p) => p.status === 'active');
			if (activeProjects.length > 0) {
				sections.push('');
				sections.push('Active Projects:');
				for (const project of activeProjects) {
					sections.push(`- ${project.name}`);
				}
			}
			break;
		}

		case 'news': {
			sections.push('');
			sections.push('Interests:');
			for (const interest of identity.interests.high_priority) {
				sections.push(`- ${interest.topic}`);
			}

			if (identity.preferences.news) {
				sections.push('');
				sections.push(`News Preferences: Format=${identity.preferences.news.format}`);
			}
			break;
		}

		case 'research': {
			sections.push('');
			sections.push('Expertise:');
			for (const exp of identity.about.expertise.slice(0, 5)) {
				sections.push(`- ${exp}`);
			}

			sections.push('');
			sections.push('High Priority Interests:');
			for (const interest of identity.interests.high_priority) {
				sections.push(`- ${interest.topic}`);
			}
			break;
		}

		case 'project': {
			if (identity.preferences.tech_stack) {
				sections.push('');
				sections.push('Preferred Tech Stack:');
				const stack = identity.preferences.tech_stack;
				if (stack.languages && stack.languages.length > 0) {
					sections.push(`  Languages: ${stack.languages.join(', ')}`);
				}
				if (stack.frameworks && stack.frameworks.length > 0) {
					sections.push(`  Frameworks: ${stack.frameworks.join(', ')}`);
				}
				if (stack.package_manager) {
					sections.push(`  Package Manager: ${stack.package_manager}`);
				}
			}

			const activeProjects = identity.projects.filter((p) => p.status === 'active');
			if (activeProjects.length > 0) {
				sections.push('');
				sections.push('Active Projects:');
				for (const project of activeProjects) {
					sections.push(`- ${project.name}`);
				}
			}
			break;
		}
		default: {
			// Include background for general chat
			if (identity.about.background) {
				sections.push('');
				sections.push(`Background: ${identity.about.background}`);
			}

			// Include recent lessons
			const recentLessons = identity.learned.slice(-3);
			if (recentLessons.length > 0) {
				sections.push('');
				sections.push('Recent Lessons:');
				for (const lesson of recentLessons) {
					sections.push(`- ${lesson.lesson}`);
				}
			}
			break;
		}
	}

	sections.push('</user_context>');

	// Add learnings section if we have any
	if (learnings.length > 0) {
		sections.push('');
		sections.push('<relevant_learnings>');
		sections.push('From past interactions, remember:');
		for (const learning of learnings) {
			sections.push(`- ${learning.lesson}`);
		}
		sections.push('</relevant_learnings>');
	}

	// Add current work context if any
	if (currentWork) {
		sections.push('');
		sections.push('<current_work>');
		sections.push(`Continuing work: ${currentWork.id}`);
		sections.push('</current_work>');
	}

	return sections.join('\n');
}

/**
 * Build a system prompt with user context
 */
export async function buildSystemPrompt(taskType: TaskType, basePrompt?: string): Promise<string> {
	const identity = await loadIdentity();
	const context = await buildEnhancedContext('', taskType);

	const systemPrompt = basePrompt || 'You are a helpful AI assistant.';

	return `${systemPrompt}

${context}

Use this context to personalize your response. Reference the user by name (${identity.about.name}).
Align suggestions with their goals and interests.
Respect their communication preferences (${identity.preferences.communication.style}, ${identity.preferences.communication.length}).
`;
}

/**
 * Build a minimal context (for cost-sensitive calls)
 */
export async function buildMinimalContext(): Promise<string> {
	const identity = await loadIdentity();

	return `
<user>
Name: ${identity.about.name}
Style: ${identity.preferences.communication.style}
</user>
`.trim();
}
