/**
 * Skills Framework - Modular Capabilities for Yxhyx
 *
 * Skills are self-contained units with configuration, workflows, and tools.
 *
 * @example
 * ```typescript
 * import { skillRouter, skillExecutor, skillLoader } from './lib/skills';
 *
 * // Find the best skill for an input
 * const match = await skillRouter.route('do research on TypeScript');
 *
 * // Execute the skill
 * const result = await skillExecutor.execute({ input: 'research TypeScript best practices' });
 *
 * // List all available skills
 * const skills = await skillLoader.listSkills();
 * ```
 */

// Types
export type {
	LoadedSkill,
	LoadedWorkflow,
	SkillDefinition,
	SkillEnvironment,
	SkillExecutionOptions,
	SkillExecutionResult,
	SkillInfo,
	SkillMatch,
	SkillTriggers,
	WorkflowDefinition,
	WorkflowPrompt,
	WorkflowStep,
} from './types';

// Schemas (for validation)
export {
	SkillDefinitionSchema,
	SkillEnvironmentSchema,
	SkillTriggersSchema,
	WorkflowDefinitionSchema,
} from './types';

// Loader
export { SkillLoader, skillLoader } from './loader';

// Router
export { SkillRouter, skillRouter } from './router';

// Executor
export { SkillExecutor, skillExecutor, executeSkill, runSkill } from './executor';
