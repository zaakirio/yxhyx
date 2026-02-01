/**
 * Source Types - News source categorization and trust scoring
 *
 * Defines source categories with associated trust scores for
 * news aggregation and content curation.
 */

import { z } from 'zod';

// ============================================
// Source Categories
// ============================================

/**
 * Source category types with descriptions:
 * - wire: AP, Reuters, AFP - highest factual reliability
 * - major: NYT, WSJ, BBC - good for analysis
 * - trade: TechCrunch, industry pubs - domain expertise
 * - newsletter: tl;dr sec, TLDR - curated summaries
 * - aggregator: HN, Reddit - fast, needs verification
 * - analysis: Schneier, Krebs - expert opinion
 * - investigative: Deep research journalism
 * - social: Twitter/X - sentiment, speed, low reliability
 */
export type SourceCategory =
	| 'wire'
	| 'major'
	| 'trade'
	| 'newsletter'
	| 'aggregator'
	| 'analysis'
	| 'investigative'
	| 'social';

export const SourceCategorySchema = z.enum([
	'wire',
	'major',
	'trade',
	'newsletter',
	'aggregator',
	'analysis',
	'investigative',
	'social',
]);

// ============================================
// Trust Scores
// ============================================

/**
 * Trust scores by source category (0-1 scale)
 * Higher score = more reliable/trustworthy source
 */
export const SOURCE_TRUST_SCORES: Record<SourceCategory, number> = {
	wire: 0.95, // Wire services: AP, Reuters, AFP
	major: 0.85, // Major outlets: NYT, WSJ, BBC
	investigative: 0.85, // Investigative journalism
	analysis: 0.8, // Expert analysis/opinion
	trade: 0.75, // Trade/industry publications
	newsletter: 0.7, // Curated newsletters
	aggregator: 0.6, // Aggregators like HN, Reddit
	social: 0.4, // Social media sources
};

/**
 * Get trust score for a source category
 */
export function getTrustScore(category: SourceCategory): number {
	return SOURCE_TRUST_SCORES[category];
}

// ============================================
// Confidence Levels
// ============================================

/**
 * Confidence level for claims/findings
 * Based on PAI OSINT methodology
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'speculative';

export interface ConfidenceAssessment {
	level: ConfidenceLevel;
	score: number; // 0-100
	reason: string;
	sourceCount: number;
}

/**
 * Calculate confidence based on source verification
 */
export function assessConfidence(
	independentSources: number,
	avgTrustScore: number,
	hasContradictions: boolean
): ConfidenceAssessment {
	let score = Math.min(100, independentSources * 20 + avgTrustScore * 60);

	if (hasContradictions) {
		score *= 0.7;
	}

	let level: ConfidenceLevel;
	let reason: string;

	if (score >= 80) {
		level = 'high';
		reason = 'Multiple independent confirmations from trusted sources';
	} else if (score >= 50) {
		level = 'medium';
		reason = 'Some supporting evidence with limited independent confirmation';
	} else if (score >= 20) {
		level = 'low';
		reason = 'Single or unverified sources with gaps';
	} else {
		level = 'speculative';
		reason = 'Inference only, no direct evidence';
	}

	return {
		level,
		score,
		reason,
		sourceCount: independentSources,
	};
}

// ============================================
// News Source Schema
// ============================================

export const NewsSourceSchema = z.object({
	name: z.string(),
	url: z.string().url(),
	type: SourceCategorySchema,
	priority: z.enum(['high', 'medium', 'low']),
	bias: z.enum(['left', 'center', 'right', 'unknown']).optional(),
	trustScore: z.number().min(0).max(1).optional(),
});

export type NewsSource = z.infer<typeof NewsSourceSchema>;

// ============================================
// Feed Item Schema
// ============================================

export const FeedItemSchema = z.object({
	title: z.string(),
	link: z.string().url(),
	pubDate: z.date(),
	source: z.string(),
	sourceType: SourceCategorySchema,
	trustScore: z.number().min(0).max(1),
	snippet: z.string().optional(),
	guid: z.string().optional(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

// ============================================
// Feed Configuration Schema
// ============================================

export const FeedSettingsSchema = z.object({
	max_items_per_feed: z.number().default(20),
	max_age_hours: z.number().default(48),
	dedup_threshold: z.number().min(0).max(1).default(0.8),
});

export const FeedConfigSchema = z.object({
	feeds: z.record(z.string(), z.array(NewsSourceSchema)),
	source_trust_scores: z.record(SourceCategorySchema, z.number()).optional(),
	settings: FeedSettingsSchema.default({}),
});

export type FeedSettings = z.infer<typeof FeedSettingsSchema>;
export type FeedConfig = z.infer<typeof FeedConfigSchema>;

// ============================================
// Verification Result Schema
// ============================================

export const VerificationResultSchema = z.object({
	url: z.string(),
	valid: z.boolean(),
	status: z.number().optional(),
	error: z.string().optional(),
	title: z.string().optional(),
	contentPreview: z.string().optional(),
	verifiedAt: z.string().optional(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// ============================================
// Research Result Schemas
// ============================================

export const ResearchSourceSchema = z.object({
	title: z.string(),
	url: z.string(),
	verified: z.boolean(),
	snippet: z.string().optional(),
});

export type ResearchSource = z.infer<typeof ResearchSourceSchema>;

export const QuickResearchResultSchema = z.object({
	query: z.string(),
	summary: z.string(),
	sources: z.array(ResearchSourceSchema),
	model: z.string(),
	cost: z.number(),
	timestamp: z.string(),
});

export type QuickResearchResult = z.infer<typeof QuickResearchResultSchema>;

export const ResearchPerspectiveSchema = z.object({
	model: z.string(),
	summary: z.string(),
	keyFindings: z.array(z.string()).optional(),
	sources: z.array(ResearchSourceSchema),
});

export type ResearchPerspective = z.infer<typeof ResearchPerspectiveSchema>;

export const StandardResearchResultSchema = z.object({
	query: z.string(),
	synthesis: z.string(),
	perspectives: z.array(ResearchPerspectiveSchema),
	totalCost: z.number(),
	timestamp: z.string(),
	confidence: z
		.object({
			level: z.enum(['high', 'medium', 'low', 'speculative']),
			score: z.number(),
		})
		.optional(),
});

export type StandardResearchResult = z.infer<typeof StandardResearchResultSchema>;

// ============================================
// Known Source Biases
// ============================================

/**
 * Known political biases for major news sources
 * Used for perspective diversity tracking
 */
export const KNOWN_SOURCE_BIASES: Record<string, 'left' | 'center' | 'right'> = {
	// Center/Neutral
	Reuters: 'center',
	'Associated Press': 'center',
	AP: 'center',
	AFP: 'center',
	BBC: 'center',
	'The Economist': 'center',

	// Left-leaning
	'The Guardian': 'left',
	'New York Times': 'left',
	NYT: 'left',
	'Washington Post': 'left',
	MSNBC: 'left',
	Vox: 'left',

	// Right-leaning
	'Wall Street Journal': 'right',
	WSJ: 'right',
	'Fox News': 'right',
	'National Review': 'right',
};

/**
 * Get the bias for a source if known
 */
export function getSourceBias(sourceName: string): 'left' | 'center' | 'right' | 'unknown' {
	// Try exact match first
	if (sourceName in KNOWN_SOURCE_BIASES) {
		return KNOWN_SOURCE_BIASES[sourceName];
	}

	// Try partial match
	for (const [name, bias] of Object.entries(KNOWN_SOURCE_BIASES)) {
		if (sourceName.toLowerCase().includes(name.toLowerCase())) {
			return bias;
		}
	}

	return 'unknown';
}
