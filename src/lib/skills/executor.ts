/**
 * Skill Executor - Execute skill workflows
 *
 * Runs skill workflows by:
 * 1. Loading the skill and workflow
 * 2. Building context from identity and memory
 * 3. Rendering workflow templates with variables
 * 4. Calling the model router for completion
 * 5. Returning structured results
 */

import { formatContextForPrompt } from '../context-loader';
import { buildEnhancedContext } from '../memory/context-injection';
import { modelRouter } from '../model-router';
import { skillLoader } from './loader';
import { skillRouter } from './router';
import type {
	LoadedSkill,
	LoadedWorkflow,
	SkillExecutionOptions,
	SkillExecutionResult,
	SkillMatch,
} from './types';

// ============================================
// Template Rendering
// ============================================

/**
 * Render a template string with variables
 *
 * @param template - Template with {{variable}} placeholders
 * @param variables - Variable values to substitute
 * @returns Rendered string
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
	let result = template;

	for (const [key, value] of Object.entries(variables)) {
		const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
		result = result.replace(regex, value);
	}

	// Remove any remaining unreplaced variables
	result = result.replace(/\{\{\s*\w+\s*\}\}/g, '');

	return result;
}

/**
 * Extract the main prompt from a workflow
 *
 * If the workflow has explicit prompt blocks, use those.
 * Otherwise, use the workflow description/content as guidance.
 */
function extractWorkflowPrompt(workflow: LoadedWorkflow): string {
	// If workflow has prompt blocks, combine them
	if (workflow.prompts.length > 0) {
		return workflow.prompts.map((p) => p.template).join('\n\n');
	}

	// Otherwise, build a prompt from the steps
	if (workflow.steps.length > 0) {
		const stepDescriptions = workflow.steps
			.map((s) => `${s.number}. ${s.title}: ${s.description}`)
			.join('\n');

		return `Follow these steps to complete the task:

${stepDescriptions}`;
	}

	// Fall back to workflow description
	return workflow.definition.description;
}

// ============================================
// Skill Executor Class
// ============================================

export class SkillExecutor {
	/**
	 * Execute a skill based on user input
	 *
	 * @param options - Execution options
	 * @returns Execution result
	 */
	async execute(options: SkillExecutionOptions): Promise<SkillExecutionResult> {
		const startTime = Date.now();

		try {
			// Find the skill to use
			let match: SkillMatch | null = null;

			if (options.workflow) {
				// Force route to specific workflow
				const skills = await skillLoader.getAllSkills();
				for (const skill of skills) {
					if (skill.workflows.has(options.workflow)) {
						match = {
							skill,
							workflow: options.workflow,
							confidence: 1.0,
							matchType: 'exact',
						};
						break;
					}
				}
				if (!match) {
					return this.errorResult(
						options.input,
						startTime,
						`Workflow '${options.workflow}' not found`
					);
				}
			} else {
				// Route based on input
				match = await skillRouter.route(options.input);
			}

			if (!match) {
				return this.errorResult(
					options.input,
					startTime,
					'No skill matched the input. Try being more specific or use a skill name directly.'
				);
			}

			// Get the workflow
			const workflow = skillLoader.getWorkflow(match.skill, match.workflow);
			if (!workflow) {
				return this.errorResult(
					options.input,
					startTime,
					`Workflow '${match.workflow}' not found in skill '${match.skill.definition.name}'`
				);
			}

			// Execute the workflow
			return await this.executeWorkflow(match.skill, workflow, options, startTime);
		} catch (error) {
			return this.errorResult(
				options.input,
				startTime,
				error instanceof Error ? error.message : 'Unknown error during skill execution'
			);
		}
	}

	/**
	 * Execute a specific skill and workflow directly
	 */
	async executeSkill(
		skillName: string,
		workflowName: string | undefined,
		options: SkillExecutionOptions
	): Promise<SkillExecutionResult> {
		const startTime = Date.now();

		try {
			// Load the skill
			const skill = await skillLoader.getSkill(skillName);
			if (!skill) {
				return this.errorResult(options.input, startTime, `Skill '${skillName}' not found`);
			}

			// Check if skill is ready
			if (!skill.isReady) {
				return this.errorResult(
					options.input,
					startTime,
					`Skill '${skillName}' requires environment variables: ${skill.missingEnvVars.join(', ')}`
				);
			}

			// Get the workflow
			let workflow: LoadedWorkflow | null;
			if (workflowName) {
				workflow = skillLoader.getWorkflow(skill, workflowName);
			} else {
				workflow = skillLoader.getDefaultWorkflow(skill);
			}

			if (!workflow) {
				return this.errorResult(
					options.input,
					startTime,
					`Workflow '${workflowName || 'default'}' not found in skill '${skillName}'`
				);
			}

			// Execute the workflow
			return await this.executeWorkflow(skill, workflow, options, startTime);
		} catch (error) {
			return this.errorResult(
				options.input,
				startTime,
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	/**
	 * Execute a loaded workflow
	 */
	private async executeWorkflow(
		skill: LoadedSkill,
		workflow: LoadedWorkflow,
		options: SkillExecutionOptions,
		startTime: number
	): Promise<SkillExecutionResult> {
		// Build context
		const context = await this.buildContext(skill, workflow, options);

		// Build the prompt
		const workflowPrompt = extractWorkflowPrompt(workflow);
		const renderedPrompt = renderTemplate(workflowPrompt, {
			query: options.input,
			input: options.input,
			topic: options.input,
			...options.context,
		});

		// Call the model (model complexity from workflow.definition.model_complexity could be used for routing)
		const response = await modelRouter.complete({
			model: options.preferredModel,
			messages: [
				{
					role: 'system',
					content: context.systemPrompt,
				},
				{
					role: 'user',
					content: options.input,
				},
				{
					role: 'assistant',
					content: `I'll execute the "${workflow.name}" workflow from the "${skill.definition.name}" skill.\n\n${renderedPrompt}`,
				},
				{
					role: 'user',
					content: 'Please proceed with the workflow execution.',
				},
			],
			maxTokens: 2000,
			temperature: 0.7,
		});

		const duration = (Date.now() - startTime) / 1000;

		// Try to parse structured data from response
		let data: Record<string, unknown> | undefined;
		try {
			const jsonMatch = response.content.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				data = JSON.parse(jsonMatch[0]);
			}
		} catch {
			// No structured data - that's OK
		}

		return {
			skill: skill.definition.name,
			workflow: workflow.name,
			output: response.content,
			data,
			cost: response.cost,
			duration,
			model: response.model,
			success: true,
		};
	}

	/**
	 * Build context for skill execution
	 */
	private async buildContext(
		skill: LoadedSkill,
		workflow: LoadedWorkflow,
		options: SkillExecutionOptions
	): Promise<{ systemPrompt: string; userContext: string }> {
		// Get identity context
		let identityContext = '';
		try {
			identityContext = await formatContextForPrompt('chat');
		} catch {
			// Identity not initialized - continue without context
		}

		// Get learning context (buildEnhancedContext returns a string)
		let learningContext = '';
		try {
			learningContext = await buildEnhancedContext(options.input, 'chat');
		} catch {
			// Memory not initialized - continue without learnings
		}

		// Build system prompt
		const systemPrompt = `You are executing the "${workflow.name}" workflow from the "${skill.definition.name}" skill.

## Skill Description
${skill.definition.description}

## Workflow: ${workflow.name}
${workflow.definition.description}

## Workflow Instructions
${workflow.content}

${identityContext}

${
	learningContext
		? `## Relevant Learnings
${learningContext}`
		: ''
}

## Important Rules
1. Follow the workflow steps carefully
2. Format output according to workflow specifications
3. Be concise but thorough
4. If you include URLs, only use ones you're confident exist
5. Note any errors or limitations in your response`;

		return {
			systemPrompt,
			userContext: identityContext,
		};
	}

	/**
	 * Create an error result
	 */
	private errorResult(_input: string, startTime: number, error: string): SkillExecutionResult {
		return {
			skill: 'unknown',
			workflow: 'unknown',
			output: '',
			cost: 0,
			duration: (Date.now() - startTime) / 1000,
			model: 'none',
			success: false,
			error,
		};
	}
}

// ============================================
// Singleton Export
// ============================================

export const skillExecutor = new SkillExecutor();

// ============================================
// Convenience Functions
// ============================================

/**
 * Execute a skill based on user input
 */
export async function executeSkill(
	input: string,
	options: Omit<SkillExecutionOptions, 'input'> = {}
): Promise<SkillExecutionResult> {
	return skillExecutor.execute({ input, ...options });
}

/**
 * Execute a specific skill directly
 */
export async function runSkill(
	skillName: string,
	input: string,
	workflowName?: string
): Promise<SkillExecutionResult> {
	return skillExecutor.executeSkill(skillName, workflowName, { input });
}
