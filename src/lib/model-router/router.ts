/**
 * Model Router - Cost-optimized AI model selection
 *
 * Routes tasks to the cheapest capable model based on complexity.
 * Supports Kimi (Moonshot), OpenRouter, and Anthropic providers.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { type Complexity, type ComplexityIndicators, classify } from './complexity';

// ============================================
// Types
// ============================================

export interface ModelConfig {
	provider: 'kimi' | 'openrouter' | 'anthropic';
	model: string;
	inputCostPer1M: number;
	outputCostPer1M: number;
	maxContext: number;
}

export interface RoutingConfig {
	models: Record<string, ModelConfig>;
	routing: Record<Complexity, string[]>;
	overrides?: Record<string, string>;
}

export interface RouteResult {
	provider: string;
	modelName: string;
	config: ModelConfig;
	complexity: Complexity;
	reason: string;
}

export interface CompletionOptions {
	model?: string;
	messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
	maxTokens?: number;
	temperature?: number;
}

export interface CompletionResult {
	content: string;
	cost: number;
	model: string;
	inputTokens: number;
	outputTokens: number;
}

// ============================================
// Paths
// ============================================

const CONFIG_DIR = `${process.env.HOME}/.yxhyx/config`;
const MODELS_CONFIG_PATH = `${CONFIG_DIR}/models.yaml`;
const COST_TRACKING_PATH = `${process.env.HOME}/.yxhyx/memory/state/cost-tracking.json`;

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
	models: {
		'kimi-8k': {
			provider: 'kimi',
			model: 'moonshot-v1-8k',
			inputCostPer1M: 0.15,
			outputCostPer1M: 0.6,
			maxContext: 8000,
		},
		'kimi-32k': {
			provider: 'kimi',
			model: 'moonshot-v1-32k',
			inputCostPer1M: 0.3,
			outputCostPer1M: 1.2,
			maxContext: 32000,
		},
		'gemini-flash': {
			provider: 'openrouter',
			model: 'google/gemini-2.0-flash-001',
			inputCostPer1M: 0.1,
			outputCostPer1M: 0.4,
			maxContext: 128000,
		},
		'llama-70b': {
			provider: 'openrouter',
			model: 'meta-llama/llama-3.3-70b-instruct',
			inputCostPer1M: 0.5,
			outputCostPer1M: 0.75,
			maxContext: 128000,
		},
		'claude-haiku': {
			provider: 'openrouter',
			model: 'anthropic/claude-3.5-haiku',
			inputCostPer1M: 0.8,
			outputCostPer1M: 4.0,
			maxContext: 200000,
		},
		'claude-sonnet': {
			provider: 'anthropic',
			model: 'claude-sonnet-4-20250514',
			inputCostPer1M: 3.0,
			outputCostPer1M: 15.0,
			maxContext: 200000,
		},
	},
	routing: {
		TRIVIAL: ['kimi-8k', 'gemini-flash'],
		QUICK: ['kimi-8k', 'gemini-flash', 'llama-70b'],
		STANDARD: ['kimi-32k', 'llama-70b', 'claude-haiku'],
		COMPLEX: ['claude-haiku', 'claude-sonnet', 'llama-70b'],
		CRITICAL: ['claude-sonnet'],
	},
};

// ============================================
// Model Router Class
// ============================================

export class ModelRouter {
	private config: RoutingConfig | null = null;
	private apiKeys: Record<string, string> = {};

	constructor() {
		this.loadApiKeys();
	}

	/**
	 * Load API keys from environment
	 */
	private loadApiKeys(): void {
		this.apiKeys = {
			kimi: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || '',
			openrouter: process.env.OPENROUTER_API_KEY || '',
			anthropic: process.env.ANTHROPIC_API_KEY || '',
		};
	}

	/**
	 * Load routing configuration
	 */
	async loadConfig(): Promise<RoutingConfig> {
		if (this.config) return this.config;

		if (existsSync(MODELS_CONFIG_PATH)) {
			try {
				const content = await readFile(MODELS_CONFIG_PATH, 'utf-8');
				this.config = parse(content) as RoutingConfig;
			} catch {
				this.config = DEFAULT_ROUTING_CONFIG;
			}
		} else {
			this.config = DEFAULT_ROUTING_CONFIG;
		}

		return this.config;
	}

	/**
	 * Route a task to the appropriate model
	 */
	async route(options: {
		task?: string;
		complexity?: Complexity;
		preferredModel?: string;
		indicators?: Partial<ComplexityIndicators>;
		maxCost?: number;
	}): Promise<RouteResult> {
		const config = await this.loadConfig();
		this.loadApiKeys(); // Refresh API keys

		// Use preferred model if specified
		if (options.preferredModel && config.models[options.preferredModel]) {
			const modelConfig = config.models[options.preferredModel];
			return {
				provider: modelConfig.provider,
				modelName: options.preferredModel,
				config: modelConfig,
				complexity: options.complexity || 'STANDARD',
				reason: 'User specified model',
			};
		}

		// Classify complexity
		const complexity =
			options.complexity ||
			(options.task ? classify(options.task, options.indicators) : 'STANDARD');

		// Get model priority list for this complexity
		const candidates = config.routing[complexity] || config.routing.STANDARD;

		// Select first available model (has API key and meets requirements)
		for (const modelName of candidates) {
			const modelConfig = config.models[modelName];
			if (!modelConfig) continue;

			// Check if we have API key
			if (!this.apiKeys[modelConfig.provider]) continue;

			// Check cost constraint if specified
			if (options.maxCost && options.task) {
				const estimatedCost = this.estimateCost(
					options.task.length,
					1000, // estimate 1000 output tokens
					modelConfig
				);
				if (estimatedCost > options.maxCost) continue;
			}

			return {
				provider: modelConfig.provider,
				modelName,
				config: modelConfig,
				complexity,
				reason: `Routed for ${complexity} complexity`,
			};
		}

		// Fallback to cheapest available
		const fallback = Object.entries(config.models)
			.filter(([, m]) => this.apiKeys[m.provider])
			.sort((a, b) => a[1].inputCostPer1M - b[1].inputCostPer1M)[0];

		if (fallback) {
			return {
				provider: fallback[1].provider,
				modelName: fallback[0],
				config: fallback[1],
				complexity,
				reason: 'Fallback to cheapest available',
			};
		}

		throw new Error(
			'No models available. Please set at least one API key:\n' +
				'  - KIMI_API_KEY or MOONSHOT_API_KEY for Kimi\n' +
				'  - OPENROUTER_API_KEY for OpenRouter\n' +
				'  - ANTHROPIC_API_KEY for Anthropic'
		);
	}

	/**
	 * Estimate cost for a completion
	 */
	estimateCost(inputTokens: number, outputTokens: number, config: ModelConfig): number {
		return (
			(inputTokens / 1_000_000) * config.inputCostPer1M +
			(outputTokens / 1_000_000) * config.outputCostPer1M
		);
	}

	/**
	 * Main completion method
	 */
	async complete(options: CompletionOptions): Promise<CompletionResult> {
		// Route if model not specified
		let routeResult: RouteResult;

		if (options.model === 'cheapest') {
			routeResult = await this.route({ complexity: 'QUICK' });
		} else if (options.model) {
			routeResult = await this.route({ preferredModel: options.model });
		} else {
			// Get the last user message for routing
			const lastUserMessage = [...options.messages]
				.reverse()
				.find((m) => m.role === 'user')?.content;
			routeResult = await this.route({ task: lastUserMessage });
		}

		const { provider, config } = routeResult;

		// Call appropriate provider
		let response: { content: string; inputTokens: number; outputTokens: number };

		switch (provider) {
			case 'kimi':
				response = await this.callKimi(config.model, options);
				break;
			case 'openrouter':
				response = await this.callOpenRouter(config.model, options);
				break;
			case 'anthropic':
				response = await this.callAnthropic(config.model, options);
				break;
			default:
				throw new Error(`Unknown provider: ${provider}`);
		}

		// Calculate cost
		const cost = this.estimateCost(response.inputTokens, response.outputTokens, config);

		// Record cost
		await this.recordCost(routeResult.modelName, cost);

		return {
			content: response.content,
			cost,
			model: routeResult.modelName,
			inputTokens: response.inputTokens,
			outputTokens: response.outputTokens,
		};
	}

	/**
	 * Call Kimi (Moonshot) API
	 */
	private async callKimi(
		model: string,
		options: CompletionOptions
	): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
		const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKeys.kimi}`,
			},
			body: JSON.stringify({
				model,
				messages: options.messages,
				max_tokens: options.maxTokens || 2000,
				temperature: options.temperature ?? 0.7,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Kimi API error: ${response.status} - ${error}`);
		}

		const data = (await response.json()) as {
			choices: Array<{ message: { content: string } }>;
			usage: { prompt_tokens: number; completion_tokens: number };
		};

		return {
			content: data.choices[0].message.content,
			inputTokens: data.usage.prompt_tokens,
			outputTokens: data.usage.completion_tokens,
		};
	}

	/**
	 * Call OpenRouter API
	 */
	private async callOpenRouter(
		model: string,
		options: CompletionOptions
	): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKeys.openrouter}`,
				'HTTP-Referer': 'https://yxhyx.local',
				'X-Title': 'Yxhyx Personal AI',
			},
			body: JSON.stringify({
				model,
				messages: options.messages,
				max_tokens: options.maxTokens || 2000,
				temperature: options.temperature ?? 0.7,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
		}

		const data = (await response.json()) as {
			choices: Array<{ message: { content: string } }>;
			usage: { prompt_tokens: number; completion_tokens: number };
		};

		return {
			content: data.choices[0].message.content,
			inputTokens: data.usage.prompt_tokens,
			outputTokens: data.usage.completion_tokens,
		};
	}

	/**
	 * Call Anthropic API
	 */
	private async callAnthropic(
		model: string,
		options: CompletionOptions
	): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
		// Convert messages format - Anthropic requires system to be separate
		const systemMessage = options.messages.find((m) => m.role === 'system');
		const nonSystemMessages = options.messages.filter((m) => m.role !== 'system');

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.apiKeys.anthropic,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model,
				system: systemMessage?.content,
				messages: nonSystemMessages,
				max_tokens: options.maxTokens || 2000,
				temperature: options.temperature ?? 0.7,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Anthropic API error: ${response.status} - ${error}`);
		}

		const data = (await response.json()) as {
			content: Array<{ text: string }>;
			usage: { input_tokens: number; output_tokens: number };
		};

		return {
			content: data.content[0].text,
			inputTokens: data.usage.input_tokens,
			outputTokens: data.usage.output_tokens,
		};
	}

	/**
	 * Record cost for tracking
	 */
	private async recordCost(model: string, cost: number): Promise<void> {
		try {
			const dir = `${process.env.HOME}/.yxhyx/memory/state`;
			await mkdir(dir, { recursive: true });

			let tracking: Record<string, number> = {};

			if (existsSync(COST_TRACKING_PATH)) {
				const content = await readFile(COST_TRACKING_PATH, 'utf-8');
				tracking = JSON.parse(content);
			}

			const month = new Date().toISOString().substring(0, 7); // YYYY-MM
			const key = `${month}:${model}`;
			tracking[key] = (tracking[key] || 0) + cost;
			tracking[`${month}:total`] = (tracking[`${month}:total`] || 0) + cost;

			await writeFile(COST_TRACKING_PATH, JSON.stringify(tracking, null, 2));
		} catch {
			// Silently fail - cost tracking shouldn't break completions
		}
	}

	/**
	 * Get available providers (those with API keys set)
	 */
	getAvailableProviders(): string[] {
		this.loadApiKeys();
		return Object.entries(this.apiKeys)
			.filter(([, key]) => key.length > 0)
			.map(([provider]) => provider);
	}

	/**
	 * Check if any provider is available
	 */
	hasAvailableProvider(): boolean {
		return this.getAvailableProviders().length > 0;
	}
}

// Export singleton instance
export const modelRouter = new ModelRouter();
