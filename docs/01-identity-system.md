# Identity System - Deep Personal Context

## Overview

The Identity System is Yxhyx's foundation for understanding who you are. Unlike PAI's scattered 18+ markdown files, we use a **single structured YAML file** as the source of truth, with auto-generated markdown views for human readability.

## Design Decisions

### Why a Single YAML File?

| PAI Approach (Many Files) | Yxhyx Approach (Single File) |
|---------------------------|------------------------------|
| 18+ separate .md files | One `identity.yaml` |
| No schema validation | Zod schema validation |
| Custom backup system | Git versioning |
| Path inconsistencies | Single path |
| Hard to query | Easy to query |
| Append-only updates | Atomic updates |

### Benefits of Structured Data

1. **Queryable**: "Show me all goals related to health"
2. **Validated**: Schema ensures data integrity
3. **Atomic**: Updates are all-or-nothing
4. **Portable**: Easy to backup, sync, migrate
5. **Versionable**: Git history for all changes

## Schema Definition

### Core Identity Schema

```yaml
# ~/.yxhyx/identity/identity.yaml

# Meta
version: "1.0"
last_updated: "2026-02-01T10:30:00Z"

# About You
about:
  name: "Your Name"
  timezone: "America/Los_Angeles"
  location: "San Francisco, CA"
  background: |
    Brief description of who you are, your expertise,
    and what you do.
  expertise:
    - "Software Engineering"
    - "AI/ML"
    - "Security"

# Life Purpose
mission: |
  Your mission statement - what you're trying to accomplish
  in life and why it matters.

# Core Beliefs
beliefs:
  - statement: "AI should augment humans, not replace them"
    confidence: 0.9
    added: "2026-01-15"
  - statement: "Continuous learning is essential"
    confidence: 0.95
    added: "2026-01-10"

# Goals (hierarchical)
goals:
  short_term:  # 1-30 days
    - id: "goal-st-1"
      title: "Complete Yxhyx MVP"
      deadline: "2026-02-15"
      progress: 0.2
      related_projects: ["yxhyx"]
      
  medium_term:  # 1-6 months
    - id: "goal-mt-1"
      title: "Launch personal brand"
      deadline: "2026-06-01"
      progress: 0.1
      
  long_term:  # 6+ months
    - id: "goal-lt-1"
      title: "Build sustainable passive income"
      deadline: "2027-01-01"
      progress: 0.05

# Active Projects
projects:
  - id: "yxhyx"
    name: "Yxhyx Personal AI"
    status: "active"
    description: "Build a personal AI assistant"
    repo: "github.com/user/yxhyx"
    next_actions:
      - "Complete identity system"
      - "Implement memory system"
    related_goals: ["goal-st-1"]

# Interests (for content curation)
interests:
  high_priority:
    - topic: "AI/ML"
      subtopics: ["LLMs", "agents", "local models"]
    - topic: "Security"
      subtopics: ["AppSec", "offensive security", "AI security"]
  medium_priority:
    - topic: "Startups"
      subtopics: ["bootstrapping", "indie hacking"]
  low_priority:
    - topic: "Philosophy"
      subtopics: ["stoicism", "epistemology"]

# Challenges (current obstacles)
challenges:
  - id: "challenge-1"
    title: "Time management"
    description: "Balancing work, projects, and life"
    status: "active"
    related_goals: ["goal-mt-1"]

# Preferences (how you like things done)
preferences:
  communication:
    style: "direct"
    length: "concise"
    formality: "casual"
  tech_stack:
    languages: ["TypeScript", "Python"]
    frameworks: ["React", "Next.js"]
    package_manager: "bun"
    testing: "vitest"
  news:
    format: "bullet_points"
    max_items: 10
    preferred_sources: ["Hacker News", "tl;dr sec"]

# Learned (lessons accumulated)
learned:
  - lesson: "Start with the simplest solution that could work"
    context: "Overengineered a feature that could have been 10 lines"
    date: "2026-01-20"
  - lesson: "Verify URLs from AI - they hallucinate links"
    context: "Research had 3 broken links"
    date: "2026-01-18"
```

### Zod Schema (TypeScript)

```typescript
// lib/schemas/identity.ts

import { z } from 'zod';

const GoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  deadline: z.string().optional(),
  progress: z.number().min(0).max(1).default(0),
  related_projects: z.array(z.string()).default([]),
});

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'paused', 'completed', 'abandoned']),
  description: z.string(),
  repo: z.string().optional(),
  next_actions: z.array(z.string()).default([]),
  related_goals: z.array(z.string()).default([]),
});

const InterestSchema = z.object({
  topic: z.string(),
  subtopics: z.array(z.string()).default([]),
});

const BeliefSchema = z.object({
  statement: z.string(),
  confidence: z.number().min(0).max(1),
  added: z.string(),
});

const ChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['active', 'resolved', 'abandoned']),
  related_goals: z.array(z.string()).default([]),
});

const LessonSchema = z.object({
  lesson: z.string(),
  context: z.string().optional(),
  date: z.string(),
});

export const IdentitySchema = z.object({
  version: z.string(),
  last_updated: z.string(),
  
  about: z.object({
    name: z.string(),
    timezone: z.string(),
    location: z.string().optional(),
    background: z.string(),
    expertise: z.array(z.string()).default([]),
  }),
  
  mission: z.string(),
  
  beliefs: z.array(BeliefSchema).default([]),
  
  goals: z.object({
    short_term: z.array(GoalSchema).default([]),
    medium_term: z.array(GoalSchema).default([]),
    long_term: z.array(GoalSchema).default([]),
  }),
  
  projects: z.array(ProjectSchema).default([]),
  
  interests: z.object({
    high_priority: z.array(InterestSchema).default([]),
    medium_priority: z.array(InterestSchema).default([]),
    low_priority: z.array(InterestSchema).default([]),
  }),
  
  challenges: z.array(ChallengeSchema).default([]),
  
  preferences: z.object({
    communication: z.object({
      style: z.enum(['direct', 'diplomatic', 'socratic']),
      length: z.enum(['concise', 'detailed', 'adaptive']),
      formality: z.enum(['formal', 'casual', 'professional']),
    }),
    tech_stack: z.object({
      languages: z.array(z.string()),
      frameworks: z.array(z.string()),
      package_manager: z.string(),
      testing: z.string(),
    }),
    news: z.object({
      format: z.enum(['bullet_points', 'paragraphs', 'headlines_only']),
      max_items: z.number().default(10),
      preferred_sources: z.array(z.string()).default([]),
    }),
  }),
  
  learned: z.array(LessonSchema).default([]),
});

export type Identity = z.infer<typeof IdentitySchema>;
```

## Context Loader Implementation

```typescript
// lib/context-loader.ts

import { readFile, writeFile } from 'fs/promises';
import { parse, stringify } from 'yaml';
import { IdentitySchema, type Identity } from './schemas/identity';

const IDENTITY_PATH = `${process.env.HOME}/.yxhyx/identity/identity.yaml`;

export async function loadIdentity(): Promise<Identity> {
  const content = await readFile(IDENTITY_PATH, 'utf-8');
  const data = parse(content);
  return IdentitySchema.parse(data);
}

export async function updateIdentity(
  updater: (current: Identity) => Identity
): Promise<void> {
  const current = await loadIdentity();
  const updated = updater(current);
  updated.last_updated = new Date().toISOString();
  
  // Validate before writing
  IdentitySchema.parse(updated);
  
  const content = stringify(updated);
  await writeFile(IDENTITY_PATH, content, 'utf-8');
}

// Query helpers
export async function getActiveGoals() {
  const identity = await loadIdentity();
  return [
    ...identity.goals.short_term,
    ...identity.goals.medium_term,
    ...identity.goals.long_term,
  ].filter(g => g.progress < 1);
}

export async function getActiveProjects() {
  const identity = await loadIdentity();
  return identity.projects.filter(p => p.status === 'active');
}

export async function getInterests() {
  const identity = await loadIdentity();
  return [
    ...identity.interests.high_priority,
    ...identity.interests.medium_priority,
    ...identity.interests.low_priority,
  ];
}

export async function getRecentLessons(limit = 10) {
  const identity = await loadIdentity();
  return identity.learned
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
```

## Auto-Generated Views

The system auto-generates markdown views for human readability:

```typescript
// lib/view-generator.ts

import { loadIdentity, type Identity } from './context-loader';
import { writeFile, mkdir } from 'fs/promises';

const VIEWS_DIR = `${process.env.HOME}/.yxhyx/identity/views`;

export async function generateViews(): Promise<void> {
  const identity = await loadIdentity();
  
  await mkdir(VIEWS_DIR, { recursive: true });
  
  await Promise.all([
    generateAboutView(identity),
    generateGoalsView(identity),
    generateProjectsView(identity),
    generateInterestsView(identity),
    generateLearnedView(identity),
  ]);
}

async function generateGoalsView(identity: Identity): Promise<void> {
  const formatGoal = (g: any) => 
    `- [ ] **${g.title}** (${Math.round(g.progress * 100)}% complete)
  - Deadline: ${g.deadline || 'None'}
  - Related: ${g.related_projects?.join(', ') || 'None'}`;

  const content = `# Goals

## Short-Term (1-30 days)

${identity.goals.short_term.map(formatGoal).join('\n\n')}

## Medium-Term (1-6 months)

${identity.goals.medium_term.map(formatGoal).join('\n\n')}

## Long-Term (6+ months)

${identity.goals.long_term.map(formatGoal).join('\n\n')}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

  await writeFile(`${VIEWS_DIR}/GOALS.md`, content);
}

async function generateAboutView(identity: Identity): Promise<void> {
  const content = `# About Me

**Name:** ${identity.about.name}
**Location:** ${identity.about.location || 'Not specified'}
**Timezone:** ${identity.about.timezone}

## Background

${identity.about.background}

## Expertise

${identity.about.expertise.map(e => `- ${e}`).join('\n')}

## Mission

${identity.mission}

## Core Beliefs

${identity.beliefs.map(b => 
  `- ${b.statement} (${Math.round(b.confidence * 100)}% confident)`
).join('\n')}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

  await writeFile(`${VIEWS_DIR}/ABOUT.md`, content);
}

async function generateProjectsView(identity: Identity): Promise<void> {
  const content = `# Projects

${identity.projects.map(p => `
## ${p.name}

**Status:** ${p.status}
**Repository:** ${p.repo || 'None'}

${p.description}

### Next Actions

${p.next_actions.map(a => `- [ ] ${a}`).join('\n')}

### Related Goals

${p.related_goals.map(g => `- ${g}`).join('\n') || 'None'}
`).join('\n---\n')}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

  await writeFile(`${VIEWS_DIR}/PROJECTS.md`, content);
}

async function generateInterestsView(identity: Identity): Promise<void> {
  const formatInterest = (i: any) => 
    `- **${i.topic}**: ${i.subtopics.join(', ')}`;

  const content = `# Interests

## High Priority

${identity.interests.high_priority.map(formatInterest).join('\n')}

## Medium Priority

${identity.interests.medium_priority.map(formatInterest).join('\n')}

## Low Priority

${identity.interests.low_priority.map(formatInterest).join('\n')}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

  await writeFile(`${VIEWS_DIR}/INTERESTS.md`, content);
}

async function generateLearnedView(identity: Identity): Promise<void> {
  const content = `# Lessons Learned

${identity.learned.map(l => `
## ${l.date}

**${l.lesson}**

${l.context ? `_Context: ${l.context}_` : ''}
`).join('\n---\n')}

---
*Auto-generated from identity.yaml on ${new Date().toISOString()}*
`;

  await writeFile(`${VIEWS_DIR}/LEARNED.md`, content);
}
```

## Git-Based Versioning

Instead of PAI's custom backup system, use git:

```typescript
// lib/identity-versioning.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const IDENTITY_DIR = `${process.env.HOME}/.yxhyx/identity`;

export async function commitChange(description: string): Promise<void> {
  await execAsync(`git add identity.yaml`, { cwd: IDENTITY_DIR });
  await execAsync(`git commit -m "Updated: ${description}"`, { cwd: IDENTITY_DIR });
}

export async function getHistory(limit = 10): Promise<string[]> {
  const { stdout } = await execAsync(
    `git log --oneline -${limit}`,
    { cwd: IDENTITY_DIR }
  );
  return stdout.trim().split('\n');
}

export async function rollback(commitHash: string): Promise<void> {
  await execAsync(
    `git checkout ${commitHash} -- identity.yaml`,
    { cwd: IDENTITY_DIR }
  );
}

export async function diff(commitHash?: string): Promise<string> {
  const cmd = commitHash 
    ? `git diff ${commitHash} -- identity.yaml`
    : `git diff HEAD~1 -- identity.yaml`;
  const { stdout } = await execAsync(cmd, { cwd: IDENTITY_DIR });
  return stdout;
}
```

## Update Operations

### CLI Commands for Identity Management

```typescript
// commands/identity.ts

import { Command } from 'commander';
import { updateIdentity, loadIdentity } from '../lib/context-loader';
import { commitChange } from '../lib/identity-versioning';
import { generateViews } from '../lib/view-generator';

export const identityCommand = new Command('identity')
  .description('Manage your identity and context');

// Add a goal
identityCommand
  .command('add-goal <title>')
  .option('-t, --term <term>', 'Goal term: short, medium, long', 'short')
  .option('-d, --deadline <date>', 'Deadline (YYYY-MM-DD)')
  .option('-p, --project <id>', 'Related project ID')
  .action(async (title, options) => {
    const termKey = `${options.term}_term` as 'short_term' | 'medium_term' | 'long_term';
    
    await updateIdentity(identity => ({
      ...identity,
      goals: {
        ...identity.goals,
        [termKey]: [
          ...identity.goals[termKey],
          {
            id: `goal-${options.term[0]}t-${Date.now()}`,
            title,
            deadline: options.deadline,
            progress: 0,
            related_projects: options.project ? [options.project] : [],
          }
        ]
      }
    }));
    
    await commitChange(`Added goal: ${title}`);
    await generateViews();
    console.log(`Added ${options.term}-term goal: ${title}`);
  });

// Update goal progress
identityCommand
  .command('progress <goalId> <percent>')
  .description('Update goal progress (0-100)')
  .action(async (goalId, percent) => {
    const progress = parseInt(percent) / 100;
    
    await updateIdentity(identity => {
      const updateGoals = (goals: any[]) => 
        goals.map(g => g.id === goalId ? { ...g, progress } : g);
      
      return {
        ...identity,
        goals: {
          short_term: updateGoals(identity.goals.short_term),
          medium_term: updateGoals(identity.goals.medium_term),
          long_term: updateGoals(identity.goals.long_term),
        }
      };
    });
    
    await commitChange(`Updated progress for ${goalId} to ${percent}%`);
    await generateViews();
    console.log(`Updated ${goalId} progress to ${percent}%`);
  });

// Add a lesson
identityCommand
  .command('add-lesson <lesson>')
  .option('-c, --context <context>', 'Context for the lesson')
  .action(async (lesson, options) => {
    await updateIdentity(identity => ({
      ...identity,
      learned: [
        ...identity.learned,
        {
          lesson,
          context: options.context,
          date: new Date().toISOString().split('T')[0],
        }
      ]
    }));
    
    await commitChange(`Added lesson: ${lesson.substring(0, 50)}...`);
    await generateViews();
    console.log('Lesson added');
  });

// Add interest
identityCommand
  .command('add-interest <topic>')
  .option('-s, --subtopics <topics>', 'Comma-separated subtopics')
  .option('-p, --priority <level>', 'Priority: high, medium, low', 'medium')
  .action(async (topic, options) => {
    const priorityKey = `${options.priority}_priority` as 
      'high_priority' | 'medium_priority' | 'low_priority';
    const subtopics = options.subtopics?.split(',').map((s: string) => s.trim()) || [];
    
    await updateIdentity(identity => ({
      ...identity,
      interests: {
        ...identity.interests,
        [priorityKey]: [
          ...identity.interests[priorityKey],
          { topic, subtopics }
        ]
      }
    }));
    
    await commitChange(`Added interest: ${topic}`);
    await generateViews();
    console.log(`Added ${options.priority}-priority interest: ${topic}`);
  });

// Show current identity summary
identityCommand
  .command('show')
  .option('-s, --section <section>', 'Specific section to show')
  .action(async (options) => {
    const identity = await loadIdentity();
    
    if (options.section) {
      console.log(JSON.stringify((identity as any)[options.section], null, 2));
    } else {
      console.log(`
Name: ${identity.about.name}
Mission: ${identity.mission.substring(0, 100)}...

Active Goals: ${[
        ...identity.goals.short_term,
        ...identity.goals.medium_term,
        ...identity.goals.long_term
      ].filter(g => g.progress < 1).length}

Active Projects: ${identity.projects.filter(p => p.status === 'active').length}

Recent Lessons: ${identity.learned.length}
      `);
    }
  });

// View history
identityCommand
  .command('history')
  .option('-n, --limit <count>', 'Number of entries', '10')
  .action(async (options) => {
    const { getHistory } = await import('../lib/identity-versioning');
    const history = await getHistory(parseInt(options.limit));
    console.log('Recent changes:');
    history.forEach(h => console.log(`  ${h}`));
  });
```

## Context for AI Interactions

When interacting with Yxhyx, relevant context is loaded:

```typescript
// lib/context-for-ai.ts

import { loadIdentity } from './context-loader';
import { stringify } from 'yaml';

export type TaskType = 'chat' | 'checkin' | 'news' | 'research' | 'project';

export async function buildContext(taskType: TaskType): Promise<string> {
  const identity = await loadIdentity();
  
  // Always include core identity
  const baseContext = {
    name: identity.about.name,
    timezone: identity.about.timezone,
    communication_preferences: identity.preferences.communication,
  };
  
  // Task-specific context
  const taskContext: Record<TaskType, () => object> = {
    chat: () => ({
      background: identity.about.background,
      expertise: identity.about.expertise,
      recent_lessons: identity.learned.slice(-5),
    }),
    
    checkin: () => ({
      goals: identity.goals,
      projects: identity.projects.filter(p => p.status === 'active'),
      challenges: identity.challenges.filter(c => c.status === 'active'),
    }),
    
    news: () => ({
      interests: identity.interests,
      news_preferences: identity.preferences.news,
    }),
    
    research: () => ({
      expertise: identity.about.expertise,
      interests: identity.interests.high_priority,
    }),
    
    project: () => ({
      tech_preferences: identity.preferences.tech_stack,
      active_projects: identity.projects.filter(p => p.status === 'active'),
    }),
  };
  
  const context = {
    ...baseContext,
    ...taskContext[taskType](),
  };
  
  return stringify(context);
}

// Format context as system prompt section
export async function formatContextForPrompt(taskType: TaskType): Promise<string> {
  const context = await buildContext(taskType);
  
  return `
<user_context>
${context}
</user_context>

Use this context to personalize your response. Reference the user by name.
Align suggestions with their goals and interests.
Respect their communication preferences (${(await loadIdentity()).preferences.communication.style}, ${(await loadIdentity()).preferences.communication.length}).
`;
}
```

## Setup / Initialization

```typescript
// commands/init.ts

import { Command } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { stringify } from 'yaml';
import { IdentitySchema, type Identity } from '../lib/schemas/identity';
import { generateViews } from '../lib/view-generator';
import inquirer from 'inquirer';

const execAsync = promisify(exec);

export const initCommand = new Command('init')
  .description('Initialize Yxhyx')
  .action(async () => {
    console.log('Welcome to Yxhyx! Let\'s set up your personal AI assistant.\n');
    
    const identityDir = `${process.env.HOME}/.yxhyx/identity`;
    const configDir = `${process.env.HOME}/.yxhyx/config`;
    const memoryDir = `${process.env.HOME}/.yxhyx/memory`;
    
    // Create directories
    await mkdir(identityDir, { recursive: true });
    await mkdir(`${identityDir}/views`, { recursive: true });
    await mkdir(configDir, { recursive: true });
    await mkdir(`${memoryDir}/work`, { recursive: true });
    await mkdir(`${memoryDir}/learning/signals`, { recursive: true });
    await mkdir(`${memoryDir}/learning/patterns`, { recursive: true });
    await mkdir(`${memoryDir}/learning/positive`, { recursive: true });
    await mkdir(`${memoryDir}/state`, { recursive: true });
    
    // Gather information
    const answers = await inquirer.prompt([
      { 
        type: 'input',
        name: 'name', 
        message: 'What is your name?',
      },
      { 
        type: 'input',
        name: 'timezone', 
        message: 'What is your timezone?', 
        default: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      { 
        type: 'editor',
        name: 'background', 
        message: 'Brief description of who you are (opens editor):',
      },
      { 
        type: 'editor',
        name: 'mission', 
        message: 'What is your life mission? (opens editor):',
      },
      {
        type: 'checkbox',
        name: 'interests',
        message: 'Select your main interests:',
        choices: [
          'AI/ML', 'Security', 'Web Development', 'Mobile Development',
          'DevOps', 'Data Science', 'Startups', 'Finance', 'Health',
          'Productivity', 'Philosophy', 'Science', 'Design',
        ],
      },
      {
        type: 'list',
        name: 'communication_style',
        message: 'How do you prefer communication?',
        choices: ['direct', 'diplomatic', 'socratic'],
        default: 'direct',
      },
    ]);
    
    // Build identity
    const identity: Identity = {
      version: '1.0',
      last_updated: new Date().toISOString(),
      about: {
        name: answers.name,
        timezone: answers.timezone,
        background: answers.background || 'Not yet specified.',
        expertise: [],
      },
      mission: answers.mission || 'Not yet specified.',
      beliefs: [],
      goals: { short_term: [], medium_term: [], long_term: [] },
      projects: [],
      interests: {
        high_priority: answers.interests.slice(0, 3).map((t: string) => ({ topic: t, subtopics: [] })),
        medium_priority: answers.interests.slice(3, 6).map((t: string) => ({ topic: t, subtopics: [] })),
        low_priority: answers.interests.slice(6).map((t: string) => ({ topic: t, subtopics: [] })),
      },
      challenges: [],
      preferences: {
        communication: {
          style: answers.communication_style as 'direct' | 'diplomatic' | 'socratic',
          length: 'concise',
          formality: 'casual',
        },
        tech_stack: {
          languages: ['TypeScript'],
          frameworks: [],
          package_manager: 'bun',
          testing: 'vitest',
        },
        news: {
          format: 'bullet_points',
          max_items: 10,
          preferred_sources: [],
        },
      },
      learned: [],
    };
    
    // Validate and write
    IdentitySchema.parse(identity);
    await writeFile(`${identityDir}/identity.yaml`, stringify(identity));
    
    // Initialize git
    await execAsync('git init', { cwd: identityDir });
    await execAsync('git add .', { cwd: identityDir });
    await execAsync('git commit -m "Initial identity"', { cwd: identityDir });
    
    // Generate views
    await generateViews();
    
    // Create initial state
    await writeFile(`${memoryDir}/state/current.json`, JSON.stringify({ initialized: true }));
    await writeFile(`${memoryDir}/learning/signals/ratings.jsonl`, '');
    
    console.log('\n Yxhyx initialized successfully!');
    console.log(`\nYour identity is stored at: ${identityDir}/identity.yaml`);
    console.log('\nNext steps:');
    console.log('  yxhyx chat "Hello!"     - Start chatting');
    console.log('  yxhyx identity show     - View your identity');
    console.log('  yxhyx checkin morning   - Do a morning check-in');
  });
```

## Key Improvements Over PAI

| Issue in PAI | Solution in Yxhyx |
|--------------|-------------------|
| Path inconsistency between code and docs | Single file, single path |
| No schema validation | Zod validation on read/write |
| File name inconsistency (LEARNED vs LESSONS) | Structured fields, no ambiguity |
| Custom backup with file proliferation | Git versioning |
| 18+ files hard to reason about | Single YAML, queryable |
| No deduplication | Unique IDs, structured data |
| Append-only without cleanup | Full update control |
| Hard to query "goals related to X" | Structured data enables queries |
| Template variable magic | Explicit context loading |
