/**
 * Perspective Tracker - Track and analyze source diversity
 *
 * Monitors the balance of perspectives in news and research,
 * providing warnings when coverage becomes imbalanced.
 */

import { type FeedItem, type ResearchSource, getSourceBias } from './source-types';

// ============================================
// Types
// ============================================

export interface PerspectiveBalance {
	left: number;
	center: number;
	right: number;
	international: number;
	trade: number;
	unknown: number;
}

export interface PerspectiveAnalysis {
	balance: PerspectiveBalance;
	warnings: string[];
	recommendations: string[];
	dominantPerspective: string | null;
	diversityScore: number; // 0-100, higher is more diverse
}

export interface SourceDiversity {
	uniqueSources: number;
	sourceTypes: Record<string, number>;
	biasDistribution: PerspectiveBalance;
	trustScoreRange: { min: number; max: number; avg: number };
}

// ============================================
// Known International Sources
// ============================================

const INTERNATIONAL_SOURCES = new Set([
	'bbc',
	'reuters',
	'afp',
	'al jazeera',
	'france 24',
	'deutsche welle',
	'dw',
	'the guardian',
	'the economist',
	'financial times',
	'nikkei',
	'south china morning post',
]);

/**
 * Check if a source is international
 */
function isInternationalSource(sourceName: string): boolean {
	const nameLower = sourceName.toLowerCase();
	for (const intlSource of INTERNATIONAL_SOURCES) {
		if (nameLower.includes(intlSource)) {
			return true;
		}
	}
	return false;
}

// ============================================
// Perspective Balance Analysis
// ============================================

/**
 * Analyze perspective balance from a list of sources
 */
export function analyzePerspectiveBalance(
	sources: Array<{ name: string; bias?: 'left' | 'center' | 'right' | 'unknown' }>
): PerspectiveBalance {
	const balance: PerspectiveBalance = {
		left: 0,
		center: 0,
		right: 0,
		international: 0,
		trade: 0,
		unknown: 0,
	};

	for (const source of sources) {
		// Check for international
		if (isInternationalSource(source.name)) {
			balance.international++;
		}

		// Check bias
		const bias = source.bias || getSourceBias(source.name);

		switch (bias) {
			case 'left':
				balance.left++;
				break;
			case 'center':
				balance.center++;
				break;
			case 'right':
				balance.right++;
				break;
			default:
				balance.unknown++;
		}
	}

	return balance;
}

/**
 * Analyze perspective balance from feed items
 */
export function analyzeFromFeedItems(items: FeedItem[]): PerspectiveBalance {
	return analyzePerspectiveBalance(
		items.map((item) => ({
			name: item.source,
			bias: undefined, // Will be looked up
		}))
	);
}

/**
 * Analyze perspective balance from research sources
 */
export function analyzeFromResearchSources(sources: ResearchSource[]): PerspectiveBalance {
	return analyzePerspectiveBalance(
		sources.map((source) => ({
			name: source.title,
			bias: undefined,
		}))
	);
}

// ============================================
// Warnings and Recommendations
// ============================================

/**
 * Generate warnings for imbalanced perspectives
 */
export function generatePerspectiveWarnings(balance: PerspectiveBalance): string[] {
	const warnings: string[] = [];
	const total = balance.left + balance.center + balance.right;

	if (total === 0) {
		return ['No sources to analyze for perspective balance'];
	}

	// Check for political leaning imbalance
	const leftRatio = balance.left / total;
	const rightRatio = balance.right / total;
	const centerRatio = balance.center / total;

	if (leftRatio > 0.6) {
		warnings.push(`Coverage skews left-leaning (${Math.round(leftRatio * 100)}% of sources)`);
	}

	if (rightRatio > 0.6) {
		warnings.push(`Coverage skews right-leaning (${Math.round(rightRatio * 100)}% of sources)`);
	}

	if (centerRatio < 0.2 && total > 3) {
		warnings.push('Low representation of centrist/neutral sources');
	}

	// Check for international perspective
	if (balance.international === 0 && total > 3) {
		warnings.push('Missing international perspective');
	}

	// Check for unknown bias
	const unknownRatio = balance.unknown / (total + balance.unknown);
	if (unknownRatio > 0.5) {
		warnings.push(`${Math.round(unknownRatio * 100)}% of sources have unknown bias classification`);
	}

	return warnings;
}

/**
 * Generate recommendations for improving perspective diversity
 */
export function generateDiversityRecommendations(balance: PerspectiveBalance): string[] {
	const recommendations: string[] = [];
	const total = balance.left + balance.center + balance.right;

	if (total === 0) return ['Add diverse news sources to your feeds'];

	const leftRatio = balance.left / total;
	const rightRatio = balance.right / total;

	// Suggest balancing sources
	if (leftRatio > 0.5) {
		recommendations.push('Consider adding center-right sources like WSJ or The Economist');
	}

	if (rightRatio > 0.5) {
		recommendations.push('Consider adding center-left sources like NYT or The Guardian');
	}

	if (balance.international === 0) {
		recommendations.push('Add international sources like BBC, Reuters, or Al Jazeera');
	}

	if (balance.trade === 0 && total > 5) {
		recommendations.push('Consider adding industry-specific trade publications');
	}

	return recommendations;
}

// ============================================
// Comprehensive Analysis
// ============================================

/**
 * Perform comprehensive perspective analysis
 */
export function analyzePerspectives(
	sources: Array<{ name: string; bias?: 'left' | 'center' | 'right' | 'unknown' }>
): PerspectiveAnalysis {
	const balance = analyzePerspectiveBalance(sources);
	const warnings = generatePerspectiveWarnings(balance);
	const recommendations = generateDiversityRecommendations(balance);

	// Calculate diversity score
	const diversityScore = calculateDiversityScore(balance);

	// Determine dominant perspective
	const dominantPerspective = getDominantPerspective(balance);

	return {
		balance,
		warnings,
		recommendations,
		dominantPerspective,
		diversityScore,
	};
}

/**
 * Calculate diversity score (0-100)
 * Higher score means more balanced/diverse coverage
 */
function calculateDiversityScore(balance: PerspectiveBalance): number {
	const political = balance.left + balance.center + balance.right;

	if (political === 0) return 0;

	// Calculate political balance (ideal: 33% each)
	const leftRatio = balance.left / political;
	const centerRatio = balance.center / political;
	const rightRatio = balance.right / political;

	// Calculate deviation from ideal (0.33 each)
	const idealRatio = 1 / 3;
	const deviation =
		Math.abs(leftRatio - idealRatio) +
		Math.abs(centerRatio - idealRatio) +
		Math.abs(rightRatio - idealRatio);

	// Convert deviation to score (lower deviation = higher score)
	// Max deviation is ~1.33 (all in one category)
	const balanceScore = Math.max(0, 100 - deviation * 75);

	// Bonus for international coverage
	const internationalBonus =
		balance.international > 0 ? Math.min(10, balance.international * 3) : 0;

	// Penalty for too many unknown
	const total = political + balance.unknown;
	const unknownPenalty = (balance.unknown / total) * 15;

	return Math.round(Math.max(0, Math.min(100, balanceScore + internationalBonus - unknownPenalty)));
}

/**
 * Get the dominant perspective if one exists
 */
function getDominantPerspective(balance: PerspectiveBalance): string | null {
	const total = balance.left + balance.center + balance.right;

	if (total === 0) return null;

	const leftRatio = balance.left / total;
	const centerRatio = balance.center / total;
	const rightRatio = balance.right / total;

	if (leftRatio > 0.5) return 'left';
	if (rightRatio > 0.5) return 'right';
	if (centerRatio > 0.6) return 'center';

	return null; // Balanced
}

// ============================================
// Source Diversity Analysis
// ============================================

/**
 * Analyze diversity of sources
 */
export function analyzeSourceDiversity(items: FeedItem[]): SourceDiversity {
	const uniqueSources = new Set(items.map((i) => i.source));
	const sourceTypes: Record<string, number> = {};
	const trustScores: number[] = [];

	for (const item of items) {
		// Count source types
		sourceTypes[item.sourceType] = (sourceTypes[item.sourceType] || 0) + 1;

		// Collect trust scores
		trustScores.push(item.trustScore);
	}

	// Calculate trust score stats
	const min = trustScores.length > 0 ? Math.min(...trustScores) : 0;
	const max = trustScores.length > 0 ? Math.max(...trustScores) : 0;
	const avg =
		trustScores.length > 0 ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length : 0;

	return {
		uniqueSources: uniqueSources.size,
		sourceTypes,
		biasDistribution: analyzeFromFeedItems(items),
		trustScoreRange: { min, max, avg },
	};
}

// ============================================
// Output Formatting
// ============================================

/**
 * Format perspective analysis for terminal output
 */
export function formatPerspectiveAnalysis(analysis: PerspectiveAnalysis): string {
	const lines: string[] = [];

	lines.push('');
	lines.push('PERSPECTIVE ANALYSIS');
	lines.push('====================');
	lines.push('');

	// Balance breakdown
	lines.push('Source Balance:');
	lines.push(`  Left-leaning:    ${analysis.balance.left}`);
	lines.push(`  Center/Neutral:  ${analysis.balance.center}`);
	lines.push(`  Right-leaning:   ${analysis.balance.right}`);
	lines.push(`  International:   ${analysis.balance.international}`);
	lines.push(`  Unknown:         ${analysis.balance.unknown}`);
	lines.push('');

	// Diversity score
	const scoreEmoji = analysis.diversityScore >= 70 ? '' : analysis.diversityScore >= 40 ? '' : '';
	lines.push(`Diversity Score: ${scoreEmoji} ${analysis.diversityScore}/100`);

	if (analysis.dominantPerspective) {
		lines.push(`Dominant Perspective: ${analysis.dominantPerspective}`);
	}
	lines.push('');

	// Warnings
	if (analysis.warnings.length > 0) {
		lines.push('Warnings:');
		for (const warning of analysis.warnings) {
			lines.push(`  ${warning}`);
		}
		lines.push('');
	}

	// Recommendations
	if (analysis.recommendations.length > 0) {
		lines.push('Recommendations:');
		for (const rec of analysis.recommendations) {
			lines.push(`  ${rec}`);
		}
	}

	return lines.join('\n');
}
