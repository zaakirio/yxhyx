# Memory System - Persistent Learning

## Overview

The Memory System enables Yxhyx to learn from experience, remember past interactions, and improve over time. Unlike PAI's complex hook-based system, we implement a simpler, more focused architecture that emphasizes **learning retrieval** - the ability to apply past lessons to current decisions.

## Design Principles

### What PAI Does Well
- Separate domains (WORK, LEARNING, SIGNALS, STATE)
- Dual feedback capture (explicit + implicit)
- Temporal organization (YYYY-MM directories)
- Anti-criteria tracking (what to avoid)

### What We Improve
- **Learning retrieval** - Actually use captured learnings
- **Positive pattern capture** - What worked, not just failures
- **Reduced complexity** - Simpler work tracking for simple tasks
- **Context injection** - Apply learnings automatically
- **Work-learning linkage** - Connect work to lessons learned

## Architecture Overview

```
~/.yxhyx/memory/
├── work/                       # Task tracking
│   ├── {task_id}.jsonl         # Simple tasks (TRIVIAL/QUICK)
│   └── {task_id}/              # Complex tasks (STANDARD+)
│       ├── meta.yaml
│       ├── items.jsonl
│       └── artifacts/
│
├── learning/
│   ├── signals/
│   │   └── ratings.jsonl       # All feedback (explicit + implicit)
│   ├── patterns/
│   │   └── {date}.md           # Synthesized patterns
│   └── positive/
│       └── {date}.md           # What worked well
│
└── state/
    ├── current.json            # Active work context
    ├── checkin-history.jsonl   # Check-in log
    └── cost-tracking.json      # API cost tracking
```

## Work Tracking

### Effort-Based Complexity

Instead of always creating full directories, use effort level to determine structure:

| Effort | Structure | When |
|--------|-----------|------|
| TRIVIAL | No tracking | Simple Q&A, greetings |
| QUICK | Single JSONL file | < 5 minute tasks |
| STANDARD | Directory with meta | 5-30 minute tasks |
| THOROUGH | Full directory with artifacts | 30+ minute tasks |

### Work Item Schema

```typescript
// lib/schemas/work.ts

import { z } from 'zod';

export const WorkItemSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  prompt: z.string(),
  response_summary: z.string().optional(),
  effort: z.enum(['TRIVIAL', 'QUICK', 'STANDARD', 'THOROUGH']),
  status: z.enum(['active', 'completed', 'abandoned']),
  rating: z.number().min(1).max(10).optional(),
  files_changed: z.array(z.string()).default([]),
  tools_used: z.array(z.string()).default([]),
  duration_seconds: z.number().optional(),
  cost_usd: z.number().optional(),
  model_used: z.string().optional(),
  learning_id: z.string().optional(), // Link to generated learning
});

export const WorkMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  created: z.string(),
  updated: z.string(),
  effort: z.enum(['TRIVIAL', 'QUICK', 'STANDARD', 'THOROUGH']),
  status: z.enum(['active', 'completed', 'abandoned']),
  total_items: z.number(),
  total_cost_usd: z.number().default(0),
  related_goals: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export type WorkItem = z.infer<typeof WorkItemSchema>;
export type WorkMeta = z.infer<typeof WorkMetaSchema>;
```

### Work Manager Implementation

```typescript
// lib/memory/work-manager.ts

import { readFile, writeFile, mkdir, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { parse, stringify } from 'yaml';
import { WorkItemSchema, WorkMetaSchema, type WorkItem, type WorkMeta } from '../schemas/work';

const WORK_DIR = `${process.env.HOME}/.yxhyx/memory/work`;
const STATE_FILE = `${process.env.HOME}/.yxhyx/memory/state/current.json`;

export class WorkManager {
  
  // Create new work (effort determines structure)
  async createWork(prompt: string, effort: WorkItem['effort']): Promise<string> {
    const id = `${Date.now()}-${this.slugify(prompt)}`;
    const timestamp = new Date().toISOString();
    
    const item: WorkItem = {
      id: `${id}-1`,
      timestamp,
      prompt,
      effort,
      status: 'active',
      files_changed: [],
      tools_used: [],
    };
    
    if (effort === 'TRIVIAL') {
      // Don't persist trivial work
      return id;
    }
    
    if (effort === 'QUICK') {
      // Single file
      const filePath = `${WORK_DIR}/${id}.jsonl`;
      await appendFile(filePath, JSON.stringify(item) + '\n');
    } else {
      // Directory structure
      const workDir = `${WORK_DIR}/${id}`;
      await mkdir(workDir, { recursive: true });
      
      const meta: WorkMeta = {
        id,
        title: prompt.substring(0, 100),
        created: timestamp,
        updated: timestamp,
        effort,
        status: 'active',
        total_items: 1,
        total_cost_usd: 0,
        related_goals: [],
        tags: [],
      };
      
      await writeFile(`${workDir}/meta.yaml`, stringify(meta));
      await appendFile(`${workDir}/items.jsonl`, JSON.stringify(item) + '\n');
    }
    
    // Update current state
    await this.setCurrentWork(id, effort);
    
    return id;
  }
  
  // Add item to existing work
  async addItem(workId: string, item: Partial<WorkItem>): Promise<void> {
    const effort = await this.getWorkEffort(workId);
    
    const fullItem: WorkItem = WorkItemSchema.parse({
      id: `${workId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      effort,
      status: 'active',
      files_changed: [],
      tools_used: [],
      ...item,
    });
    
    if (effort === 'QUICK') {
      await appendFile(`${WORK_DIR}/${workId}.jsonl`, JSON.stringify(fullItem) + '\n');
    } else {
      await appendFile(`${WORK_DIR}/${workId}/items.jsonl`, JSON.stringify(fullItem) + '\n');
      await this.updateMeta(workId, { total_items: (await this.getItems(workId)).length });
    }
  }
  
  // Complete work
  async completeWork(workId: string, rating?: number): Promise<void> {
    const effort = await this.getWorkEffort(workId);
    
    if (effort === 'QUICK') {
      // Just clear current state
    } else {
      await this.updateMeta(workId, { 
        status: 'completed',
        updated: new Date().toISOString(),
      });
    }
    
    // Clear current work
    await this.clearCurrentWork();
    
    // If rated, capture learning
    if (rating !== undefined) {
      const { captureLearning } = await import('./learning-manager');
      await captureLearning(workId, rating);
    }
  }
  
  // Get current work
  async getCurrentWork(): Promise<{ id: string; effort: string } | null> {
    try {
      const content = await readFile(STATE_FILE, 'utf-8');
      const state = JSON.parse(content);
      return state.currentWork || null;
    } catch {
      return null;
    }
  }
  
  private async setCurrentWork(id: string, effort: string): Promise<void> {
    const state = await this.getState();
    state.currentWork = { id, effort };
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  }
  
  private async clearCurrentWork(): Promise<void> {
    const state = await this.getState();
    delete state.currentWork;
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  }
  
  private async getState(): Promise<Record<string, any>> {
    try {
      const content = await readFile(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  
  private async getWorkEffort(workId: string): Promise<WorkItem['effort']> {
    // Check if it's a directory or file
    if (existsSync(`${WORK_DIR}/${workId}/meta.yaml`)) {
      const content = await readFile(`${WORK_DIR}/${workId}/meta.yaml`, 'utf-8');
      const meta = parse(content) as WorkMeta;
      return meta.effort;
    }
    if (existsSync(`${WORK_DIR}/${workId}.jsonl`)) {
      return 'QUICK';
    }
    return 'TRIVIAL';
  }
  
  private async getItems(workId: string): Promise<WorkItem[]> {
    const effort = await this.getWorkEffort(workId);
    const path = effort === 'QUICK' 
      ? `${WORK_DIR}/${workId}.jsonl`
      : `${WORK_DIR}/${workId}/items.jsonl`;
    
    const content = await readFile(path, 'utf-8');
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  }
  
  private async updateMeta(workId: string, updates: Partial<WorkMeta>): Promise<void> {
    const metaPath = `${WORK_DIR}/${workId}/meta.yaml`;
    const content = await readFile(metaPath, 'utf-8');
    const meta = parse(content) as WorkMeta;
    const updated = { ...meta, ...updates };
    await writeFile(metaPath, stringify(updated));
  }
  
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

export const workManager = new WorkManager();
```

## Learning Capture

### Unified Rating Schema

Unlike PAI's dual schema, we use a single unified format:

```typescript
// lib/schemas/learning.ts

import { z } from 'zod';

export const RatingSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  rating: z.number().min(1).max(10),
  source: z.enum(['explicit', 'implicit']),
  
  // Context
  work_id: z.string().optional(),
  prompt_snippet: z.string().optional(),
  response_snippet: z.string().optional(),
  
  // For explicit ratings
  comment: z.string().optional(),
  
  // For implicit ratings
  sentiment_summary: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  
  // Derived
  model_used: z.string().optional(),
  cost_usd: z.number().optional(),
});

export const LearningSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  type: z.enum(['failure', 'success', 'insight']),
  
  // What happened
  situation: z.string(),
  what_went_wrong: z.string().optional(),
  what_went_right: z.string().optional(),
  
  // What to do differently
  lesson: z.string(),
  action_items: z.array(z.string()).default([]),
  
  // Links
  work_id: z.string().optional(),
  rating_id: z.string().optional(),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  embeddings: z.array(z.number()).optional(), // For retrieval
});

export type Rating = z.infer<typeof RatingSchema>;
export type Learning = z.infer<typeof LearningSchema>;
```

### Learning Manager Implementation

```typescript
// lib/memory/learning-manager.ts

import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { RatingSchema, LearningSchema, type Rating, type Learning } from '../schemas/learning';

const SIGNALS_DIR = `${process.env.HOME}/.yxhyx/memory/learning/signals`;
const PATTERNS_DIR = `${process.env.HOME}/.yxhyx/memory/learning/patterns`;
const POSITIVE_DIR = `${process.env.HOME}/.yxhyx/memory/learning/positive`;

export class LearningManager {
  
  // Capture a rating (called by rating capture functions)
  async captureRating(rating: Rating): Promise<void> {
    await appendFile(
      `${SIGNALS_DIR}/ratings.jsonl`,
      JSON.stringify(rating) + '\n'
    );
    
    // Auto-generate learning for low or high ratings
    if (rating.rating <= 5) {
      await this.generateFailureLearning(rating);
    } else if (rating.rating >= 8) {
      await this.generateSuccessLearning(rating);
    }
  }
  
  // Parse explicit rating from user input
  parseExplicitRating(input: string): { rating: number; comment?: string } | null {
    // Patterns: "7", "8 - good", "6: needs work", "rating: 9"
    const patterns = [
      /^(10|[1-9])$/,                           // Just number
      /^(10|[1-9])\s*[-:]\s*(.+)$/,             // Number with comment
      /^rating[:\s]*(10|[1-9])(?:\s*[-:]\s*(.+))?$/i,  // "rating: X"
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        // Validate it's not a false positive like "3 items" or "5 things"
        const falsePositives = /^\d+\s+(items?|things?|files?|bugs?|issues?|points?|steps?)/i;
        if (falsePositives.test(input)) {
          return null;
        }
        
        return {
          rating: parseInt(match[1]),
          comment: match[2]?.trim(),
        };
      }
    }
    
    return null;
  }
  
  // Analyze implicit sentiment (requires AI call)
  async analyzeImplicitSentiment(
    prompt: string,
    aiClient: any, // Your AI client
  ): Promise<{ rating: number; summary: string; confidence: number } | null> {
    // Skip very short prompts
    if (prompt.length < 15) return null;
    
    // Skip command-like prompts
    if (/^(yes|no|ok|sure|continue|do it|go ahead|next|done)/i.test(prompt)) {
      return null;
    }
    
    const analysis = await aiClient.complete({
      model: 'cheapest', // Use model router
      messages: [{
        role: 'user',
        content: `Analyze the emotional tone of this message and rate satisfaction 1-10.

Message: "${prompt}"

Respond in JSON format:
{
  "rating": <1-10>,
  "summary": "<brief explanation>",
  "confidence": <0-1>
}

Rating scale:
1-2: Strong frustration/anger
3-4: Mild dissatisfaction  
5: Neutral
6-7: Satisfaction
8-9: Strong approval
10: Extraordinary enthusiasm

Only respond with JSON.`,
      }],
    });
    
    try {
      return JSON.parse(analysis.content);
    } catch {
      return null;
    }
  }
  
  // Generate learning from failure (low rating)
  private async generateFailureLearning(rating: Rating): Promise<void> {
    const learning: Learning = {
      id: `learning-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'failure',
      situation: rating.prompt_snippet || 'Unknown',
      what_went_wrong: rating.sentiment_summary || rating.comment || 'Unspecified',
      lesson: await this.extractLesson(rating, 'failure'),
      action_items: [],
      work_id: rating.work_id,
      rating_id: rating.id,
      tags: ['auto-captured', 'improvement-needed'],
    };
    
    const date = new Date().toISOString().split('T')[0];
    const dir = `${PATTERNS_DIR}/${date.substring(0, 7)}`; // YYYY-MM
    await mkdir(dir, { recursive: true });
    
    await appendFile(
      `${dir}/failures.jsonl`,
      JSON.stringify(learning) + '\n'
    );
  }
  
  // Generate learning from success (high rating)
  private async generateSuccessLearning(rating: Rating): Promise<void> {
    const learning: Learning = {
      id: `learning-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'success',
      situation: rating.prompt_snippet || 'Unknown',
      what_went_right: rating.sentiment_summary || rating.comment || 'Unspecified',
      lesson: await this.extractLesson(rating, 'success'),
      action_items: [],
      work_id: rating.work_id,
      rating_id: rating.id,
      tags: ['auto-captured', 'positive-pattern'],
    };
    
    const date = new Date().toISOString().split('T')[0];
    const dir = `${POSITIVE_DIR}/${date.substring(0, 7)}`; // YYYY-MM
    await mkdir(dir, { recursive: true });
    
    await appendFile(
      `${dir}/successes.jsonl`,
      JSON.stringify(learning) + '\n'
    );
  }
  
  private async extractLesson(rating: Rating, type: 'failure' | 'success'): Promise<string> {
    // Simple heuristic extraction - could be enhanced with AI
    if (type === 'failure') {
      return rating.comment 
        ? `Avoid: ${rating.comment}`
        : 'Review approach for similar tasks';
    }
    return rating.comment
      ? `Replicate: ${rating.comment}`
      : 'Continue this approach for similar tasks';
  }
  
  // CRITICAL: Retrieve relevant learnings for current context
  async retrieveRelevantLearnings(context: string, limit = 5): Promise<Learning[]> {
    const allLearnings = await this.getAllLearnings();
    
    // Simple keyword matching (could be enhanced with embeddings)
    const contextWords = new Set(
      context.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    );
    
    const scored = allLearnings.map(learning => {
      const learningText = `${learning.situation} ${learning.lesson}`.toLowerCase();
      const learningWords = learningText.split(/\W+/);
      const matches = learningWords.filter(w => contextWords.has(w)).length;
      return { learning, score: matches };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter(s => s.score > 0)
      .map(s => s.learning);
  }
  
  private async getAllLearnings(): Promise<Learning[]> {
    const learnings: Learning[] = [];
    
    // Read from patterns and positive directories
    for (const dir of [PATTERNS_DIR, POSITIVE_DIR]) {
      if (!existsSync(dir)) continue;
      
      const { readdir } = await import('fs/promises');
      const months = await readdir(dir);
      
      for (const month of months) {
        const files = await readdir(`${dir}/${month}`);
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue;
          const content = await readFile(`${dir}/${month}/${file}`, 'utf-8');
          const lines = content.trim().split('\n').filter(Boolean);
          learnings.push(...lines.map(l => JSON.parse(l)));
        }
      }
    }
    
    return learnings;
  }
  
  // Get recent ratings for synthesis
  async getRecentRatings(days = 7): Promise<Rating[]> {
    const content = await readFile(`${SIGNALS_DIR}/ratings.jsonl`, 'utf-8');
    const ratings = content.trim().split('\n').filter(Boolean).map(l => JSON.parse(l) as Rating);
    
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return ratings.filter(r => new Date(r.timestamp).getTime() > cutoff);
  }
  
  // Synthesize patterns from recent signals
  async synthesizePatterns(): Promise<string> {
    const ratings = await this.getRecentRatings(7);
    
    if (ratings.length === 0) {
      return 'No ratings to analyze';
    }
    
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const lowRatings = ratings.filter(r => r.rating <= 5);
    const highRatings = ratings.filter(r => r.rating >= 8);
    
    const learnings = await this.getAllLearnings();
    const recentFailures = learnings
      .filter(l => l.type === 'failure')
      .slice(-5);
    const recentSuccesses = learnings
      .filter(l => l.type === 'success')
      .slice(-5);
    
    return `
# Weekly Pattern Synthesis

**Period:** Last 7 days
**Total Interactions:** ${ratings.length}
**Average Rating:** ${avgRating.toFixed(1)}/10

## Satisfaction Breakdown
- High satisfaction (8+): ${highRatings.length}
- Neutral (6-7): ${ratings.length - lowRatings.length - highRatings.length}
- Low satisfaction (1-5): ${lowRatings.length}

## Recent Failures to Avoid
${recentFailures.map(f => `- ${f.lesson}`).join('\n') || 'None captured'}

## Recent Successes to Replicate
${recentSuccesses.map(s => `- ${s.lesson}`).join('\n') || 'None captured'}

## Action Items
${lowRatings.length > 2 ? '- Review common themes in low ratings' : ''}
${avgRating < 7 ? '- Investigate quality issues' : ''}
${highRatings.length > 0 ? '- Document what made high-rated interactions successful' : ''}
`;
  }
}

export const learningManager = new LearningManager();

// Convenience functions for use in other modules
export async function captureLearning(workId: string, rating: number) {
  await learningManager.captureRating({
    id: `rating-${Date.now()}`,
    timestamp: new Date().toISOString(),
    rating,
    source: 'explicit',
    work_id: workId,
  });
}

export async function retrieveRelevantLearnings(context: string, limit = 5) {
  return learningManager.retrieveRelevantLearnings(context, limit);
}
```

## Context Injection

The key innovation: **automatically inject relevant learnings into AI context**.

```typescript
// lib/memory/context-injection.ts

import { retrieveRelevantLearnings } from './learning-manager';
import { loadIdentity } from '../context-loader';
import { workManager } from './work-manager';

export async function buildEnhancedContext(
  prompt: string,
  taskType: string
): Promise<string> {
  // Get identity context
  const identity = await loadIdentity();
  
  // Get relevant past learnings
  const learnings = await retrieveRelevantLearnings(prompt, 3);
  
  // Get current work context
  const currentWork = await workManager.getCurrentWork();
  
  // Build enhanced context
  let context = `
<user_context>
Name: ${identity.about.name}
Communication: ${identity.preferences.communication.style}, ${identity.preferences.communication.length}
`;

  if (taskType === 'checkin') {
    const activeGoals = [
      ...identity.goals.short_term,
      ...identity.goals.medium_term,
    ].filter(g => g.progress < 1);
    
    context += `
Active Goals:
${activeGoals.map(g => `- ${g.title} (${Math.round(g.progress * 100)}%)`).join('\n')}
`;
  }

  if (learnings.length > 0) {
    context += `
</user_context>

<relevant_learnings>
From past interactions, remember:
${learnings.map(l => `- ${l.lesson}`).join('\n')}
</relevant_learnings>
`;
  } else {
    context += `</user_context>`;
  }

  if (currentWork) {
    context += `
<current_work>
Continuing work: ${currentWork.id}
</current_work>
`;
  }

  return context;
}
```

## State Management

```typescript
// lib/memory/state-manager.ts

import { readFile, writeFile } from 'fs/promises';

const STATE_FILE = `${process.env.HOME}/.yxhyx/memory/state/current.json`;
const CHECKIN_FILE = `${process.env.HOME}/.yxhyx/memory/state/checkin-history.jsonl`;
const COST_FILE = `${process.env.HOME}/.yxhyx/memory/state/cost-tracking.json`;

interface AppState {
  initialized: boolean;
  currentWork?: { id: string; effort: string };
  lastCheckin?: { type: string; timestamp: string };
  sessionStart?: string;
}

export async function getState(): Promise<AppState> {
  try {
    const content = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { initialized: false };
  }
}

export async function setState(updates: Partial<AppState>): Promise<void> {
  const current = await getState();
  const updated = { ...current, ...updates };
  await writeFile(STATE_FILE, JSON.stringify(updated, null, 2));
}

// Check-in history
export async function recordCheckin(type: 'morning' | 'evening' | 'weekly', data: any): Promise<void> {
  const entry = {
    type,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  await appendFile(CHECKIN_FILE, JSON.stringify(entry) + '\n');
  await setState({ lastCheckin: { type, timestamp: entry.timestamp } });
}

export async function getCheckinHistory(limit = 30): Promise<any[]> {
  try {
    const content = await readFile(CHECKIN_FILE, 'utf-8');
    const entries = content.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    return entries.slice(-limit);
  } catch {
    return [];
  }
}

// Cost tracking
export async function recordCost(model: string, cost: number): Promise<void> {
  let tracking: Record<string, number> = {};
  
  try {
    const content = await readFile(COST_FILE, 'utf-8');
    tracking = JSON.parse(content);
  } catch {}
  
  const month = new Date().toISOString().substring(0, 7); // YYYY-MM
  const key = `${month}:${model}`;
  tracking[key] = (tracking[key] || 0) + cost;
  tracking[`${month}:total`] = (tracking[`${month}:total`] || 0) + cost;
  
  await writeFile(COST_FILE, JSON.stringify(tracking, null, 2));
}

export async function getMonthlyCost(month?: string): Promise<number> {
  const targetMonth = month || new Date().toISOString().substring(0, 7);
  
  try {
    const content = await readFile(COST_FILE, 'utf-8');
    const tracking = JSON.parse(content);
    return tracking[`${targetMonth}:total`] || 0;
  } catch {
    return 0;
  }
}

import { appendFile } from 'fs/promises';
```

## Key Improvements Over PAI

| PAI Issue | Yxhyx Solution |
|-----------|----------------|
| Capture-heavy, retrieval-light | `retrieveRelevantLearnings()` surfaces past lessons |
| Only captures failures | Both failures AND successes captured |
| Work-learning not linked | `work_id` in all ratings and learnings |
| Two separate rating hooks | Single unified `LearningManager` |
| High overhead for simple tasks | Effort-based work tracking |
| No context injection | `buildEnhancedContext()` adds learnings to prompts |
| No cost tracking | Built-in cost tracking by model/month |
| Complex hook coordination | Simple function calls |

## CLI Commands

```typescript
// commands/memory.ts

import { Command } from 'commander';
import { learningManager } from '../lib/memory/learning-manager';
import { getMonthlyCost } from '../lib/memory/state-manager';

export const memoryCommand = new Command('memory')
  .description('View and manage memory system');

memoryCommand
  .command('learnings')
  .option('-n, --limit <count>', 'Number to show', '10')
  .action(async (options) => {
    const learnings = await learningManager.retrieveRelevantLearnings('', parseInt(options.limit));
    console.log('Recent learnings:');
    learnings.forEach(l => {
      console.log(`\n[${l.type.toUpperCase()}] ${l.situation}`);
      console.log(`  Lesson: ${l.lesson}`);
    });
  });

memoryCommand
  .command('patterns')
  .description('Show synthesized patterns')
  .action(async () => {
    const patterns = await learningManager.synthesizePatterns();
    console.log(patterns);
  });

memoryCommand
  .command('cost')
  .option('-m, --month <YYYY-MM>', 'Specific month')
  .action(async (options) => {
    const cost = await getMonthlyCost(options.month);
    const month = options.month || new Date().toISOString().substring(0, 7);
    console.log(`Total cost for ${month}: $${cost.toFixed(4)}`);
  });

memoryCommand
  .command('rate <rating>')
  .description('Rate last interaction (1-10)')
  .option('-c, --comment <text>', 'Optional comment')
  .action(async (rating, options) => {
    await learningManager.captureRating({
      id: `rating-${Date.now()}`,
      timestamp: new Date().toISOString(),
      rating: parseInt(rating),
      source: 'explicit',
      comment: options.comment,
    });
    console.log(`Rated: ${rating}/10`);
  });
```
