/**
 * Quick Research - Single model research with URL verification
 *
 * Fast research mode using a single model for simple queries.
 * All URLs are verified before inclusion in results.
 */

import { modelRouter } from '../model-router';
import type { QuickResearchResult, ResearchSource } from './source-types';
import { verifyUrls } from './url-verifier';

// ============================================
// Configuration
// ============================================

const RESEARCH_SYSTEM_PROMPT = `You are a research assistant. When researching topics:
1. Provide accurate, factual information
2. Include relevant sources with URLs
3. Be comprehensive but concise
4. Only cite URLs you are confident actually exist
5. Focus on recent, authoritative sources`;

// ============================================
// Quick Research
// ============================================

/**
 * Perform quick research on a topic using a single model
 *
 * @param query - The research query
 * @param options - Research options
 * @returns Research result with verified sources
 */
export async function quickResearch(
	query: string,
	options: {
		model?: string;
		maxSources?: number;
		verifyUrls?: boolean;
	} = {}
): Promise<QuickResearchResult> {
	const { model = 'cheapest', maxSources = 5, verifyUrls: shouldVerify = true } = options;

	// Route to appropriate model
	const routeResult = await modelRouter.route({
		task: query,
		complexity: 'QUICK',
		preferredModel: model !== 'cheapest' ? model : undefined,
	});

	// Call the model
	const response = await modelRouter.complete({
		model: routeResult.modelName,
		messages: [
			{
				role: 'system',
				content: RESEARCH_SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content: `Research this topic and provide a brief summary with sources:

Topic: ${query}

Respond in JSON format:
{
  "summary": "2-3 paragraph comprehensive summary",
  "sources": [
    { "title": "Source Title", "url": "https://...", "snippet": "Brief description of what this source covers" },
    ...
  ]
}

Include ${maxSources} credible sources. Only use URLs you are highly confident exist - do not make up or guess URLs.`,
			},
		],
		maxTokens: 1500,
		temperature: 0.3,
	});

	// Parse response
	let parsed: { summary: string; sources: Array<{ title: string; url: string; snippet?: string }> };

	try {
		// Try to extract JSON from response
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			parsed = JSON.parse(jsonMatch[0]);
		} else {
			// Fallback: treat entire response as summary
			parsed = {
				summary: response.content,
				sources: [],
			};
		}
	} catch {
		parsed = {
			summary: response.content,
			sources: [],
		};
	}

	// Verify URLs if requested
	let sources: ResearchSource[];

	if (shouldVerify && parsed.sources.length > 0) {
		const urls = parsed.sources.map((s) => s.url);
		const verificationResults = await verifyUrls(urls, { timeout: 5000 });

		const verificationMap = new Map(verificationResults.map((r) => [r.url, r.valid]));

		sources = parsed.sources.map((source) => ({
			title: source.title,
			url: source.url,
			verified: verificationMap.get(source.url) ?? false,
			snippet: source.snippet,
		}));
	} else {
		sources = parsed.sources.map((source) => ({
			title: source.title,
			url: source.url,
			verified: false, // Not verified
			snippet: source.snippet,
		}));
	}

	return {
		query,
		summary: parsed.summary,
		sources,
		model: routeResult.modelName,
		cost: response.cost,
		timestamp: new Date().toISOString(),
	};
}

// ============================================
// Quick Fact Check
// ============================================

/**
 * Quick fact check on a claim
 */
export async function quickFactCheck(claim: string): Promise<{
	claim: string;
	assessment: 'likely_true' | 'likely_false' | 'uncertain' | 'needs_context';
	explanation: string;
	sources: ResearchSource[];
	cost: number;
}> {
	const response = await modelRouter.complete({
		model: 'cheapest',
		messages: [
			{
				role: 'system',
				content: `You are a fact-checker. Evaluate claims objectively using available knowledge.
Be honest about uncertainty. Provide sources when possible.`,
			},
			{
				role: 'user',
				content: `Fact-check this claim:

"${claim}"

Respond in JSON format:
{
  "assessment": "likely_true" | "likely_false" | "uncertain" | "needs_context",
  "explanation": "Brief explanation of your assessment",
  "sources": [{ "title": "...", "url": "..." }]
}`,
			},
		],
		maxTokens: 800,
		temperature: 0.2,
	});

	try {
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);

			// Verify URLs
			const urls = (parsed.sources || []).map((s: { url: string }) => s.url);
			const verificationResults = await verifyUrls(urls, { timeout: 5000 });
			const verificationMap = new Map(verificationResults.map((r) => [r.url, r.valid]));

			const sources: ResearchSource[] = (parsed.sources || []).map(
				(s: { title: string; url: string }) => ({
					title: s.title,
					url: s.url,
					verified: verificationMap.get(s.url) ?? false,
				})
			);

			return {
				claim,
				assessment: parsed.assessment || 'uncertain',
				explanation: parsed.explanation || 'Unable to assess',
				sources,
				cost: response.cost,
			};
		}
	} catch {
		// Parsing failed
	}

	return {
		claim,
		assessment: 'uncertain',
		explanation: response.content,
		sources: [],
		cost: response.cost,
	};
}

// ============================================
// Quick Definition
// ============================================

/**
 * Get a quick definition/explanation of a term
 */
export async function quickDefine(term: string): Promise<{
	term: string;
	definition: string;
	relatedTerms: string[];
	sources: ResearchSource[];
	cost: number;
}> {
	const response = await modelRouter.complete({
		model: 'cheapest',
		messages: [
			{
				role: 'user',
				content: `Define and explain this term concisely:

Term: ${term}

Respond in JSON format:
{
  "definition": "Clear, concise definition",
  "relatedTerms": ["term1", "term2", "term3"],
  "sources": [{ "title": "...", "url": "..." }]
}`,
			},
		],
		maxTokens: 600,
		temperature: 0.3,
	});

	try {
		const jsonMatch = response.content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);

			// Verify URLs
			const urls = (parsed.sources || []).map((s: { url: string }) => s.url);
			const verificationResults = await verifyUrls(urls, { timeout: 5000 });
			const verificationMap = new Map(verificationResults.map((r) => [r.url, r.valid]));

			const sources: ResearchSource[] = (parsed.sources || []).map(
				(s: { title: string; url: string }) => ({
					title: s.title,
					url: s.url,
					verified: verificationMap.get(s.url) ?? false,
				})
			);

			return {
				term,
				definition: parsed.definition || 'No definition available',
				relatedTerms: parsed.relatedTerms || [],
				sources,
				cost: response.cost,
			};
		}
	} catch {
		// Parsing failed
	}

	return {
		term,
		definition: response.content,
		relatedTerms: [],
		sources: [],
		cost: response.cost,
	};
}

// ============================================
// Output Formatting
// ============================================

/**
 * Format quick research result for terminal
 */
export function formatQuickResearchResult(result: QuickResearchResult): string {
	const lines: string[] = [];

	lines.push('');
	lines.push('RESEARCH SUMMARY');
	lines.push('================');
	lines.push('');
	lines.push(result.summary);
	lines.push('');

	if (result.sources.length > 0) {
		lines.push('Sources:');
		for (const source of result.sources) {
			const icon = source.verified ? '' : '';
			lines.push(`  ${icon} ${source.title}`);
			lines.push(`     ${source.url}`);
			if (source.snippet) {
				lines.push(`     ${source.snippet}`);
			}
		}
		lines.push('');

		const verifiedCount = result.sources.filter((s) => s.verified).length;
		lines.push(`Verified: ${verifiedCount}/${result.sources.length} URLs`);
	}

	lines.push('');
	lines.push('---');
	lines.push(`Model: ${result.model} | Cost: $${result.cost.toFixed(4)}`);

	return lines.join('\n');
}
