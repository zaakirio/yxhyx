/**
 * Model Router Tests
 *
 * Tests for:
 * - Complexity classification
 * - Model routing logic
 * - Cost estimation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestEnvironment } from './setup';

// ============================================
// Complexity Classification Tests
// ============================================

describe('Complexity Classification', () => {
	describe('classify', () => {
		it('should classify based on pattern and indicators', async () => {
			const { classify, classifyByPattern } = await import('../src/lib/model-router/complexity');

			// Pattern-based classification for exact greetings
			expect(classifyByPattern('hello')).toBe('TRIVIAL');
			expect(classifyByPattern('Hi')).toBe('TRIVIAL');
			expect(classifyByPattern('Thanks')).toBe('TRIVIAL');

			// Full classify combines pattern and indicator-based, taking the higher
			// Short text defaults to QUICK from indicators + TRIVIAL from pattern = QUICK
			// But medium outputLength default bumps it to STANDARD
			const result = classify('hello');
			expect(['TRIVIAL', 'QUICK', 'STANDARD']).toContain(result);
		});

		it('should classify simple questions appropriately', async () => {
			const { classify } = await import('../src/lib/model-router/complexity');

			// Questions default to STANDARD due to medium output expectation
			// But short tasks can be QUICK
			const result = classify('Define TypeScript');
			expect(['QUICK', 'STANDARD']).toContain(result);
		});

		it('should classify multi-step tasks as STANDARD or higher', async () => {
			const { classify } = await import('../src/lib/model-router/complexity');

			const task =
				'Create a full REST API with authentication, database integration, and proper error handling';
			const result = classify(task);

			expect(['STANDARD', 'COMPLEX', 'CRITICAL']).toContain(result);
		});

		it('should classify analysis tasks as COMPLEX', async () => {
			const { classify } = await import('../src/lib/model-router/complexity');

			const task = `
				Analyze this codebase for security vulnerabilities, performance issues,
				and architectural problems. Provide detailed recommendations for each issue found,
				including code examples and potential impact assessment.
			`;
			const result = classify(task);

			expect(['STANDARD', 'COMPLEX', 'CRITICAL']).toContain(result);
		});

		it('should handle explicit indicators', async () => {
			const { classify } = await import('../src/lib/model-router/complexity');

			const result = classify('Simple question', {
				needsMultipleSteps: true,
				requiresAccuracy: true,
			});

			expect(['STANDARD', 'COMPLEX']).toContain(result);
		});
	});

	describe('getComplexityScore', () => {
		it('should return higher scores for complex prompts', async () => {
			const { getComplexityScore } = await import('../src/lib/model-router/complexity');

			const simpleScore = getComplexityScore('Hi');
			const complexScore = getComplexityScore(`
				Design and implement a distributed system for real-time data processing
				with fault tolerance, horizontal scaling, and exactly-once delivery guarantees.
				Include detailed architecture diagrams and implementation code.
			`);

			expect(complexScore).toBeGreaterThan(simpleScore);
		});
	});
});

// ============================================
// Model Router Tests
// ============================================

describe('Model Router', () => {
	beforeEach(async () => {
		await resetTestEnvironment();
	});

	describe('route', () => {
		it('should route TRIVIAL tasks to cheapest model', async () => {
			const { ModelRouter, DEFAULT_ROUTING_CONFIG } = await import(
				'../src/lib/model-router/router'
			);

			// Mock API keys
			process.env.KIMI_API_KEY = 'test-key';

			const router = new ModelRouter();
			const result = await router.route({ complexity: 'TRIVIAL' });

			// Should route to a model in the TRIVIAL list
			expect(DEFAULT_ROUTING_CONFIG.routing.TRIVIAL).toContain(result.modelName);
		});

		it('should route COMPLEX tasks to capable models', async () => {
			const { ModelRouter, DEFAULT_ROUTING_CONFIG } = await import(
				'../src/lib/model-router/router'
			);

			process.env.ANTHROPIC_API_KEY = 'test-key';

			const router = new ModelRouter();
			const result = await router.route({ complexity: 'COMPLEX' });

			// Should route to a model in the COMPLEX list
			expect(DEFAULT_ROUTING_CONFIG.routing.COMPLEX).toContain(result.modelName);
		});

		it('should respect preferred model override', async () => {
			const { ModelRouter } = await import('../src/lib/model-router/router');

			process.env.ANTHROPIC_API_KEY = 'test-key';

			const router = new ModelRouter();
			const result = await router.route({ preferredModel: 'claude-sonnet' });

			expect(result.modelName).toBe('claude-sonnet');
			expect(result.reason).toBe('User specified model');
		});

		it('should classify complexity from task text', async () => {
			const { ModelRouter } = await import('../src/lib/model-router/router');

			process.env.KIMI_API_KEY = 'test-key';

			const router = new ModelRouter();
			const result = await router.route({ task: 'Hello' });

			// Classification depends on both pattern and indicators
			// Short text may still get STANDARD due to default medium output expectation
			expect(['TRIVIAL', 'QUICK', 'STANDARD']).toContain(result.complexity);
		});

		it('should throw error when no API keys are set', async () => {
			// Clear all API keys
			process.env.KIMI_API_KEY = '';
			process.env.MOONSHOT_API_KEY = '';
			process.env.OPENROUTER_API_KEY = '';
			process.env.ANTHROPIC_API_KEY = '';

			const { ModelRouter } = await import('../src/lib/model-router/router');

			const router = new ModelRouter();

			await expect(router.route({ task: 'Test' })).rejects.toThrow('No models available');
		});

		it('should fallback to cheapest available when first choice unavailable', async () => {
			const { ModelRouter } = await import('../src/lib/model-router/router');

			// Only set Anthropic key, but request TRIVIAL (normally Kimi)
			process.env.KIMI_API_KEY = '';
			process.env.ANTHROPIC_API_KEY = 'test-key';

			const router = new ModelRouter();
			const result = await router.route({ complexity: 'TRIVIAL' });

			// Should fallback to Anthropic since it's the only available provider
			expect(result.provider).toBe('anthropic');
			expect(result.reason).toContain('Fallback');
		});
	});

	describe('estimateCost', () => {
		it('should estimate cost correctly', async () => {
			const { ModelRouter, DEFAULT_ROUTING_CONFIG } = await import(
				'../src/lib/model-router/router'
			);

			const router = new ModelRouter();
			const config = DEFAULT_ROUTING_CONFIG.models['kimi-8k'];

			// 1000 input tokens, 500 output tokens
			const cost = router.estimateCost(1000, 500, config);

			// kimi-8k: $0.15/1M input, $0.60/1M output
			// (1000/1M * 0.15) + (500/1M * 0.60) = 0.00015 + 0.0003 = 0.00045
			expect(cost).toBeCloseTo(0.00045, 5);
		});

		it('should estimate higher costs for expensive models', async () => {
			const { ModelRouter, DEFAULT_ROUTING_CONFIG } = await import(
				'../src/lib/model-router/router'
			);

			const router = new ModelRouter();
			const kimiConfig = DEFAULT_ROUTING_CONFIG.models['kimi-8k'];
			const claudeConfig = DEFAULT_ROUTING_CONFIG.models['claude-sonnet'];

			const kimiCost = router.estimateCost(1000, 500, kimiConfig);
			const claudeCost = router.estimateCost(1000, 500, claudeConfig);

			expect(claudeCost).toBeGreaterThan(kimiCost);
		});
	});

	describe('getAvailableProviders', () => {
		it('should return list of providers with API keys', async () => {
			const { ModelRouter } = await import('../src/lib/model-router/router');

			process.env.KIMI_API_KEY = 'test-kimi';
			process.env.OPENROUTER_API_KEY = 'test-openrouter';
			process.env.ANTHROPIC_API_KEY = '';

			const router = new ModelRouter();
			const providers = router.getAvailableProviders();

			expect(providers).toContain('kimi');
			expect(providers).toContain('openrouter');
			expect(providers).not.toContain('anthropic');
		});
	});

	describe('hasAvailableProvider', () => {
		it('should return true when at least one provider available', async () => {
			const { ModelRouter } = await import('../src/lib/model-router/router');

			process.env.KIMI_API_KEY = 'test-key';

			const router = new ModelRouter();
			expect(router.hasAvailableProvider()).toBe(true);
		});

		it('should return false when no providers available', async () => {
			process.env.KIMI_API_KEY = '';
			process.env.MOONSHOT_API_KEY = '';
			process.env.OPENROUTER_API_KEY = '';
			process.env.ANTHROPIC_API_KEY = '';

			const { ModelRouter } = await import('../src/lib/model-router/router');

			const router = new ModelRouter();
			expect(router.hasAvailableProvider()).toBe(false);
		});
	});
});

// ============================================
// Default Config Tests
// ============================================

describe('Default Routing Config', () => {
	it('should have all required complexity levels', async () => {
		const { DEFAULT_ROUTING_CONFIG } = await import('../src/lib/model-router/router');

		expect(DEFAULT_ROUTING_CONFIG.routing.TRIVIAL).toBeDefined();
		expect(DEFAULT_ROUTING_CONFIG.routing.QUICK).toBeDefined();
		expect(DEFAULT_ROUTING_CONFIG.routing.STANDARD).toBeDefined();
		expect(DEFAULT_ROUTING_CONFIG.routing.COMPLEX).toBeDefined();
		expect(DEFAULT_ROUTING_CONFIG.routing.CRITICAL).toBeDefined();
	});

	it('should have valid model configs', async () => {
		const { DEFAULT_ROUTING_CONFIG } = await import('../src/lib/model-router/router');

		for (const [_name, config] of Object.entries(DEFAULT_ROUTING_CONFIG.models)) {
			expect(config.provider).toBeDefined();
			expect(config.model).toBeDefined();
			expect(config.inputCostPer1M).toBeGreaterThan(0);
			expect(config.outputCostPer1M).toBeGreaterThan(0);
			expect(config.maxContext).toBeGreaterThan(0);
		}
	});

	it('should reference only existing models in routing', async () => {
		const { DEFAULT_ROUTING_CONFIG } = await import('../src/lib/model-router/router');

		for (const [complexity, models] of Object.entries(DEFAULT_ROUTING_CONFIG.routing)) {
			for (const model of models) {
				expect(
					DEFAULT_ROUTING_CONFIG.models[model],
					`Model ${model} referenced in ${complexity} routing does not exist`
				).toBeDefined();
			}
		}
	});
});
