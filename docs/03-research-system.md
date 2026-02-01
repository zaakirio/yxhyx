# Research System - Multi-Source Information & News

## Overview

The Research System enables Yxhyx to gather information from multiple sources, aggregate news with diverse perspectives, and ensure accuracy through URL verification. Unlike PAI's general-purpose research system, we optimize specifically for **news aggregation** and **personalized content curation** while maintaining research capabilities.

## Design Principles

### From PAI Analysis

**What PAI Does Well:**
- Multi-model parallel research (Claude, Gemini, Grok, Perplexity)
- Mandatory URL verification protocol
- Three-tier retrieval architecture
- Extensive research mode with 9+ agents

**What We Improve:**
- Add **recency filtering** for news
- Implement **source categorization** (wire, major, trade, social)
- Add **perspective diversity tracking**
- Include **RSS feed integration** for proactive monitoring
- Simplify for cost-effectiveness with Kimi k2.5

## Architecture Overview

```
Research System
├── News Aggregation
│   ├── RSS Feeds (proactive)
│   ├── Web Search (on-demand)
│   └── Source Categorization
│
├── Research Modes
│   ├── Quick (single model)
│   ├── Standard (2 models)
│   └── Deep (parallel multi-model)
│
├── URL Verification
│   └── Mandatory check before output
│
└── Synthesis
    ├── Deduplication
    ├── Recency weighting
    └── Perspective tracking
```

## News Aggregation

### Feed Configuration

```yaml
# ~/.yxhyx/config/feeds.yaml

feeds:
  tech_ai:
    - name: "Hacker News"
      url: "https://hnrss.org/frontpage"
      type: "aggregator"
      priority: "high"
    - name: "TLDR Newsletter"
      url: "https://tldr.tech/feed"
      type: "newsletter"
      priority: "high"
    - name: "The Verge - AI"
      url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"
      type: "major"
      priority: "medium"
    - name: "AI News"
      url: "https://www.artificialintelligence-news.com/feed/"
      type: "trade"
      priority: "medium"

  security:
    - name: "tl;dr sec"
      url: "https://tldrsec.com/feed.xml"
      type: "newsletter"
      priority: "high"
    - name: "Krebs on Security"
      url: "https://krebsonsecurity.com/feed/"
      type: "investigative"
      priority: "high"
    - name: "The Hacker News"
      url: "https://feeds.feedburner.com/TheHackersNews"
      type: "trade"
      priority: "medium"
    - name: "Schneier on Security"
      url: "https://www.schneier.com/feed/"
      type: "analysis"
      priority: "medium"

  # Custom feeds added by user
  custom: []

settings:
  max_items_per_feed: 20
  max_age_hours: 48
  dedup_threshold: 0.8  # Similarity threshold for deduplication
```

### Source Categories

```typescript
// lib/research/source-types.ts

export type SourceCategory = 
  | 'wire'          // AP, Reuters, AFP - highest factual reliability
  | 'major'         // NYT, WSJ, BBC - good for analysis
  | 'trade'         // TechCrunch, industry pubs - domain expertise
  | 'newsletter'    // tl;dr sec, TLDR - curated
  | 'aggregator'    // HN, Reddit - fast, needs verification
  | 'analysis'      // Schneier, Krebs - expert opinion
  | 'investigative' // Deep research
  | 'social';       // Twitter/X - sentiment, speed

export const SOURCE_TRUST_SCORES: Record<SourceCategory, number> = {
  wire: 0.95,
  major: 0.85,
  investigative: 0.85,
  analysis: 0.80,
  trade: 0.75,
  newsletter: 0.70,
  aggregator: 0.60,
  social: 0.40,
};

export interface NewsSource {
  name: string;
  url: string;
  type: SourceCategory;
  priority: 'high' | 'medium' | 'low';
  bias?: 'left' | 'center' | 'right';
  trustScore?: number;
}
```

### Feed Fetcher Implementation

```typescript
// lib/research/feed-fetcher.ts

import Parser from 'rss-parser';
import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import { SOURCE_TRUST_SCORES, type NewsSource, type SourceCategory } from './source-types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Yxhyx/1.0 (Personal AI Assistant)',
  },
});

interface FeedItem {
  title: string;
  link: string;
  pubDate: Date;
  source: string;
  sourceType: SourceCategory;
  trustScore: number;
  snippet?: string;
}

interface FeedConfig {
  feeds: Record<string, NewsSource[]>;
  settings: {
    max_items_per_feed: number;
    max_age_hours: number;
    dedup_threshold: number;
  };
}

export class FeedFetcher {
  private config: FeedConfig | null = null;
  
  async loadConfig(): Promise<FeedConfig> {
    if (this.config) return this.config;
    
    const content = await readFile(
      `${process.env.HOME}/.yxhyx/config/feeds.yaml`,
      'utf-8'
    );
    this.config = parse(content) as FeedConfig;
    return this.config;
  }
  
  async fetchCategory(category: string): Promise<FeedItem[]> {
    const config = await this.loadConfig();
    const feeds = config.feeds[category] || [];
    
    const allItems: FeedItem[] = [];
    const maxAge = Date.now() - (config.settings.max_age_hours * 60 * 60 * 1000);
    
    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
      feeds.map(feed => this.fetchSingleFeed(feed, config.settings.max_items_per_feed))
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value.filter(item => 
          item.pubDate.getTime() > maxAge
        ));
      }
    }
    
    // Sort by recency
    allItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    
    // Deduplicate
    return this.deduplicate(allItems, config.settings.dedup_threshold);
  }
  
  async fetchAllCategories(): Promise<Record<string, FeedItem[]>> {
    const config = await this.loadConfig();
    const categories = Object.keys(config.feeds);
    
    const results: Record<string, FeedItem[]> = {};
    
    await Promise.all(
      categories.map(async cat => {
        results[cat] = await this.fetchCategory(cat);
      })
    );
    
    return results;
  }
  
  private async fetchSingleFeed(source: NewsSource, limit: number): Promise<FeedItem[]> {
    try {
      const feed = await parser.parseURL(source.url);
      
      return (feed.items || []).slice(0, limit).map(item => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        pubDate: new Date(item.pubDate || item.isoDate || Date.now()),
        source: source.name,
        sourceType: source.type,
        trustScore: SOURCE_TRUST_SCORES[source.type],
        snippet: item.contentSnippet?.substring(0, 200),
      }));
    } catch (error) {
      console.error(`Failed to fetch ${source.name}: ${error}`);
      return [];
    }
  }
  
  private deduplicate(items: FeedItem[], threshold: number): FeedItem[] {
    const seen = new Map<string, FeedItem>();
    
    for (const item of items) {
      // Simple title-based deduplication
      const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let isDupe = false;
      for (const [key, existing] of seen) {
        if (this.similarity(normalizedTitle, key) > threshold) {
          // Keep higher trust score version
          if (item.trustScore > existing.trustScore) {
            seen.delete(key);
            seen.set(normalizedTitle, item);
          }
          isDupe = true;
          break;
        }
      }
      
      if (!isDupe) {
        seen.set(normalizedTitle, item);
      }
    }
    
    return Array.from(seen.values());
  }
  
  private similarity(a: string, b: string): number {
    // Simple Jaccard similarity for now
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }
}

export const feedFetcher = new FeedFetcher();
```

## URL Verification

**Critical**: AI models hallucinate URLs. Every URL must be verified before inclusion.

```typescript
// lib/research/url-verifier.ts

interface VerificationResult {
  url: string;
  valid: boolean;
  status?: number;
  error?: string;
  title?: string;
}

export async function verifyUrl(url: string): Promise<VerificationResult> {
  try {
    // Step 1: HTTP status check
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Yxhyx/1.0 (URL Verification)',
      },
    });
    
    if (!response.ok) {
      return {
        url,
        valid: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      };
    }
    
    // Step 2: For full verification, fetch content
    const contentResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Yxhyx/1.0 (URL Verification)',
      },
    });
    
    const text = await contentResponse.text();
    
    // Extract title to confirm it's the expected content
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    
    return {
      url,
      valid: true,
      status: response.status,
      title: titleMatch?.[1]?.trim(),
    };
  } catch (error) {
    return {
      url,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function verifyUrls(urls: string[]): Promise<VerificationResult[]> {
  // Verify in parallel with concurrency limit
  const CONCURRENCY = 5;
  const results: VerificationResult[] = [];
  
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(verifyUrl));
    results.push(...batchResults);
  }
  
  return results;
}

export function filterValidUrls(results: VerificationResult[]): string[] {
  return results.filter(r => r.valid).map(r => r.url);
}
```

## Research Modes

### Quick Research (Kimi k2.5)

```typescript
// lib/research/quick-research.ts

import { modelRouter } from '../model-router';
import { verifyUrls } from './url-verifier';

interface QuickResearchResult {
  query: string;
  summary: string;
  sources: Array<{ title: string; url: string; verified: boolean }>;
  model: string;
  cost: number;
}

export async function quickResearch(query: string): Promise<QuickResearchResult> {
  const router = modelRouter;
  const { provider, model } = router.route({ complexity: 'QUICK' });
  
  const response = await router.complete({
    model,
    messages: [{
      role: 'user',
      content: `Research this topic and provide a brief summary with sources:

Topic: ${query}

Respond in JSON format:
{
  "summary": "2-3 paragraph summary",
  "sources": [
    { "title": "Source Title", "url": "https://..." },
    ...
  ]
}

Include 3-5 credible sources. Only use URLs you are confident exist.`,
    }],
  });
  
  const result = JSON.parse(response.content);
  
  // Verify URLs
  const urlResults = await verifyUrls(result.sources.map((s: any) => s.url));
  const verifiedSources = result.sources.map((s: any, i: number) => ({
    ...s,
    verified: urlResults[i].valid,
  }));
  
  return {
    query,
    summary: result.summary,
    sources: verifiedSources,
    model,
    cost: response.cost,
  };
}
```

### Standard Research (Multi-Model)

```typescript
// lib/research/standard-research.ts

import { modelRouter } from '../model-router';
import { verifyUrls } from './url-verifier';

interface StandardResearchResult {
  query: string;
  synthesis: string;
  perspectives: Array<{
    model: string;
    summary: string;
    sources: Array<{ title: string; url: string; verified: boolean }>;
  }>;
  totalCost: number;
}

export async function standardResearch(query: string): Promise<StandardResearchResult> {
  // Use two models in parallel
  const models = ['kimi', 'openrouter/google/gemini-2.0-flash-001'];
  
  const results = await Promise.all(
    models.map(async model => {
      const response = await modelRouter.complete({
        model,
        messages: [{
          role: 'user',
          content: `Research this topic thoroughly:

Topic: ${query}

Provide:
1. A comprehensive summary (3-4 paragraphs)
2. Key findings
3. Sources (include URLs)

Format as JSON:
{
  "summary": "...",
  "keyFindings": ["...", "..."],
  "sources": [{ "title": "...", "url": "..." }]
}`,
        }],
      });
      
      return { model, response };
    })
  );
  
  // Verify all URLs
  const allUrls = results.flatMap(r => {
    try {
      return JSON.parse(r.response.content).sources.map((s: any) => s.url);
    } catch {
      return [];
    }
  });
  
  const urlVerification = await verifyUrls(allUrls);
  const urlStatus = new Map(urlVerification.map(v => [v.url, v.valid]));
  
  // Build perspectives
  const perspectives = results.map(r => {
    try {
      const data = JSON.parse(r.response.content);
      return {
        model: r.model,
        summary: data.summary,
        sources: data.sources.map((s: any) => ({
          ...s,
          verified: urlStatus.get(s.url) ?? false,
        })),
      };
    } catch {
      return {
        model: r.model,
        summary: 'Failed to parse response',
        sources: [],
      };
    }
  });
  
  // Synthesize
  const synthesis = await synthesizePerspectives(query, perspectives);
  
  return {
    query,
    synthesis,
    perspectives,
    totalCost: results.reduce((sum, r) => sum + (r.response.cost || 0), 0),
  };
}

async function synthesizePerspectives(
  query: string,
  perspectives: Array<{ model: string; summary: string }>
): Promise<string> {
  const response = await modelRouter.complete({
    model: 'cheapest',
    messages: [{
      role: 'user',
      content: `Synthesize these research perspectives into a unified summary:

Query: ${query}

Perspectives:
${perspectives.map(p => `
### ${p.model}
${p.summary}
`).join('\n')}

Create a unified summary that:
1. Highlights where perspectives agree (high confidence)
2. Notes unique contributions from each
3. Flags any conflicts or uncertainties

Respond with the synthesized summary only.`,
    }],
  });
  
  return response.content;
}
```

## News Digest Generation

```typescript
// lib/research/news-digest.ts

import { feedFetcher, type FeedItem } from './feed-fetcher';
import { loadIdentity } from '../context-loader';
import { modelRouter } from '../model-router';

interface NewsDigest {
  generated: string;
  categories: Array<{
    name: string;
    items: Array<{
      title: string;
      link: string;
      source: string;
      relevance: 'high' | 'medium' | 'low';
      summary?: string;
    }>;
  }>;
  highlights: string[];
  goalRelevant: Array<{
    item: FeedItem;
    relatedGoal: string;
  }>;
}

export async function generateNewsDigest(): Promise<NewsDigest> {
  const identity = await loadIdentity();
  const allFeeds = await feedFetcher.fetchAllCategories();
  
  // Get user interests for relevance scoring
  const interests = [
    ...identity.interests.high_priority.map(i => i.topic),
    ...identity.interests.high_priority.flatMap(i => i.subtopics),
  ];
  
  // Get user goals for goal-relevance matching
  const activeGoals = [
    ...identity.goals.short_term,
    ...identity.goals.medium_term,
  ].filter(g => g.progress < 1);
  
  const categories: NewsDigest['categories'] = [];
  const goalRelevant: NewsDigest['goalRelevant'] = [];
  
  for (const [categoryName, items] of Object.entries(allFeeds)) {
    // Score relevance based on interests
    const scoredItems = items.map(item => {
      const titleLower = item.title.toLowerCase();
      const interestMatches = interests.filter(i => 
        titleLower.includes(i.toLowerCase())
      ).length;
      
      const relevance: 'high' | 'medium' | 'low' = 
        interestMatches >= 2 ? 'high' :
        interestMatches === 1 ? 'medium' : 'low';
      
      // Check goal relevance
      for (const goal of activeGoals) {
        const goalWords = goal.title.toLowerCase().split(/\W+/);
        if (goalWords.some(w => w.length > 3 && titleLower.includes(w))) {
          goalRelevant.push({ item, relatedGoal: goal.title });
          break;
        }
      }
      
      return { ...item, relevance };
    });
    
    // Sort by relevance then recency
    scoredItems.sort((a, b) => {
      const relevanceOrder = { high: 0, medium: 1, low: 2 };
      if (relevanceOrder[a.relevance] !== relevanceOrder[b.relevance]) {
        return relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
      }
      return b.pubDate.getTime() - a.pubDate.getTime();
    });
    
    // Take top items based on user preference
    const maxItems = identity.preferences.news.max_items;
    const topItems = scoredItems.slice(0, maxItems);
    
    categories.push({
      name: categoryName,
      items: topItems.map(item => ({
        title: item.title,
        link: item.link,
        source: item.source,
        relevance: item.relevance,
        summary: item.snippet,
      })),
    });
  }
  
  // Generate highlights using AI
  const highlights = await generateHighlights(categories);
  
  return {
    generated: new Date().toISOString(),
    categories,
    highlights,
    goalRelevant,
  };
}

async function generateHighlights(
  categories: NewsDigest['categories']
): Promise<string[]> {
  const highRelevanceItems = categories.flatMap(c => 
    c.items.filter(i => i.relevance === 'high')
  );
  
  if (highRelevanceItems.length === 0) {
    return ['No high-priority news today'];
  }
  
  const response = await modelRouter.complete({
    model: 'cheapest',
    messages: [{
      role: 'user',
      content: `Summarize these news items into 3-5 key highlights:

${highRelevanceItems.map(i => `- ${i.title} (${i.source})`).join('\n')}

Respond with a JSON array of highlight strings, each 1-2 sentences.`,
    }],
  });
  
  try {
    return JSON.parse(response.content);
  } catch {
    return highRelevanceItems.slice(0, 5).map(i => i.title);
  }
}
```

## News Command Implementation

```typescript
// commands/news.ts

import { Command } from 'commander';
import { generateNewsDigest } from '../lib/research/news-digest';
import { loadIdentity } from '../lib/context-loader';

export const newsCommand = new Command('news')
  .description('Get personalized news digest')
  .option('-c, --category <name>', 'Specific category (tech_ai, security, custom)')
  .option('-f, --format <type>', 'Output format: bullet, detailed', 'bullet')
  .action(async (options) => {
    console.log('Fetching news...\n');
    
    const digest = await generateNewsDigest();
    const identity = await loadIdentity();
    
    // Display based on format preference
    const format = options.format || identity.preferences.news.format;
    
    if (digest.goalRelevant.length > 0) {
      console.log('Related to Your Goals:');
      console.log('');
      for (const { item, relatedGoal } of digest.goalRelevant.slice(0, 3)) {
        console.log(`  [${relatedGoal}]`);
        console.log(`  ${item.title}`);
        console.log(`  ${item.link}`);
        console.log('');
      }
    }
    
    console.log('Highlights:');
    for (const highlight of digest.highlights) {
      console.log(`  ${highlight}`);
    }
    console.log('');
    
    const categoriesToShow = options.category 
      ? digest.categories.filter(c => c.name === options.category)
      : digest.categories;
    
    for (const category of categoriesToShow) {
      console.log(`\n${category.name.toUpperCase()}`);
      console.log('='.repeat(category.name.length));
      
      for (const item of category.items) {
        const relevanceIcon = { high: '', medium: '', low: '' }[item.relevance];
        
        if (format === 'bullet') {
          console.log(`${relevanceIcon} ${item.title}`);
          console.log(`   ${item.source} | ${item.link}`);
        } else {
          console.log(`\n${relevanceIcon} ${item.title}`);
          console.log(`   Source: ${item.source}`);
          console.log(`   URL: ${item.link}`);
          if (item.summary) {
            console.log(`   ${item.summary}`);
          }
        }
      }
    }
    
    console.log(`\n---`);
    console.log(`Generated: ${new Date(digest.generated).toLocaleString()}`);
  });

// Research subcommand
newsCommand
  .command('research <query>')
  .description('Research a topic')
  .option('-d, --deep', 'Use multi-model deep research')
  .action(async (query, options) => {
    if (options.deep) {
      const { standardResearch } = await import('../lib/research/standard-research');
      console.log('Running multi-model research...\n');
      const result = await standardResearch(query);
      
      console.log('SYNTHESIS');
      console.log('=========');
      console.log(result.synthesis);
      console.log('');
      
      for (const perspective of result.perspectives) {
        console.log(`\n--- ${perspective.model} ---`);
        console.log(perspective.summary);
        console.log('\nSources:');
        for (const source of perspective.sources) {
          const icon = source.verified ? '' : '';
          console.log(`  ${icon} ${source.title}: ${source.url}`);
        }
      }
      
      console.log(`\nTotal cost: $${result.totalCost.toFixed(4)}`);
    } else {
      const { quickResearch } = await import('../lib/research/quick-research');
      console.log('Running quick research...\n');
      const result = await quickResearch(query);
      
      console.log(result.summary);
      console.log('\nSources:');
      for (const source of result.sources) {
        const icon = source.verified ? '' : '';
        console.log(`  ${icon} ${source.title}: ${source.url}`);
      }
      
      console.log(`\nCost: $${result.cost.toFixed(4)}`);
    }
  });

// Add feed management
newsCommand
  .command('add-feed <url>')
  .description('Add a custom RSS feed')
  .option('-n, --name <name>', 'Feed name')
  .option('-t, --type <type>', 'Source type', 'custom')
  .action(async (url, options) => {
    // Implementation: add to feeds.yaml custom section
    console.log(`Added feed: ${options.name || url}`);
  });
```

## Perspective Diversity Tracking

```typescript
// lib/research/perspective-tracker.ts

interface PerspectiveBalance {
  left: number;
  center: number;
  right: number;
  international: number;
  trade: number;
}

export function analyzePerspectiveBalance(
  sources: Array<{ name: string; bias?: string }>
): PerspectiveBalance {
  const balance: PerspectiveBalance = {
    left: 0,
    center: 0,
    right: 0,
    international: 0,
    trade: 0,
  };
  
  // Known source biases (simplified)
  const biasMap: Record<string, keyof PerspectiveBalance> = {
    'The Guardian': 'left',
    'BBC': 'center',
    'Reuters': 'center',
    'AP': 'center',
    'WSJ': 'right',
    'The Economist': 'center',
    // Add more as needed
  };
  
  for (const source of sources) {
    const bias = source.bias || biasMap[source.name] || 'center';
    if (bias in balance) {
      balance[bias as keyof PerspectiveBalance]++;
    }
  }
  
  return balance;
}

export function perspectiveWarnings(balance: PerspectiveBalance): string[] {
  const warnings: string[] = [];
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  
  if (total === 0) return ['No sources to analyze'];
  
  if (balance.left / total > 0.6) {
    warnings.push('Coverage skews left-leaning');
  }
  if (balance.right / total > 0.6) {
    warnings.push('Coverage skews right-leaning');
  }
  if (balance.international === 0 && total > 3) {
    warnings.push('Missing international perspective');
  }
  
  return warnings;
}
```

## Key Improvements Over PAI

| PAI Issue | Yxhyx Solution |
|-----------|----------------|
| No recency filtering | `max_age_hours` config, recency-weighted sorting |
| No source categorization | `SourceCategory` types with trust scores |
| No RSS integration | `FeedFetcher` with parallel fetch |
| No perspective tracking | `PerspectiveBalance` analysis |
| No deduplication | Title-based dedup with similarity threshold |
| No goal relevance | Items matched against active goals |
| Generic research only | News-optimized digest generation |
| No cost tracking | Cost returned with each research result |

## Example Output

```
$ yxhyx news

Related to Your Goals:

  [Complete Yxhyx MVP]
  OpenAI Announces New Agents SDK for Building AI Assistants
  https://openai.com/blog/agents-sdk

Highlights:
  Major security vulnerability found in popular npm packages
  AI coding assistants now used by 60% of developers
  New research shows LLM costs dropping 10x per year

TECH_AI
=======
 OpenAI Announces New Agents SDK
   TLDR | https://tldr.tech/...
 Anthropic Releases Claude 4
   Hacker News | https://news.ycombinator.com/...
 Local LLMs Now Match GPT-4
   The Verge | https://theverge.com/...

SECURITY
========
 Critical npm Vulnerability - CVE-2026-1234
   tl;dr sec | https://tldrsec.com/...
 Ransomware Attack Hits Major Hospital Chain
   Krebs on Security | https://krebsonsecurity.com/...

---
Generated: 2/1/2026, 10:30:00 AM
```
