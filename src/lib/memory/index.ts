/**
 * Memory System - Re-exports
 *
 * The memory system provides persistent learning and work tracking.
 */

// Work tracking
export { workManager, WorkManager } from './work-manager';

// Learning capture and retrieval
export {
	learningManager,
	LearningManager,
	captureLearning,
	retrieveRelevantLearnings,
} from './learning-manager';

// State management
export {
	getState,
	setState,
	initializeState,
	recordCheckin,
	getCheckinHistory,
	getCheckinsForDate,
	getCheckinStreak,
	getLastCheckin,
	recordCost,
	getMonthlyCost,
	getCostBreakdown,
	getProjectedMonthlyCost,
	isToday,
	isYesterday,
	getWeekStart,
	stateManager,
	StateManager,
	type AppState,
	type CheckinType,
	type CheckinEntry,
} from './state-manager';

// Context injection
export {
	buildEnhancedContext,
	buildSystemPrompt,
	buildMinimalContext,
	type TaskType,
} from './context-injection';
