/**
 * Skill Loader - Load and manage skill definitions
 *
 * Loads skills from the user's skill directory (~/.yxhyx/skills/)
 * and built-in skills from the package.
 */

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
	type LoadedSkill,
	type LoadedWorkflow,
	SkillDefinitionSchema,
	type SkillInfo,
	type WorkflowPrompt,
	type WorkflowStep,
} from './types';

// ============================================
// Configuration
// ============================================

const USER_SKILLS_DIR = `${process.env.HOME}/.yxhyx/skills`;
const BUILTIN_SKILLS_DIR = join(import.meta.dirname || __dirname, '../../skills');

// ============================================
// Workflow Parser
// ============================================

/**
 * Parse workflow markdown content to extract prompts and steps
 */
function parseWorkflowContent(content: string): {
	prompts: WorkflowPrompt[];
	steps: WorkflowStep[];
} {
	const prompts: WorkflowPrompt[] = [];
	const steps: WorkflowStep[] = [];

	// Helper function to extract variables from template
	const extractVariables = (template: string): string[] => {
		const variableRegex = /\{\{(\w+)\}\}/g;
		const matches = template.matchAll(variableRegex);
		const variables: string[] = [];
		for (const match of matches) {
			if (!variables.includes(match[1])) {
				variables.push(match[1]);
			}
		}
		return variables;
	};

	// Extract prompt blocks (```prompt ... ```)
	const promptMatches = content.matchAll(/```prompt\n([\s\S]*?)```/g);
	for (const promptMatch of promptMatches) {
		const template = promptMatch[1].trim();
		const variables = extractVariables(template);
		prompts.push({ template, variables });
	}

	// Extract steps (### 1. Title ... ### 2. Title ...)
	const stepMatches = content.matchAll(
		/###\s+(\d+)\.\s+(.+?)(?=\n)([\s\S]*?)(?=###\s+\d+\.|## |$)/g
	);
	for (const stepMatch of stepMatches) {
		const number = Number.parseInt(stepMatch[1], 10);
		const title = stepMatch[2].trim();
		const description = stepMatch[3].trim();

		// Check if step has a prompt block
		const stepPromptMatch = description.match(/```prompt\n([\s\S]*?)```/);
		let prompt: WorkflowPrompt | undefined;
		if (stepPromptMatch) {
			const template = stepPromptMatch[1].trim();
			const variables = extractVariables(template);
			prompt = { template, variables };
		}

		steps.push({ number, title, description, prompt });
	}

	return { prompts, steps };
}

/**
 * Load a single workflow from file
 */
async function loadWorkflow(
	skillPath: string,
	name: string,
	definition: LoadedWorkflow['definition']
): Promise<LoadedWorkflow> {
	const workflowPath = join(skillPath, definition.file);

	let content = '';
	if (existsSync(workflowPath)) {
		content = await readFile(workflowPath, 'utf-8');
	}

	const { prompts, steps } = parseWorkflowContent(content);

	return {
		name,
		definition,
		content,
		prompts,
		steps,
	};
}

/**
 * Check environment variables for a skill
 */
function checkEnvironment(skill: LoadedSkill['definition']): {
	isReady: boolean;
	missingEnvVars: string[];
} {
	const missingEnvVars: string[] = [];

	for (const envVar of skill.env.required) {
		if (!process.env[envVar]) {
			missingEnvVars.push(envVar);
		}
	}

	return {
		isReady: missingEnvVars.length === 0,
		missingEnvVars,
	};
}

// ============================================
// Skill Loader Class
// ============================================

export class SkillLoader {
	private skills: Map<string, LoadedSkill> = new Map();
	private loaded = false;
	private builtinLoaded = false;

	/**
	 * Load all skills from user and built-in directories
	 */
	async loadAll(): Promise<void> {
		if (this.loaded) return;

		// Load built-in skills first
		await this.loadBuiltinSkills();

		// Then load user skills (can override built-ins)
		await this.loadUserSkills();

		this.loaded = true;
	}

	/**
	 * Load built-in skills from package
	 */
	private async loadBuiltinSkills(): Promise<void> {
		if (this.builtinLoaded) return;

		if (existsSync(BUILTIN_SKILLS_DIR)) {
			await this.loadSkillsFromDirectory(BUILTIN_SKILLS_DIR, 'builtin');
		}

		this.builtinLoaded = true;
	}

	/**
	 * Load user skills from ~/.yxhyx/skills/
	 */
	private async loadUserSkills(): Promise<void> {
		if (existsSync(USER_SKILLS_DIR)) {
			await this.loadSkillsFromDirectory(USER_SKILLS_DIR, 'user');
		}
	}

	/**
	 * Load skills from a directory
	 */
	private async loadSkillsFromDirectory(
		baseDir: string,
		_source: 'builtin' | 'user'
	): Promise<void> {
		let entries: string[];
		try {
			entries = await readdir(baseDir);
		} catch {
			return;
		}

		for (const entry of entries) {
			const skillPath = join(baseDir, entry);
			const configPath = join(skillPath, 'skill.yaml');

			if (!existsSync(configPath)) continue;

			try {
				const skill = await this.loadSkillFromPath(skillPath);
				if (skill) {
					this.skills.set(skill.definition.name, skill);
				}
			} catch (error) {
				console.warn(`Warning: Failed to load skill from ${skillPath}:`, error);
			}
		}
	}

	/**
	 * Load a single skill from a directory path
	 */
	private async loadSkillFromPath(skillPath: string): Promise<LoadedSkill | null> {
		const configPath = join(skillPath, 'skill.yaml');

		if (!existsSync(configPath)) {
			return null;
		}

		// Read and parse skill.yaml
		const configContent = await readFile(configPath, 'utf-8');
		const rawConfig = parse(configContent);

		// Validate with Zod schema
		const parseResult = SkillDefinitionSchema.safeParse(rawConfig);
		if (!parseResult.success) {
			console.warn(`Invalid skill definition at ${configPath}:`, parseResult.error.format());
			return null;
		}

		const definition = parseResult.data;

		// Load all workflows
		const workflows = new Map<string, LoadedWorkflow>();
		for (const [name, workflowDef] of Object.entries(definition.workflows)) {
			const workflow = await loadWorkflow(skillPath, name, workflowDef);
			workflows.set(name, workflow);
		}

		// Check environment
		const { isReady, missingEnvVars } = checkEnvironment(definition);

		return {
			definition,
			path: skillPath,
			workflows,
			isReady,
			missingEnvVars,
		};
	}

	/**
	 * Get a skill by name
	 */
	async getSkill(name: string): Promise<LoadedSkill | null> {
		await this.loadAll();
		return this.skills.get(name) || null;
	}

	/**
	 * Get all loaded skills
	 */
	async getAllSkills(): Promise<LoadedSkill[]> {
		await this.loadAll();
		return Array.from(this.skills.values());
	}

	/**
	 * List all skills with basic info
	 */
	async listSkills(): Promise<SkillInfo[]> {
		await this.loadAll();

		return Array.from(this.skills.values()).map((skill) => ({
			name: skill.definition.name,
			version: skill.definition.version,
			description: skill.definition.description,
			workflows: Object.keys(skill.definition.workflows),
			isReady: skill.isReady,
			path: skill.path,
		}));
	}

	/**
	 * Reload a specific skill
	 */
	async reloadSkill(name: string): Promise<LoadedSkill | null> {
		const existing = this.skills.get(name);
		if (!existing) return null;

		const reloaded = await this.loadSkillFromPath(existing.path);
		if (reloaded) {
			this.skills.set(name, reloaded);
		}

		return reloaded;
	}

	/**
	 * Reload all skills
	 */
	async reloadAll(): Promise<void> {
		this.skills.clear();
		this.loaded = false;
		this.builtinLoaded = false;
		await this.loadAll();
	}

	/**
	 * Check if a skill exists
	 */
	async hasSkill(name: string): Promise<boolean> {
		await this.loadAll();
		return this.skills.has(name);
	}

	/**
	 * Get the default workflow for a skill
	 */
	getDefaultWorkflow(skill: LoadedSkill): LoadedWorkflow | null {
		// First, look for workflow marked as default
		for (const workflow of skill.workflows.values()) {
			if (workflow.definition.default) {
				return workflow;
			}
		}

		// Fall back to first workflow
		const first = skill.workflows.values().next();
		return first.done ? null : first.value;
	}

	/**
	 * Get workflow by name for a skill
	 */
	getWorkflow(skill: LoadedSkill, workflowName: string): LoadedWorkflow | null {
		return skill.workflows.get(workflowName) || null;
	}
}

// ============================================
// Singleton Export
// ============================================

export const skillLoader = new SkillLoader();
