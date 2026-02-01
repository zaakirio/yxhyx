/**
 * Standard Research - Multi-model research with synthesis
 *
 * Uses multiple models in parallel for comprehensive research,
 * then synthesizes the perspectives into a unified result.
 * Based on PAI's multi-model research architecture.
 */

import { modelRouter } from '../model-router';
import type { ResearchPerspective, ResearchSource, StandardResearchResult } from './source-types';
import { assessConfidence } from './source-types';
import { verifyUrls } from './url-verifier';

// ============================================
// Configuration
// ============================================

/**
 * Model configurations for research
 * Each model has different strengths
 */
const RESEARCH_MODELS = {
	// Analytical depth, academic sources
	analytical: {
		modelName: 'kimi-8k',
		prompt: 'Focus on academic depth, scholarly sources, and analytical rigor.',
	},
	// Multi-perspective, cross-domain connections
	perspective: {
		modelName: 'gemini-flash',
		prompt: 'Focus on multiple perspectives, cross-domain connections, and diverse viewpoints.',
	},
	// Recent developments, practical applications
	practical: {
		modelName: 'llama-70b',
		prompt: 'Focus on recent developments, practical applications, and real-world examples.',
	},
};

const RESEARCH_SYSTEM_PROMPT = `You are a research analyst. Your task is to:
1. Research the given topic thoroughly
2. Provide accurate, well-sourced information
3. Include specific URLs for sources (only use URLs you are confident exist)
4. Highlight key findings and insights
5. Note any areas of uncertainty`;

// ============================================
// Standard Research (2 models)
// ============================================

/**
 * Perform standard research using two models in parallel
 */
export async function standardResearch(
	query: string,
	options: {
		models?: string[];
		verifyUrls?: boolean;
	} = {}
): Promise<StandardResearchResult> {
	const {
		models = [RESEARCH_MODELS.analytical.modelName, RESEARCH_MODELS.perspective.modelName],
		verifyUrls: shouldVerify = true,
	} = options;

	// Run research in parallel with different models
	const researchPromises = models.map(async (modelName, index) => {
		const modelConfig = Object.values(RESEARCH_MODELS)[index] || RESEARCH_MODELS.analytical;

		const response = await modelRouter.complete({
			model: modelName,
			messages: [
				{
					role: 'system',
					content: `${RESEARCH_SYSTEM_PROMPT}\n\n${modelConfig.prompt}`,
				},
				{
					role: 'user',
					content: `Research this topic thoroughly:

Topic: ${query}

Provide:
1. A comprehensive summary (3-4 paragraphs)
2. Key findings (5-7 bullet points)
3. Sources with URLs

Format as JSON:
{
  "summary": "Comprehensive summary...",
  "keyFindings": ["Finding 1", "Finding 2", ...],
  "sources": [{ "title": "Source Title", "url": "https://...", "snippet": "What this source covers" }]
}`,
				},
			],
			maxTokens: 2000,
			temperature: 0.3,
		});

		return { modelName, response };
	});

	const results = await Promise.all(researchPromises);

	// Parse responses and collect sources
	const perspectives: ResearchPerspective[] = [];
	const allSources: Array<{ source: ResearchSource; model: string }> = [];
	let totalCost = 0;

	for (const { modelName, response } of results) {
		totalCost += response.cost;

		try {
			const jsonMatch = response.content.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);

				const sources: ResearchSource[] = (parsed.sources || []).map(
					(s: { title: string; url: string; snippet?: string }) => ({
						title: s.title,
						url: s.url,
						verified: false, // Will be verified later
						snippet: s.snippet,
					})
				);

				// Track sources with their model
				for (const source of sources) {
					allSources.push({ source, model: modelName });
				}

				perspectives.push({
					model: modelName,
					summary: parsed.summary || response.content,
					keyFindings: parsed.keyFindings || [],
					sources,
				});
			} else {
				perspectives.push({
					model: modelName,
					summary: response.content,
					keyFindings: [],
					sources: [],
				});
			}
		} catch {
			perspectives.push({
				model: modelName,
				summary: response.content,
				keyFindings: [],
				sources: [],
			});
		}
	}

	// Verify all URLs
	if (shouldVerify && allSources.length > 0) {
		const uniqueUrls = [...new Set(allSources.map((s) => s.source.url))];
		const verificationResults = await verifyUrls(uniqueUrls, { timeout: 5000 });
		const verificationMap = new Map(verificationResults.map((r) => [r.url, r.valid]));

		// Update verification status in perspectives
		for (const perspective of perspectives) {
			for (const source of perspective.sources) {
				source.verified = verificationMap.get(source.url) ?? false;
			}
		}
	}

	// Synthesize perspectives
	const synthesis = await synthesizePerspectives(query, perspectives);
	totalCost += synthesis.cost;

	// Calculate confidence
	const verifiedSourceCount = perspectives
		.flatMap((p) => p.sources)
		.filter((s) => s.verified).length;
	const avgTrustScore =
		verifiedSourceCount > 0
			? perspectives.flatMap((p) => p.sources).filter((s) => s.verified).length / allSources.length
			: 0;
	const hasContradictions = detectContradictions(perspectives);
	const confidence = assessConfidence(verifiedSourceCount, avgTrustScore, hasContradictions);

	return {
		query,
		synthesis: synthesis.content,
		perspectives,
		totalCost,
		timestamp: new Date().toISOString(),
		confidence: {
			level: confidence.level,
			score: confidence.score,
		},
	};
}

// ============================================
// Deep Research (3+ models)
// ============================================

/**
 * Perform deep research using three or more models
 */
export async function deepResearch(
	query: string,
	options: {
		verifyUrls?: boolean;
	} = {}
): Promise<StandardResearchResult> {
	// Use all available research models
	const models = Object.values(RESEARCH_MODELS).map((m) => m.modelName);

	return standardResearch(query, {
		models,
		verifyUrls: options.verifyUrls ?? true,
	});
}

// ============================================
// Synthesis
// ============================================

/**
 * Synthesize multiple research perspectives into a unified summary
 */
async function synthesizePerspectives(
	query: string,
	perspectives: ResearchPerspective[]
): Promise<{ content: string; cost: number }> {
	if (perspectives.length === 0) {
		return {
			content: 'No research perspectives to synthesize.',
			cost: 0,
		};
	}

	if (perspectives.length === 1) {
		return {
			content: perspectives[0].summary,
			cost: 0,
		};
	}

	const response = await modelRouter.complete({
		model: 'cheapest',
		messages: [
			{
				role: 'system',
				content: `You are an expert at synthesizing research from multiple sources.
Create a unified summary that highlights agreements, unique contributions, and any conflicts.`,
			},
			{
				role: 'user',
				content: `Synthesize these research perspectives on "${query}":

${perspectives
	.map(
		(p) => `
### ${p.model}
${p.summary}

Key Findings:
${(p.keyFindings || []).map((f) => `- ${f}`).join('\n')}
`
	)
	.join('\n---\n')}

Create a unified summary that:
1. Highlights where perspectives agree (high confidence)
2. Notes unique contributions from each
3. Flags any conflicts or uncertainties
4. Provides actionable conclusions

Keep the synthesis concise but comprehensive (3-4 paragraphs).`,
			},
		],
		maxTokens: 1500,
		temperature: 0.3,
	});

	return {
		content: response.content,
		cost: response.cost,
	};
}

/**
 * Detect contradictions between perspectives
 */
function detectContradictions(perspectives: ResearchPerspective[]): boolean {
	// Simple heuristic: look for negating language patterns
	const negatingPatterns = [
		/however/i,
		/contrary/i,
		/dispute/i,
		/disagree/i,
		/conflict/i,
		/contradict/i,
		/not the case/i,
		/false/i,
	];

	for (const perspective of perspectives) {
		for (const pattern of negatingPatterns) {
			if (pattern.test(perspective.summary)) {
				return true;
			}
		}
	}

	return false;
}

// ============================================
// Output Formatting
// ============================================

/**
 * Format standard research result for terminal
 */
export function formatStandardResearchResult(result: StandardResearchResult): string {
	const lines: string[] = [];

	lines.push('');
	lines.push('RESEARCH SYNTHESIS');
	lines.push('==================');
	lines.push('');
	lines.push(result.synthesis);
	lines.push('');

	// Confidence assessment
	if (result.confidence) {
		lines.push(
			`Confidence: ${result.confidence.level.toUpperCase()} (${result.confidence.score}%)`
		);
		lines.push('');
	}

	// Individual perspectives
	for (const perspective of result.perspectives) {
		lines.push(`--- ${perspective.model} ---`);
		lines.push('');

		if (perspective.keyFindings && perspective.keyFindings.length > 0) {
			lines.push('Key Findings:');
			for (const finding of perspective.keyFindings) {
				lines.push(`  - ${finding}`);
			}
			lines.push('');
		}

		if (perspective.sources.length > 0) {
			lines.push('Sources:');
			for (const source of perspective.sources) {
				const icon = source.verified ? '' : '';
				lines.push(`  ${icon} ${source.title}`);
				lines.push(`     ${source.url}`);
			}
			lines.push('');
		}
	}

	// Summary stats
	const totalSources = result.perspectives.flatMap((p) => p.sources).length;
	const verifiedSources = result.perspectives
		.flatMap((p) => p.sources)
		.filter((s) => s.verified).length;

	lines.push('---');
	lines.push(`Models: ${result.perspectives.map((p) => p.model).join(', ')}`);
	lines.push(`Sources: ${verifiedSources}/${totalSources} verified`);
	lines.push(`Total Cost: $${result.totalCost.toFixed(4)}`);

	return lines.join('\n');
}

// ============================================
// Comparison Research
// ============================================

/**
 * Research and compare two topics/options
 */
export async function compareResearch(
	topicA: string,
	topicB: string,
	_options: {
		verifyUrls?: boolean;
	} = {}
): Promise<{
	topicA: { topic: string; summary: string; pros: string[]; cons: string[] };
	topicB: { topic: string; summary: string; pros: string[]; cons: string[] };
	comparison: string;
	recommendation: string;
	cost: number;
}> {
	const response = await modelRouter.complete({
		model: 'kimi-32k',
		messages: [
			{
				role: 'system',
				content: `You are a research analyst specializing in comparative analysis.
Provide balanced, objective comparisons with clear pros and cons.`,
			},
			{
				role: 'user',
				content: `Compare these two options/topics:

A: ${topicA}
B: ${topicB}

Provide a comprehensive comparison in JSON format:
{
  "topicA": {
    "summary": "Brief summary of A",
    "pros": ["Pro 1", "Pro 2", ...],
    "cons": ["Con 1", "Con 2", ...]
  },
  "topicB": {
    "summary": "Brief summary of B",
    "pros": ["Pro 1", "Pro 2", ...],
    "cons": ["Con 1", "Con 2", ...]
  },
  "comparison": "Direct comparison highlighting key differences",
  "recommendation": "When to choose A vs B"
}`,
			},
		],
		maxTokens: 2000,
		temperature: 0.3,
	});

	try {
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				topicA: {
					topic: topicA,
					summary: parsed.topicA?.summary || '',
					pros: parsed.topicA?.pros || [],
					cons: parsed.topicA?.cons || [],
				},
				topicB: {
					topic: topicB,
					summary: parsed.topicB?.summary || '',
					pros: parsed.topicB?.pros || [],
					cons: parsed.topicB?.cons || [],
				},
				comparison: parsed.comparison || '',
				recommendation: parsed.recommendation || '',
				cost: response.cost,
			};
		}
	} catch {
		// Parsing failed
	}

	return {
		topicA: { topic: topicA, summary: response.content, pros: [], cons: [] },
		topicB: { topic: topicB, summary: '', pros: [], cons: [] },
		comparison: '',
		recommendation: '',
		cost: response.cost,
	};
}
