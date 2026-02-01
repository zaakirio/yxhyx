/**
 * Research Module - Multi-source research and news aggregation
 *
 * Exports all research-related functionality:
 * - Feed fetching and RSS aggregation
 * - URL verification
 * - News digest generation
 * - Quick and standard research
 * - Perspective tracking
 */

// ============================================
// Source Types and Schemas
// ============================================

export {
	// Types
	type SourceCategory,
	type ConfidenceLevel,
	type ConfidenceAssessment,
	type NewsSource,
	type FeedItem,
	type FeedSettings,
	type FeedConfig,
	type VerificationResult,
	type ResearchSource,
	type QuickResearchResult,
	type ResearchPerspective,
	type StandardResearchResult,
	// Schemas (for validation)
	SourceCategorySchema,
	NewsSourceSchema,
	FeedItemSchema,
	FeedSettingsSchema,
	FeedConfigSchema,
	VerificationResultSchema,
	ResearchSourceSchema,
	QuickResearchResultSchema,
	ResearchPerspectiveSchema,
	StandardResearchResultSchema,
	// Constants
	SOURCE_TRUST_SCORES,
	KNOWN_SOURCE_BIASES,
	// Functions
	getTrustScore,
	assessConfidence,
	getSourceBias,
} from './source-types';

// ============================================
// URL Verification
// ============================================

export {
	validateUrlSecurity,
	verifyUrl,
	verifyUrls,
	filterValidUrls,
	verifyAndAnnotateSources,
	isUrlReachable,
	getVerificationStats,
} from './url-verifier';

// ============================================
// Feed Fetching
// ============================================

export {
	FeedFetcher,
	feedFetcher, // Singleton instance
} from './feed-fetcher';

// ============================================
// News Digest
// ============================================

export {
	type RelevanceLevel,
	type ScoredFeedItem,
	type GoalRelevantItem,
	type CategoryDigest,
	type NewsDigest,
	generateNewsDigest,
	generateQuickDigest,
	generateCategoryDigest,
	formatDigestForTerminal,
} from './news-digest';

// ============================================
// Quick Research
// ============================================

export {
	quickResearch,
	quickFactCheck,
	quickDefine,
	formatQuickResearchResult,
} from './quick-research';

// ============================================
// Standard Research
// ============================================

export {
	standardResearch,
	deepResearch,
	compareResearch,
	formatStandardResearchResult,
} from './standard-research';

// ============================================
// Perspective Tracking
// ============================================

export {
	type PerspectiveBalance,
	type PerspectiveAnalysis,
	type SourceDiversity,
	analyzePerspectiveBalance,
	analyzeFromFeedItems,
	analyzeFromResearchSources,
	generatePerspectiveWarnings,
	generateDiversityRecommendations,
	analyzePerspectives,
	analyzeSourceDiversity,
	formatPerspectiveAnalysis,
} from './perspective-tracker';
