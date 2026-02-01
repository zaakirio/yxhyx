/**
 * Check-In Templates - Build prompts for different check-in types
 *
 * Each check-in type has a specific purpose and structure:
 * - Morning: Plan the day, set intentions
 * - Evening: Reflect on accomplishments, capture learnings
 * - Weekly: Comprehensive progress review
 */

import {
	getActiveChallenges,
	getActiveGoals,
	getActiveProjects,
	loadIdentity,
} from '../context-loader';
import { getCheckinHistory, getWeekStart, isToday, isYesterday } from '../memory/state-manager';

// ============================================
// Types
// ============================================

export interface CheckinPrompt {
	type: 'morning' | 'evening' | 'weekly';
	greeting: string;
	context: string;
	questions: string[];
	followUp?: string;
}

// ============================================
// Morning Check-In
// ============================================

/**
 * Build morning check-in prompt
 *
 * Focus: Plan the day, set intentions aligned with goals
 */
export async function buildMorningPrompt(): Promise<CheckinPrompt> {
	const identity = await loadIdentity();
	const history = await getCheckinHistory(7);

	// Get active goals
	const activeGoals = await getActiveGoals();

	// Get yesterday's evening check-in if exists
	const yesterday = history.find((h) => h.type === 'evening' && isYesterday(new Date(h.timestamp)));

	// Get active projects
	const activeProjects = await getActiveProjects();

	// Build context
	const contextParts: string[] = [];

	contextParts.push('**Your Active Goals:**');
	if (activeGoals.length > 0) {
		for (const goal of activeGoals.slice(0, 5)) {
			contextParts.push(`- ${goal.title} (${Math.round(goal.progress * 100)}%)`);
		}
		if (activeGoals.length > 5) {
			contextParts.push(`- ... and ${activeGoals.length - 5} more`);
		}
	} else {
		contextParts.push('- No active goals set');
	}

	contextParts.push('');
	contextParts.push('**Active Projects:**');
	if (activeProjects.length > 0) {
		for (const project of activeProjects) {
			contextParts.push(`- ${project.name}`);
		}
	} else {
		contextParts.push('- No active projects');
	}

	if (yesterday) {
		contextParts.push('');
		contextParts.push('**Yesterday you accomplished:**');
		if (yesterday.accomplishments && yesterday.accomplishments.length > 0) {
			for (const a of yesterday.accomplishments) {
				contextParts.push(`- ${a}`);
			}
		} else {
			contextParts.push('- Not recorded');
		}
	}

	return {
		type: 'morning',
		greeting: `Good morning, ${identity.about.name}!`,
		context: contextParts.join('\n'),
		questions: [
			'What are your top 1-3 priorities for today?',
			'Any blockers or challenges you anticipate?',
			'What would make today a success?',
		],
	};
}

// ============================================
// Evening Check-In
// ============================================

/**
 * Build evening check-in prompt
 *
 * Focus: Reflect on accomplishments, capture learnings, note progress
 */
export async function buildEveningPrompt(): Promise<CheckinPrompt> {
	const identity = await loadIdentity();
	const history = await getCheckinHistory(7);

	// Get this morning's check-in
	const thisMorning = history.find((h) => h.type === 'morning' && isToday(new Date(h.timestamp)));

	// Get active goals
	const activeGoals = await getActiveGoals();

	// Build context
	const contextParts: string[] = [];

	if (thisMorning) {
		contextParts.push("**This morning's priorities:**");
		if (thisMorning.priorities && thisMorning.priorities.length > 0) {
			for (const p of thisMorning.priorities) {
				contextParts.push(`- ${p}`);
			}
		} else {
			contextParts.push('- Not recorded');
		}
		contextParts.push('');
	}

	contextParts.push('**Your Active Goals:**');
	if (activeGoals.length > 0) {
		for (const goal of activeGoals.slice(0, 5)) {
			contextParts.push(`- ${goal.title} (${Math.round(goal.progress * 100)}%)`);
		}
	} else {
		contextParts.push('- No active goals set');
	}

	return {
		type: 'evening',
		greeting: `Good evening, ${identity.about.name}.`,
		context: contextParts.join('\n'),
		questions: [
			'What did you accomplish today?',
			'Did anything not go as planned?',
			'What did you learn today?',
			'Any progress on your goals to record?',
		],
	};
}

// ============================================
// Weekly Check-In
// ============================================

/**
 * Build weekly check-in prompt
 *
 * Focus: Comprehensive review, goal adjustments, next week planning
 */
export async function buildWeeklyPrompt(): Promise<CheckinPrompt> {
	const identity = await loadIdentity();
	const history = await getCheckinHistory(30);

	// Get this week's check-ins
	const weekStart = getWeekStart(new Date());
	const thisWeek = history.filter((h) => new Date(h.timestamp) >= weekStart);

	// Calculate week stats
	const mornings = thisWeek.filter((h) => h.type === 'morning').length;
	const evenings = thisWeek.filter((h) => h.type === 'evening').length;
	const accomplishments = thisWeek
		.filter((h) => h.type === 'evening')
		.flatMap((h) => h.accomplishments || []);

	// Get all goals with term info
	const allGoals = [
		...identity.goals.short_term.map((g) => ({ ...g, term: 'short' as const })),
		...identity.goals.medium_term.map((g) => ({ ...g, term: 'medium' as const })),
		...identity.goals.long_term.map((g) => ({ ...g, term: 'long' as const })),
	];

	// Get active projects
	const activeProjects = await getActiveProjects();

	// Get active challenges
	const activeChallenges = await getActiveChallenges();

	// Build context
	const contextParts: string[] = [];

	contextParts.push('**Week Stats:**');
	contextParts.push(`- Morning check-ins: ${mornings}/7`);
	contextParts.push(`- Evening check-ins: ${evenings}/7`);
	contextParts.push(`- Total accomplishments logged: ${accomplishments.length}`);

	contextParts.push('');
	contextParts.push("**This Week's Accomplishments:**");
	if (accomplishments.length > 0) {
		for (const a of accomplishments.slice(0, 10)) {
			contextParts.push(`- ${a}`);
		}
		if (accomplishments.length > 10) {
			contextParts.push(`- ... and ${accomplishments.length - 10} more`);
		}
	} else {
		contextParts.push('- None recorded');
	}

	contextParts.push('');
	contextParts.push('**Goal Progress:**');
	for (const goal of allGoals) {
		contextParts.push(`- [${goal.term}] ${goal.title}: ${Math.round(goal.progress * 100)}%`);
	}

	contextParts.push('');
	contextParts.push('**Active Projects:**');
	if (activeProjects.length > 0) {
		for (const project of activeProjects) {
			contextParts.push(`- ${project.name}`);
		}
	} else {
		contextParts.push('- None');
	}

	contextParts.push('');
	contextParts.push('**Current Challenges:**');
	if (activeChallenges.length > 0) {
		for (const challenge of activeChallenges) {
			contextParts.push(`- ${challenge.title}`);
		}
	} else {
		contextParts.push('- None recorded');
	}

	return {
		type: 'weekly',
		greeting: `Weekly Review - ${identity.about.name}`,
		context: contextParts.join('\n'),
		questions: [
			'What was your biggest win this week?',
			"What didn't go as planned?",
			'Any goals that need updating (progress or scope)?',
			"What's your focus for next week?",
			'Any new challenges or blockers to add?',
		],
	};
}
