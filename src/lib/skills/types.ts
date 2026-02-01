/**
 * Skills Framework - Core Types and Schemas
 *
 * Skills are modular capabilities that extend Yxhyx's functionality.
 * Each skill is self-contained with its own configuration, workflows, and tools.
 *
 * Design Principles:
 * 1. Self-Contained: Each skill has everything it needs
 * 2. Declarative: Configuration via YAML, not code
 * 3. Composable: Skills can use other skills
 * 4. Testable: Each skill can be tested in isolation
 * 5. Hot-Loadable: Skills can be added without restart
 */

import { z } from 'zod';

// ============================================
// Trigger Schemas
// ============================================

/**
 * Patterns and keywords that trigger this skill
 */
export const SkillTriggersSchema = z.object({
	/** Phrase patterns that activate this skill (e.g., "do research", "look up") */
	patterns: z.array(z.string()).default([]),
	/** Single keywords that activate this skill (e.g., "research", "news") */
	keywords: z.array(z.string()).default([]),
});

export type SkillTriggers = z.infer<typeof SkillTriggersSchema>;

// ============================================
// Workflow Schemas
// ============================================

/**
 * Workflow definition within a skill
 */
export const WorkflowDefinitionSchema = z.object({
	/** Human-readable description of what this workflow does */
	description: z.string(),
	/** Path to workflow file relative to skill directory */
	file: z.string(),
	/** Is this the default workflow for this skill? */
	default: z.boolean().optional(),
	/** Specific triggers that route to this workflow */
	triggers: z.array(z.string()).optional(),
	/** Estimated time to complete in seconds */
	estimated_seconds: z.number().optional(),
	/** Preferred model complexity for this workflow */
	model_complexity: z.enum(['TRIVIAL', 'QUICK', 'STANDARD', 'COMPLEX', 'CRITICAL']).optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// ============================================
// Environment Schema
// ============================================

/**
 * Environment variable requirements for a skill
 */
export const SkillEnvironmentSchema = z.object({
	/** Required environment variables (skill fails without these) */
	required: z.array(z.string()).default([]),
	/** Optional environment variables (skill works without these but with reduced functionality) */
	optional: z.array(z.string()).default([]),
});

export type SkillEnvironment = z.infer<typeof SkillEnvironmentSchema>;

// ============================================
// Skill Definition Schema
// ============================================

/**
 * Complete skill definition (from skill.yaml)
 */
export const SkillDefinitionSchema = z.object({
	/** Unique skill name (lowercase, no spaces) */
	name: z.string().regex(/^[a-z][a-z0-9-]*$/),
	/** Semantic version */
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	/** Human-readable description */
	description: z.string(),
	/** When this skill should be activated */
	triggers: SkillTriggersSchema,
	/** Dependencies on other skills */
	dependencies: z.array(z.string()).default([]),
	/** Available workflows */
	workflows: z.record(z.string(), WorkflowDefinitionSchema),
	/** Skill-specific configuration options */
	config: z.record(z.string(), z.unknown()).default({}),
	/** Environment variable requirements */
	env: SkillEnvironmentSchema.default({ required: [], optional: [] }),
	/** Author information */
	author: z.string().optional(),
	/** License */
	license: z.string().optional(),
});

export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

// ============================================
// Loaded Skill Types
// ============================================

/**
 * Parsed workflow with content loaded
 */
export interface LoadedWorkflow {
	/** Workflow name */
	name: string;
	/** Workflow definition from skill.yaml */
	definition: WorkflowDefinition;
	/** Raw markdown content of the workflow file */
	content: string;
	/** Parsed prompt blocks from the workflow */
	prompts: WorkflowPrompt[];
	/** Parsed steps from the workflow */
	steps: WorkflowStep[];
}

/**
 * A prompt block extracted from a workflow markdown file
 */
export interface WorkflowPrompt {
	/** The prompt text with template variables */
	template: string;
	/** Variables used in this prompt (e.g., {{query}}) */
	variables: string[];
}

/**
 * A step in a workflow
 */
export interface WorkflowStep {
	/** Step number */
	number: number;
	/** Step title */
	title: string;
	/** Step description/instructions */
	description: string;
	/** Prompt for this step if any */
	prompt?: WorkflowPrompt;
}

/**
 * A fully loaded skill with all content
 */
export interface LoadedSkill {
	/** Skill definition from skill.yaml */
	definition: SkillDefinition;
	/** Path to skill directory */
	path: string;
	/** Loaded workflows (name -> workflow) */
	workflows: Map<string, LoadedWorkflow>;
	/** Whether this skill has all required environment variables */
	isReady: boolean;
	/** Missing required environment variables */
	missingEnvVars: string[];
}

// ============================================
// Skill Execution Types
// ============================================

/**
 * Result from executing a skill workflow
 */
export interface SkillExecutionResult {
	/** Skill that was executed */
	skill: string;
	/** Workflow that was executed */
	workflow: string;
	/** Output from the skill */
	output: string;
	/** Structured data if available */
	data?: Record<string, unknown>;
	/** Cost of execution */
	cost: number;
	/** Duration in seconds */
	duration: number;
	/** Model used for execution */
	model: string;
	/** Whether execution was successful */
	success: boolean;
	/** Error message if execution failed */
	error?: string;
}

/**
 * Options for skill execution
 */
export interface SkillExecutionOptions {
	/** User input that triggered this skill */
	input: string;
	/** Override the workflow to use */
	workflow?: string;
	/** Additional context to include */
	context?: Record<string, unknown>;
	/** Prefer a specific model */
	preferredModel?: string;
	/** Maximum cost allowed for this execution */
	maxCost?: number;
	/** Whether to enable verbose logging */
	verbose?: boolean;
}

// ============================================
// Skill Match Types
// ============================================

/**
 * Result from matching input to a skill
 */
export interface SkillMatch {
	/** The matched skill */
	skill: LoadedSkill;
	/** The selected workflow */
	workflow: string;
	/** Confidence score (0-1) */
	confidence: number;
	/** How the match was made */
	matchType: 'pattern' | 'keyword' | 'exact' | 'default';
	/** The pattern or keyword that matched */
	matchedTrigger?: string;
}

// ============================================
// Skill Registry Types
// ============================================

/**
 * Information about a registered skill
 */
export interface SkillInfo {
	/** Skill name */
	name: string;
	/** Version */
	version: string;
	/** Description */
	description: string;
	/** Available workflows */
	workflows: string[];
	/** Whether skill is ready (has required env vars) */
	isReady: boolean;
	/** Path to skill directory */
	path: string;
}
