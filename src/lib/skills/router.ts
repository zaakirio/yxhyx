/**
 * Skill Router - Route inputs to appropriate skills and workflows
 *
 * Matches user input against skill triggers to find the best skill
 * and workflow to handle the request.
 */

import { skillLoader } from './loader';
import type { LoadedSkill, LoadedWorkflow, SkillMatch } from './types';

// ============================================
// Matching Utilities
// ============================================

/**
 * Normalize text for matching (lowercase, trim, collapse whitespace)
 */
function normalizeText(text: string): string {
	return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Calculate confidence score for a pattern match
 */
function calculatePatternConfidence(pattern: string, input: string): number {
	const normalizedPattern = normalizeText(pattern);
	const normalizedInput = normalizeText(input);

	// Exact match
	if (normalizedInput === normalizedPattern) {
		return 1.0;
	}

	// Input starts with pattern
	if (normalizedInput.startsWith(`${normalizedPattern} `)) {
		return 0.95;
	}

	// Pattern is contained in input
	if (normalizedInput.includes(normalizedPattern)) {
		// Higher confidence if pattern is at word boundaries
		const regex = new RegExp(`\\b${escapeRegex(normalizedPattern)}\\b`);
		if (regex.test(normalizedInput)) {
			return 0.85;
		}
		return 0.7;
	}

	return 0;
}

/**
 * Calculate confidence score for a keyword match
 */
function calculateKeywordConfidence(keyword: string, input: string): number {
	const normalizedKeyword = normalizeText(keyword);
	const normalizedInput = normalizeText(input);
	const words = normalizedInput.split(' ');

	// Exact word match
	if (words.includes(normalizedKeyword)) {
		return 0.8;
	}

	// Word starts with keyword
	if (words.some((word) => word.startsWith(normalizedKeyword))) {
		return 0.6;
	}

	// Keyword substring match
	if (normalizedInput.includes(normalizedKeyword)) {
		return 0.4;
	}

	return 0;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// Workflow Selection
// ============================================

/**
 * Find the best workflow for a skill based on input
 */
function selectWorkflow(skill: LoadedSkill, input: string): { name: string; confidence: number } {
	const normalizedInput = normalizeText(input);
	let bestMatch = { name: '', confidence: 0 };

	for (const [name, workflow] of skill.workflows) {
		// Check workflow-specific triggers
		if (workflow.definition.triggers) {
			for (const trigger of workflow.definition.triggers) {
				const confidence = calculatePatternConfidence(trigger, normalizedInput);
				if (confidence > bestMatch.confidence) {
					bestMatch = { name, confidence };
				}
			}
		}
	}

	// If no workflow trigger matched, use default
	if (bestMatch.confidence === 0) {
		const defaultWorkflow = skillLoader.getDefaultWorkflow(skill);
		if (defaultWorkflow) {
			return { name: defaultWorkflow.name, confidence: 0.5 };
		}

		// Fall back to first workflow
		const firstWorkflow = skill.workflows.keys().next();
		if (!firstWorkflow.done) {
			return { name: firstWorkflow.value, confidence: 0.3 };
		}
	}

	return bestMatch;
}

// ============================================
// Skill Router Class
// ============================================

export class SkillRouter {
	/**
	 * Find the best skill to handle an input
	 *
	 * @param input - User input to match
	 * @param options - Routing options
	 * @returns Best matching skill and workflow, or null if no match
	 */
	async route(
		input: string,
		options: {
			/** Minimum confidence threshold (0-1) */
			minConfidence?: number;
			/** Skills to exclude from matching */
			exclude?: string[];
			/** Only match these skills */
			include?: string[];
		} = {}
	): Promise<SkillMatch | null> {
		const { minConfidence = 0.3, exclude = [], include } = options;

		const skills = await skillLoader.getAllSkills();
		let bestMatch: SkillMatch | null = null;

		for (const skill of skills) {
			// Skip excluded skills
			if (exclude.includes(skill.definition.name)) continue;

			// Skip if not in include list (when specified)
			if (include && !include.includes(skill.definition.name)) continue;

			// Skip skills that aren't ready (missing env vars)
			if (!skill.isReady) continue;

			// Try to match this skill
			const match = this.matchSkill(skill, input);

			if (match && match.confidence >= minConfidence) {
				if (!bestMatch || match.confidence > bestMatch.confidence) {
					bestMatch = match;
				}
			}
		}

		return bestMatch;
	}

	/**
	 * Try to match a single skill against input
	 */
	private matchSkill(skill: LoadedSkill, input: string): SkillMatch | null {
		const normalizedInput = normalizeText(input);
		let bestConfidence = 0;
		let matchType: SkillMatch['matchType'] = 'default';
		let matchedTrigger: string | undefined;

		const triggers = skill.definition.triggers;

		// Check patterns (higher priority)
		for (const pattern of triggers.patterns) {
			const confidence = calculatePatternConfidence(pattern, normalizedInput);
			if (confidence > bestConfidence) {
				bestConfidence = confidence;
				matchType = confidence === 1.0 ? 'exact' : 'pattern';
				matchedTrigger = pattern;
			}
		}

		// Check keywords
		for (const keyword of triggers.keywords) {
			const confidence = calculateKeywordConfidence(keyword, normalizedInput);
			if (confidence > bestConfidence) {
				bestConfidence = confidence;
				matchType = 'keyword';
				matchedTrigger = keyword;
			}
		}

		// If no trigger matched, no match
		if (bestConfidence === 0) {
			return null;
		}

		// Select the best workflow
		const { name: workflowName, confidence: workflowConfidence } = selectWorkflow(skill, input);

		// Adjust confidence based on workflow match
		const finalConfidence = bestConfidence * (0.5 + workflowConfidence * 0.5);

		return {
			skill,
			workflow: workflowName,
			confidence: finalConfidence,
			matchType,
			matchedTrigger,
		};
	}

	/**
	 * Find all skills that could handle an input
	 *
	 * @param input - User input to match
	 * @param limit - Maximum number of matches to return
	 * @returns Array of matches sorted by confidence (highest first)
	 */
	async findAllMatches(input: string, limit = 5): Promise<SkillMatch[]> {
		const skills = await skillLoader.getAllSkills();
		const matches: SkillMatch[] = [];

		for (const skill of skills) {
			if (!skill.isReady) continue;

			const match = this.matchSkill(skill, input);
			if (match) {
				matches.push(match);
			}
		}

		// Sort by confidence (highest first)
		matches.sort((a, b) => b.confidence - a.confidence);

		return matches.slice(0, limit);
	}

	/**
	 * Force route to a specific skill
	 *
	 * @param skillName - Name of the skill to route to
	 * @param input - User input
	 * @param workflowName - Optional specific workflow
	 * @returns Skill match or null if skill not found
	 */
	async forceRoute(
		skillName: string,
		_input: string,
		workflowName?: string
	): Promise<SkillMatch | null> {
		const skill = await skillLoader.getSkill(skillName);
		if (!skill) return null;

		// Get specified workflow or default
		let workflow: LoadedWorkflow | null;
		if (workflowName) {
			workflow = skillLoader.getWorkflow(skill, workflowName);
		} else {
			workflow = skillLoader.getDefaultWorkflow(skill);
		}

		if (!workflow) return null;

		return {
			skill,
			workflow: workflow.name,
			confidence: 1.0,
			matchType: 'exact',
		};
	}

	/**
	 * Check if an input matches any skill
	 */
	async hasMatch(input: string, minConfidence = 0.3): Promise<boolean> {
		const match = await this.route(input, { minConfidence });
		return match !== null;
	}

	/**
	 * Get suggested skills for an input that didn't match
	 *
	 * Returns skills that partially match or might be relevant
	 */
	async getSuggestions(input: string, limit = 3): Promise<SkillMatch[]> {
		return this.findAllMatches(input, limit);
	}
}

// ============================================
// Singleton Export
// ============================================

export const skillRouter = new SkillRouter();
