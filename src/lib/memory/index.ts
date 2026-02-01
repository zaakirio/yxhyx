/**
 * Memory System - Main export file
 *
 * The Memory System enables Yxhyx to:
 * - Track work sessions with effort-based structure
 * - Capture ratings and generate learnings
 * - Retrieve relevant learnings for context injection
 * - Track check-ins and costs
 */

// Work Management
export {
	WorkManager,
	workManager,
	createWork,
	addWorkItem,
	completeWork,
	getCurrentWork,
} from './work-manager';

// Learning Management
export {
	LearningManager,
	learningManager,
	captureRating,
	captureExplicitRating,
	retrieveRelevantLearnings,
	addLearning,
} from './learning-manager';

// State Management
export {
	StateManager,
	stateManager,
	getState,
	setState,
	recordCheckin,
	getCheckinHistory,
	recordCost,
	getMonthlyCost,
	getCostBreakdown,
} from './state-manager';

// Context Injection
export {
	buildEnhancedContext,
	formatContextForSystemPrompt,
	buildMinimalContext,
	buildCheckinContext,
	buildResearchContext,
	type ContextOptions,
	type EnhancedContext,
} from './context-injection';

// Re-export schemas
export * from '../schemas/work';
export * from '../schemas/learning';
