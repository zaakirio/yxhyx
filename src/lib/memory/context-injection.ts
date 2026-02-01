/**
 * Context Injection - Enhances AI prompts with memory context
 *
 * KEY INNOVATION: Actually use captured learnings by injecting them into prompts.
 *
 * This module builds enhanced context that includes:
 * - User identity (from identity.yaml)
 * - Relevant past learnings (keyword-matched)
 * - Current work context
 * - Recent check-in state
 *
 * The result is AI interactions that learn from past experiences.
 */

import { stringify } from 'yaml';
import {
	type TaskType,
	getActiveChallenges,
	getActiveGoals,
	getActiveProjects,
	loadIdentity,
} from '../context-loader';
import { retrieveRelevantLearnings } from './learning-manager';
import { stateManager } from './state-manager';
import { workManager } from './work-manager';

/**
 * Context options for building enhanced context
 */
export interface ContextOptions {
	/** Maximum learnings to include */
	maxLearnings?: number;
	/** Include current work context */
	includeWork?: boolean;
	/** Include check-in state */
	includeCheckinState?: boolean;
	/** Include full goals list */
	includeFullGoals?: boolean;
	/** Custom context additions */
	customContext?: Record<string, unknown>;
}

/**
 * Enhanced context result
 */
export interface EnhancedContext {
	/** The formatted context string */
	text: string;
	/** Metadata about what was included */
	metadata: {
		learningsIncluded: number;
		hasCurrentWork: boolean;
		hasCheckinState: boolean;
		identityLoaded: boolean;
	};
}

/**
 * Build enhanced context for AI interactions
 *
 * This is the main function that combines:
 * - Identity context (name, preferences, etc.)
 * - Task-specific context (goals for check-in, interests for news, etc.)
 * - Relevant learnings from past interactions
 * - Current work context
 *
 * @param prompt - The current user prompt/task
 * @param taskType - Type of task (chat, checkin, news, research, project)
 * @param options - Additional options
 */
export async function buildEnhancedContext(
	prompt: string,
	taskType: TaskType = 'chat',
	options: ContextOptions = {}
): Promise<EnhancedContext> {
	const {
		maxLearnings = 3,
		includeWork = true,
		includeCheckinState = true,
		includeFullGoals = false,
		customContext = {},
	} = options;

	const metadata = {
		learningsIncluded: 0,
		hasCurrentWork: false,
		hasCheckinState: false,
		identityLoaded: false,
	};

	const sections: string[] = [];

	// ============================================
	// Identity Context
	// ============================================

	try {
		const identity = await loadIdentity();
		metadata.identityLoaded = true;

		// Base context - always included
		const baseContext: Record<string, unknown> = {
			name: identity.about.name,
			timezone: identity.about.timezone,
			communication: identity.preferences.communication,
		};

		// Task-specific context
		switch (taskType) {
			case 'chat':
				baseContext.background = identity.about.background;
				baseContext.expertise = identity.about.expertise;
				baseContext.recent_lessons = identity.learned.slice(-3);
				break;

			case 'checkin':
				if (includeFullGoals) {
					baseContext.goals = identity.goals;
				} else {
					const activeGoals = await getActiveGoals();
					baseContext.active_goals = activeGoals.slice(0, 5).map((g) => ({
						title: g.title,
						progress: `${Math.round(g.progress * 100)}%`,
						deadline: g.deadline,
					}));
				}
				baseContext.active_projects = (await getActiveProjects()).map((p) => p.name);
				baseContext.challenges = (await getActiveChallenges()).map((c) => c.title);
				break;

			case 'news':
				baseContext.interests = identity.interests;
				baseContext.news_preferences = identity.preferences.news;
				break;

			case 'research':
				baseContext.expertise = identity.about.expertise;
				baseContext.high_priority_interests = identity.interests.high_priority;
				break;

			case 'project':
				baseContext.tech_preferences = identity.preferences.tech_stack;
				baseContext.active_projects = (await getActiveProjects()).slice(0, 3);
				break;
		}

		// Add custom context
		Object.assign(baseContext, customContext);

		sections.push(`<user_context>\n${stringify(baseContext)}</user_context>`);
	} catch {
		// Identity not loaded - continue without it
		sections.push('<!-- User identity not available -->');
	}

	// ============================================
	// Relevant Learnings
	// ============================================

	if (maxLearnings > 0) {
		const learnings = await retrieveRelevantLearnings(prompt, maxLearnings);
		metadata.learningsIncluded = learnings.length;

		if (learnings.length > 0) {
			const learningLines = learnings.map((l) => {
				const prefix = l.type === 'failure' ? 'AVOID' : l.type === 'success' ? 'REPLICATE' : 'NOTE';
				return `- [${prefix}] ${l.lesson}`;
			});

			sections.push(
				`<relevant_learnings>\nFrom past interactions, remember:\n${learningLines.join('\n')}\n</relevant_learnings>`
			);
		}
	}

	// ============================================
	// Current Work Context
	// ============================================

	if (includeWork) {
		const currentWork = await workManager.getCurrentWork();
		if (currentWork) {
			metadata.hasCurrentWork = true;

			const workContext = {
				work_id: currentWork.id,
				started: currentWork.started,
				items_so_far: currentWork.item_count,
			};

			sections.push(`<current_work>\n${stringify(workContext)}</current_work>`);
		}
	}

	// ============================================
	// Check-in State
	// ============================================

	if (includeCheckinState) {
		const state = await stateManager.getState();
		if (state.last_checkin) {
			metadata.hasCheckinState = true;

			const lastCheckin = await stateManager.getLastCheckin(state.last_checkin.type);
			if (lastCheckin) {
				const checkinContext = {
					last_checkin_type: lastCheckin.type,
					when: new Date(lastCheckin.timestamp).toLocaleString(),
					mood: lastCheckin.mood,
					action_items: lastCheckin.action_items?.slice(0, 3),
				};

				sections.push(`<recent_checkin>\n${stringify(checkinContext)}</recent_checkin>`);
			}
		}
	}

	// ============================================
	// Build Final Context
	// ============================================

	const text = sections.join('\n\n');

	return { text, metadata };
}

/**
 * Format context for system prompt injection
 *
 * Wraps the enhanced context with instructions for the AI.
 */
export async function formatContextForSystemPrompt(
	prompt: string,
	taskType: TaskType = 'chat',
	options: ContextOptions = {}
): Promise<string> {
	const { text, metadata } = await buildEnhancedContext(prompt, taskType, options);

	const instructions: string[] = [];

	if (metadata.identityLoaded) {
		instructions.push('Use the user context to personalize your response.');
		instructions.push('Reference the user by name when appropriate.');
		instructions.push('Respect their communication preferences.');
	}

	if (metadata.learningsIncluded > 0) {
		instructions.push(
			'Apply the relevant learnings - avoid past mistakes and replicate successful patterns.'
		);
	}

	if (metadata.hasCurrentWork) {
		instructions.push('Acknowledge the ongoing work context when relevant.');
	}

	return `${text}

${instructions.length > 0 ? `<instructions>\n${instructions.join('\n')}\n</instructions>` : ''}`;
}

/**
 * Build minimal context for quick interactions
 *
 * Lighter version for trivial/quick tasks that don't need full context.
 */
export async function buildMinimalContext(): Promise<string> {
	try {
		const identity = await loadIdentity();
		return `User: ${identity.about.name}
Communication style: ${identity.preferences.communication.style}, ${identity.preferences.communication.length}`;
	} catch {
		return '';
	}
}

/**
 * Build check-in specific context
 *
 * Enhanced context specifically for morning/evening/weekly check-ins.
 */
export async function buildCheckinContext(
	checkinType: 'morning' | 'evening' | 'weekly'
): Promise<string> {
	const sections: string[] = [];

	try {
		const identity = await loadIdentity();
		const activeGoals = await getActiveGoals();
		const activeProjects = await getActiveProjects();
		const challenges = await getActiveChallenges();

		// User info
		sections.push(`Checking in with: ${identity.about.name}`);
		sections.push(`Time zone: ${identity.about.timezone}`);
		sections.push('');

		// Goals
		if (activeGoals.length > 0) {
			sections.push('## Active Goals');
			for (const goal of activeGoals.slice(0, 5)) {
				const progress = Math.round(goal.progress * 100);
				const deadline = goal.deadline ? ` (due: ${goal.deadline})` : '';
				sections.push(`- ${goal.title}: ${progress}% complete${deadline}`);
			}
			sections.push('');
		}

		// Projects
		if (activeProjects.length > 0) {
			sections.push('## Active Projects');
			for (const project of activeProjects.slice(0, 3)) {
				sections.push(`- ${project.name}: ${project.description}`);
				if (project.next_actions && project.next_actions.length > 0) {
					sections.push(`  Next: ${project.next_actions[0]}`);
				}
			}
			sections.push('');
		}

		// Challenges
		if (challenges.length > 0) {
			sections.push('## Current Challenges');
			for (const challenge of challenges) {
				sections.push(`- ${challenge.title}`);
			}
			sections.push('');
		}

		// Last check-in of same type
		const lastCheckin = await stateManager.getLastCheckin(checkinType);
		if (lastCheckin) {
			const daysSince = Math.floor(
				(Date.now() - new Date(lastCheckin.timestamp).getTime()) / (1000 * 60 * 60 * 24)
			);
			sections.push(`## Previous ${checkinType} check-in`);
			sections.push(`${daysSince} day(s) ago`);
			if (lastCheckin.action_items && lastCheckin.action_items.length > 0) {
				sections.push('Action items from last time:');
				for (const item of lastCheckin.action_items) {
					sections.push(`- ${item}`);
				}
			}
		}

		// Type-specific additions
		if (checkinType === 'morning') {
			sections.push('');
			sections.push('Focus areas for today: planning, prioritization, energy management');
		} else if (checkinType === 'evening') {
			sections.push('');
			sections.push('Focus areas: reflection, accomplishments, tomorrow preparation');
		} else if (checkinType === 'weekly') {
			sections.push('');
			sections.push('Focus areas: progress review, goal adjustment, pattern recognition');

			// Get rating stats for the week
			const stats = await (await import('./learning-manager')).learningManager.getRatingStats(7);
			if (stats.total > 0) {
				sections.push(
					`Week stats: ${stats.total} interactions, avg rating ${stats.average.toFixed(1)}/10`
				);
			}
		}
	} catch {
		sections.push('Unable to load full context. Proceeding with basic check-in.');
	}

	return sections.join('\n');
}

/**
 * Build research context
 *
 * Context specifically for research tasks, including interests and expertise.
 */
export async function buildResearchContext(topic: string): Promise<string> {
	const sections: string[] = [];

	try {
		const identity = await loadIdentity();

		sections.push(`## Research Context for ${identity.about.name}`);
		sections.push('');

		// Expertise
		if (identity.about.expertise.length > 0) {
			sections.push(`Expertise areas: ${identity.about.expertise.join(', ')}`);
		}

		// Check if topic relates to interests
		const allInterests = [
			...identity.interests.high_priority,
			...identity.interests.medium_priority,
			...identity.interests.low_priority,
		];

		const relevantInterests = allInterests.filter(
			(i) =>
				topic.toLowerCase().includes(i.topic.toLowerCase()) ||
				i.subtopics.some((s) => topic.toLowerCase().includes(s.toLowerCase()))
		);

		if (relevantInterests.length > 0) {
			sections.push('');
			sections.push('Relevant interests:');
			for (const interest of relevantInterests) {
				sections.push(`- ${interest.topic}: ${interest.subtopics.join(', ')}`);
			}
		}

		// Related learnings
		const learnings = await retrieveRelevantLearnings(topic, 3);
		if (learnings.length > 0) {
			sections.push('');
			sections.push('Related learnings:');
			for (const learning of learnings) {
				sections.push(`- ${learning.lesson}`);
			}
		}
	} catch {
		sections.push('Research context unavailable.');
	}

	return sections.join('\n');
}

// Export default builder
export default buildEnhancedContext;
