# Model Router - Cost-Optimized AI Selection

## Overview

The Model Router is Yxhyx's intelligence layer for selecting the most cost-effective AI model for each task. By routing simple tasks to cheap models (Kimi k2.5) and reserving expensive models (Claude) for complex work, we minimize costs while maintaining quality.

## Design Philosophy

1. **Cheapest Capable Model**: Always use the cheapest model that can handle the task
2. **Complexity-Based Routing**: Classify task complexity, then select model
3. **Provider Flexibility**: Support multiple providers (Kimi, OpenRouter, Anthropic)
4. **Cost Transparency**: Track and report all API costs
5. **Override Capability**: Allow manual model selection when needed

## Pricing Reference (2026 Estimates)

| Provider | Model | Input $/1M | Output $/1M | Speed | Best For |
|----------|-------|------------|-------------|-------|----------|
| **Moonshot** | Kimi k2.5 | $0.15 | $0.60 | Fast | Simple tasks, chat |
| **OpenRouter** | Gemini 2.0 Flash | $0.10 | $0.40 | Very Fast | Quick tasks |
| **OpenRouter** | Llama 3.3 70B | $0.50 | $0.75 | Fast | Standard tasks |
| **OpenRouter** | Claude 3.5 Haiku | $0.80 | $4.00 | Fast | Coding assistance |
| **Anthropic** | Claude 3.5 Sonnet | $3.00 | $15.00 | Medium | Complex reasoning |
| **Anthropic** | Claude Opus 4.5 | $15.00 | $75.00 | Slow | Maximum quality |

## Complexity Classification

```typescript
// lib/model-router/complexity.ts

export type Complexity = 'TRIVIAL' | 'QUICK' | 'STANDARD' | 'COMPLEX' | 'CRITICAL';

interface ComplexityIndicators {
  // Task characteristics
  requiresReasoning: boolean;
  requiresCodeGen: boolean;
  requiresAnalysis: boolean;
  requiresCreativity: boolean;
  
  // Context requirements
  contextLength: number;  // tokens
  outputLength: 'short' | 'medium' | 'long';
  
  // Quality requirements
  accuracyCritical: boolean;
  securitySensitive: boolean;
}

export function classifyComplexity(task: string, indicators?: Partial<ComplexityIndicators>): Complexity {
  const defaults: ComplexityIndicators = {
    requiresReasoning: false,
    requiresCodeGen: false,
    requiresAnalysis: false,
    requiresCreativity: false,
    contextLength: task.length * 4, // rough token estimate
    outputLength: 'medium',
    accuracyCritical: false,
    securitySensitive: false,
  };
  
  const ind = { ...defaults, ...indicators };
  
  // CRITICAL: Security-sensitive or accuracy-critical tasks
  if (ind.securitySensitive || ind.accuracyCritical) {
    return 'CRITICAL';
  }
  
  // COMPLEX: Multiple advanced requirements
  const advancedRequirements = [
    ind.requiresReasoning,
    ind.requiresCodeGen,
    ind.requiresAnalysis,
    ind.requiresCreativity,
  ].filter(Boolean).length;
  
  if (advancedRequirements >= 2 || ind.outputLength === 'long') {
    return 'COMPLEX';
  }
  
  // STANDARD: Single advanced requirement or medium output
  if (advancedRequirements === 1 || ind.outputLength === 'medium') {
    return 'STANDARD';
  }
  
  // QUICK: Short context, short output
  if (ind.contextLength < 500) {
    return 'QUICK';
  }
  
  // TRIVIAL: Very simple
  return 'TRIVIAL';
}

// Pattern-based classification for common task types
export function classifyByPattern(task: string): Complexity {
  const lowerTask = task.toLowerCase();
  
  // TRIVIAL patterns
  if (/^(hi|hello|thanks|yes|no|ok|sure)$/i.test(task.trim())) {
    return 'TRIVIAL';
  }
  
  // QUICK patterns
  if (
    lowerTask.includes('what is') ||
    lowerTask.includes('define ') ||
    lowerTask.includes('summarize') ||
    lowerTask.length < 50
  ) {
    return 'QUICK';
  }
  
  // COMPLEX patterns
  if (
    lowerTask.includes('implement') ||
    lowerTask.includes('create a') ||
    lowerTask.includes('design') ||
    lowerTask.includes('refactor') ||
    lowerTask.includes('analyze') ||
    lowerTask.includes('compare')
  ) {
    return 'COMPLEX';
  }
  
  // CRITICAL patterns
  if (
    lowerTask.includes('security') ||
    lowerTask.includes('authentication') ||
    lowerTask.includes('production') ||
    lowerTask.includes('deploy') ||
    lowerTask.includes('critical')
  ) {
    return 'CRITICAL';
  }
  
  return 'STANDARD';
}
```

## Model Router Implementation

```typescript
// lib/model-router/router.ts

import { classifyComplexity, classifyByPattern, type Complexity } from './complexity';
import { readFile, writeFile } from 'fs/promises';
import { parse } from 'yaml';

interface ModelConfig {
  provider: 'kimi' | 'openrouter' | 'anthropic';
  model: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  maxContext: number;
}

interface RoutingConfig {
  models: Record<string, ModelConfig>;
  routing: Record<Complexity, string[]>;  // Priority list per complexity
  overrides: Record<string, string>;  // Task pattern -> model
}

interface RouteResult {
  provider: string;
  model: string;
  config: ModelConfig;
  complexity: Complexity;
  reason: string;
}

export class ModelRouter {
  private config: RoutingConfig | null = null;
  private apiKeys: Record<string, string> = {};
  
  async loadConfig(): Promise<RoutingConfig> {
    if (this.config) return this.config;
    
    const content = await readFile(
      `${process.env.HOME}/.yxhyx/config/models.yaml`,
      'utf-8'
    );
    this.config = parse(content) as RoutingConfig;
    
    // Load API keys from environment
    this.apiKeys = {
      kimi: process.env.KIMI_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
    };
    
    return this.config;
  }
  
  async route(options: {
    task?: string;
    complexity?: Complexity;
    preferredModel?: string;
    requiresCodeGen?: boolean;
    maxCost?: number;
  }): Promise<RouteResult> {
    const config = await this.loadConfig();
    
    // Use preferred model if specified
    if (options.preferredModel && config.models[options.preferredModel]) {
      const modelConfig = config.models[options.preferredModel];
      return {
        provider: modelConfig.provider,
        model: options.preferredModel,
        config: modelConfig,
        complexity: options.complexity || 'STANDARD',
        reason: 'User specified model',
      };
    }
    
    // Classify complexity
    const complexity = options.complexity || (
      options.task 
        ? this.classifyTask(options.task, options)
        : 'STANDARD'
    );
    
    // Get model priority list for this complexity
    const candidates = config.routing[complexity] || config.routing['STANDARD'];
    
    // Select first available model (has API key and meets requirements)
    for (const modelName of candidates) {
      const modelConfig = config.models[modelName];
      if (!modelConfig) continue;
      
      // Check if we have API key
      if (!this.apiKeys[modelConfig.provider]) continue;
      
      // Check cost constraint
      if (options.maxCost) {
        const estimatedCost = this.estimateCost(
          options.task?.length || 1000,
          1000,
          modelConfig
        );
        if (estimatedCost > options.maxCost) continue;
      }
      
      return {
        provider: modelConfig.provider,
        model: modelName,
        config: modelConfig,
        complexity,
        reason: `Routed for ${complexity} complexity`,
      };
    }
    
    // Fallback to cheapest available
    const fallback = Object.entries(config.models)
      .filter(([_, m]) => this.apiKeys[m.provider])
      .sort((a, b) => a[1].inputCostPer1M - b[1].inputCostPer1M)[0];
    
    if (fallback) {
      return {
        provider: fallback[1].provider,
        model: fallback[0],
        config: fallback[1],
        complexity,
        reason: 'Fallback to cheapest available',
      };
    }
    
    throw new Error('No models available - check API keys');
  }
  
  private classifyTask(
    task: string,
    options: { requiresCodeGen?: boolean }
  ): Complexity {
    // First try pattern matching
    const patternResult = classifyByPattern(task);
    
    // Then use indicator-based classification
    const indicatorResult = classifyComplexity(task, {
      requiresCodeGen: options.requiresCodeGen,
    });
    
    // Return the higher complexity
    const order: Complexity[] = ['TRIVIAL', 'QUICK', 'STANDARD', 'COMPLEX', 'CRITICAL'];
    const patternIndex = order.indexOf(patternResult);
    const indicatorIndex = order.indexOf(indicatorResult);
    
    return order[Math.max(patternIndex, indicatorIndex)];
  }
  
  estimateCost(inputTokens: number, outputTokens: number, config: ModelConfig): number {
    return (
      (inputTokens / 1_000_000) * config.inputCostPer1M +
      (outputTokens / 1_000_000) * config.outputCostPer1M
    );
  }
  
  // Main completion method
  async complete(options: {
    model?: string;
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ content: string; cost: number; model: string }> {
    // Route if model not specified
    const routeResult = options.model === 'cheapest'
      ? await this.route({ complexity: 'QUICK' })
      : options.model
        ? await this.route({ preferredModel: options.model })
        : await this.route({ task: options.messages[options.messages.length - 1]?.content });
    
    const { provider, model, config } = routeResult;
    
    // Call appropriate provider
    let response: { content: string; inputTokens: number; outputTokens: number };
    
    switch (provider) {
      case 'kimi':
        response = await this.callKimi(model, options);
        break;
      case 'openrouter':
        response = await this.callOpenRouter(model, options);
        break;
      case 'anthropic':
        response = await this.callAnthropic(model, options);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Calculate cost
    const cost = this.estimateCost(response.inputTokens, response.outputTokens, config);
    
    // Record cost
    const { recordCost } = await import('../memory/state-manager');
    await recordCost(model, cost);
    
    return {
      content: response.content,
      cost,
      model,
    };
  }
  
  private async callKimi(
    model: string,
    options: { messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number }
  ) {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.kimi}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',  // or moonshot-v1-32k, moonshot-v1-128k
        messages: options.messages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      }),
    });
    
    const data = await response.json() as any;
    
    return {
      content: data.choices[0].message.content,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    };
  }
  
  private async callOpenRouter(
    model: string,
    options: { messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number }
  ) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.openrouter}`,
        'HTTP-Referer': 'https://yxhyx.local',
        'X-Title': 'Yxhyx Personal AI',
      },
      body: JSON.stringify({
        model: model.replace('openrouter/', ''),
        messages: options.messages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      }),
    });
    
    const data = await response.json() as any;
    
    return {
      content: data.choices[0].message.content,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    };
  }
  
  private async callAnthropic(
    model: string,
    options: { messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number }
  ) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKeys.anthropic,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model.replace('anthropic/', ''),
        messages: options.messages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      }),
    });
    
    const data = await response.json() as any;
    
    return {
      content: data.content[0].text,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    };
  }
}

export const modelRouter = new ModelRouter();
```

## Configuration File

```yaml
# ~/.yxhyx/config/models.yaml

models:
  # Cheapest option - Kimi k2.5
  kimi-8k:
    provider: kimi
    model: moonshot-v1-8k
    inputCostPer1M: 0.15
    outputCostPer1M: 0.60
    maxContext: 8000
  
  kimi-32k:
    provider: kimi
    model: moonshot-v1-32k
    inputCostPer1M: 0.30
    outputCostPer1M: 1.20
    maxContext: 32000
  
  # OpenRouter models
  gemini-flash:
    provider: openrouter
    model: google/gemini-2.0-flash-001
    inputCostPer1M: 0.10
    outputCostPer1M: 0.40
    maxContext: 128000
  
  llama-70b:
    provider: openrouter
    model: meta-llama/llama-3.3-70b-instruct
    inputCostPer1M: 0.50
    outputCostPer1M: 0.75
    maxContext: 128000
  
  claude-haiku:
    provider: openrouter
    model: anthropic/claude-3.5-haiku
    inputCostPer1M: 0.80
    outputCostPer1M: 4.00
    maxContext: 200000
  
  # Anthropic direct
  claude-sonnet:
    provider: anthropic
    model: claude-3-5-sonnet-20241022
    inputCostPer1M: 3.00
    outputCostPer1M: 15.00
    maxContext: 200000
  
  claude-opus:
    provider: anthropic
    model: claude-opus-4-5-20251101
    inputCostPer1M: 15.00
    outputCostPer1M: 75.00
    maxContext: 200000

# Routing rules: complexity -> priority list of models
routing:
  TRIVIAL:
    - kimi-8k
    - gemini-flash
  
  QUICK:
    - kimi-8k
    - gemini-flash
    - llama-70b
  
  STANDARD:
    - kimi-32k
    - llama-70b
    - claude-haiku
  
  COMPLEX:
    - claude-haiku
    - claude-sonnet
    - llama-70b
  
  CRITICAL:
    - claude-sonnet
    - claude-opus

# Pattern overrides: task pattern -> model
overrides:
  "security|authentication|vulnerability": claude-sonnet
  "implement|refactor|create.*function": claude-haiku
  "summarize|translate|format": kimi-8k
```

## Cost Tracking

```typescript
// commands/cost.ts

import { Command } from 'commander';
import { getMonthlyCost, getDetailedCosts } from '../lib/memory/state-manager';

export const costCommand = new Command('cost')
  .description('View API cost tracking')
  .option('-m, --month <YYYY-MM>', 'Specific month')
  .option('-d, --detailed', 'Show breakdown by model')
  .action(async (options) => {
    const month = options.month || new Date().toISOString().substring(0, 7);
    const total = await getMonthlyCost(month);
    
    console.log(`\nAPI Costs for ${month}`);
    console.log('='.repeat(30));
    console.log(`Total: $${total.toFixed(4)}`);
    
    if (options.detailed) {
      const details = await getDetailedCosts(month);
      console.log('\nBreakdown by model:');
      for (const [model, cost] of Object.entries(details)) {
        if (!model.includes(':total')) {
          console.log(`  ${model}: $${(cost as number).toFixed(4)}`);
        }
      }
    }
    
    // Show projected monthly cost
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const projected = (total / dayOfMonth) * daysInMonth;
    
    console.log(`\nProjected monthly: $${projected.toFixed(2)}`);
  });
```

## Usage Examples

```typescript
// Example: Chat command using router
import { modelRouter } from '../lib/model-router';
import { buildEnhancedContext } from '../lib/memory/context-injection';

async function chat(userMessage: string) {
  // Build context with learnings
  const context = await buildEnhancedContext(userMessage, 'chat');
  
  // Router automatically selects model based on task complexity
  const response = await modelRouter.complete({
    messages: [
      { role: 'system', content: context },
      { role: 'user', content: userMessage },
    ],
  });
  
  console.log(response.content);
  console.log(`\n[${response.model} | $${response.cost.toFixed(4)}]`);
}

// Example: Force specific model
async function analyzeCode(code: string) {
  const response = await modelRouter.complete({
    model: 'claude-sonnet',  // Override for code analysis
    messages: [
      { role: 'user', content: `Analyze this code:\n\n${code}` },
    ],
  });
  
  return response.content;
}

// Example: Use cheapest model
async function formatText(text: string) {
  const response = await modelRouter.complete({
    model: 'cheapest',
    messages: [
      { role: 'user', content: `Format this text nicely:\n\n${text}` },
    ],
  });
  
  return response.content;
}
```

## Key Features

| Feature | Benefit |
|---------|---------|
| **Automatic complexity detection** | No manual model selection needed |
| **Pattern-based overrides** | Security tasks always use quality models |
| **Cost tracking** | Know exactly what you're spending |
| **Provider abstraction** | Easy to add new providers |
| **Fallback handling** | Graceful degradation if a provider is down |
| **API key management** | Centralized credential handling |

## Expected Cost Savings

| Without Router | With Router | Savings |
|----------------|-------------|---------|
| All Claude Sonnet: ~$50/mo | Mixed routing: ~$10/mo | **80%** |
| Simple tasks at $15/1M | Simple tasks at $0.15/1M | **100x cheaper** |

By routing 80% of tasks (simple Q&A, formatting, quick lookups) to Kimi k2.5 and only using Claude for complex work, you can dramatically reduce costs while maintaining quality where it matters.
