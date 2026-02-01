/**
 * Complexity Classification - Determine task complexity for model routing
 *
 * Classifies tasks into complexity levels to route to the cheapest capable model.
 */

export type Complexity = 'TRIVIAL' | 'QUICK' | 'STANDARD' | 'COMPLEX' | 'CRITICAL';

export interface ComplexityIndicators {
	requiresReasoning: boolean;
	requiresCodeGen: boolean;
	requiresAnalysis: boolean;
	requiresCreativity: boolean;
	contextLength: number; // estimated tokens
	outputLength: 'short' | 'medium' | 'long';
	accuracyCritical: boolean;
	securitySensitive: boolean;
}

/**
 * Classify complexity based on indicators
 */
export function classifyComplexity(
	task: string,
	indicators?: Partial<ComplexityIndicators>
): Complexity {
	const defaults: ComplexityIndicators = {
		requiresReasoning: false,
		requiresCodeGen: false,
		requiresAnalysis: false,
		requiresCreativity: false,
		contextLength: Math.ceil(task.length / 4), // rough token estimate
		outputLength: 'medium',
		accuracyCritical: false,
		securitySensitive: false,
	};

	const ind = { ...defaults, ...indicators };

	// CRITICAL: Security-sensitive or accuracy-critical tasks
	if (ind.securitySensitive || ind.accuracyCritical) {
		return 'CRITICAL';
	}

	// COMPLEX: Multiple advanced requirements
	const advancedRequirements = [
		ind.requiresReasoning,
		ind.requiresCodeGen,
		ind.requiresAnalysis,
		ind.requiresCreativity,
	].filter(Boolean).length;

	if (advancedRequirements >= 2 || ind.outputLength === 'long') {
		return 'COMPLEX';
	}

	// STANDARD: Single advanced requirement or medium output
	if (advancedRequirements === 1 || ind.outputLength === 'medium') {
		return 'STANDARD';
	}

	// QUICK: Short context, short output
	if (ind.contextLength < 500) {
		return 'QUICK';
	}

	// TRIVIAL: Very simple
	return 'TRIVIAL';
}

/**
 * Pattern-based classification for common task types
 */
export function classifyByPattern(task: string): Complexity {
	const lowerTask = task.toLowerCase().trim();

	// TRIVIAL patterns - greetings, confirmations
	if (
		/^(hi|hello|hey|thanks|thank you|yes|no|ok|okay|sure|cool|great|bye|goodbye)$/i.test(lowerTask)
	) {
		return 'TRIVIAL';
	}

	// QUICK patterns - simple lookups, definitions
	const quickPatterns = [
		/^what (is|are|was|were) /,
		/^define /,
		/^who (is|was) /,
		/^when (did|was|is) /,
		/^where (is|was|are) /,
		/^how many /,
		/^summarize /,
		/^translate /,
		/^format /,
	];
	if (quickPatterns.some((p) => p.test(lowerTask)) || task.length < 50) {
		return 'QUICK';
	}

	// COMPLEX patterns - creation, implementation
	const complexPatterns = [
		/\bimplement\b/,
		/\bcreate a\b/,
		/\bdesign\b/,
		/\brefactor\b/,
		/\banalyze\b/,
		/\bcompare\b/,
		/\bwrite (a|an|the) (function|class|component|module|script)/,
		/\bbuild\b/,
		/\barchitect\b/,
	];
	if (complexPatterns.some((p) => p.test(lowerTask))) {
		return 'COMPLEX';
	}

	// CRITICAL patterns - security, production, sensitive
	const criticalPatterns = [
		/\bsecurity\b/,
		/\bauthentication\b/,
		/\bauthorization\b/,
		/\bproduction\b/,
		/\bdeploy\b/,
		/\bcritical\b/,
		/\bvulnerability\b/,
		/\bprivate key\b/,
		/\bsecret\b/,
		/\bcredential/,
		/\bpassword\b/,
	];
	if (criticalPatterns.some((p) => p.test(lowerTask))) {
		return 'CRITICAL';
	}

	// Default to STANDARD
	return 'STANDARD';
}

/**
 * Combine pattern and indicator-based classification
 * Returns the higher complexity level
 */
export function classify(task: string, indicators?: Partial<ComplexityIndicators>): Complexity {
	const patternResult = classifyByPattern(task);
	const indicatorResult = classifyComplexity(task, indicators);

	const order: Complexity[] = ['TRIVIAL', 'QUICK', 'STANDARD', 'COMPLEX', 'CRITICAL'];
	const patternIndex = order.indexOf(patternResult);
	const indicatorIndex = order.indexOf(indicatorResult);

	return order[Math.max(patternIndex, indicatorIndex)];
}

/**
 * Get estimated cost multiplier for complexity level
 */
export function getCostMultiplier(complexity: Complexity): number {
	const multipliers: Record<Complexity, number> = {
		TRIVIAL: 1,
		QUICK: 1,
		STANDARD: 10,
		COMPLEX: 50,
		CRITICAL: 100,
	};
	return multipliers[complexity];
}
