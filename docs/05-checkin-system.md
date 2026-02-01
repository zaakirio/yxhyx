# Check-In System - Accountability & Reflection

## Overview

The Check-In System is Yxhyx's accountability feature that helps you stay on track with your goals through structured daily and weekly reflections. Unlike generic journaling apps, check-ins are **deeply integrated with your identity** - referencing your actual goals, projects, and recent progress.

## Design Philosophy

1. **Goal-Aligned**: Every check-in references your actual goals from identity.yaml
2. **Progress-Aware**: Shows what you've accomplished, not just asks
3. **Adaptive**: Adjusts prompts based on your patterns
4. **Low Friction**: Quick by default, detailed when needed
5. **Historical**: Builds a searchable record over time

## Check-In Types

### Morning Check-In
- **Purpose**: Plan the day, set intentions
- **Timing**: Ideally first thing in the morning
- **Duration**: 2-5 minutes
- **Output**: Day plan with 1-3 priorities

### Evening Check-In
- **Purpose**: Reflect on accomplishments, capture learnings
- **Timing**: End of work day
- **Duration**: 2-5 minutes
- **Output**: Accomplishment log, lessons learned

### Weekly Review
- **Purpose**: Comprehensive progress review
- **Timing**: Sunday evening or Monday morning
- **Duration**: 10-15 minutes
- **Output**: Progress report, goal adjustments, week plan

## Implementation

### Check-In Templates

```typescript
// lib/checkin/templates.ts

import { loadIdentity } from '../context-loader';
import { getCheckinHistory } from '../memory/state-manager';

export interface CheckinPrompt {
  type: 'morning' | 'evening' | 'weekly';
  greeting: string;
  context: string;
  questions: string[];
  followUp?: string;
}

export async function buildMorningPrompt(): Promise<CheckinPrompt> {
  const identity = await loadIdentity();
  const history = await getCheckinHistory(7);
  
  // Get active goals
  const activeGoals = [
    ...identity.goals.short_term,
    ...identity.goals.medium_term,
  ].filter(g => g.progress < 1);
  
  // Get yesterday's evening check-in if exists
  const yesterday = history.find(h => 
    h.type === 'evening' && 
    isYesterday(new Date(h.timestamp))
  );
  
  // Get active projects
  const activeProjects = identity.projects.filter(p => p.status === 'active');
  
  return {
    type: 'morning',
    greeting: `Good morning, ${identity.about.name}!`,
    context: `
**Your Active Goals:**
${activeGoals.map(g => `- ${g.title} (${Math.round(g.progress * 100)}%)`).join('\n')}

**Active Projects:**
${activeProjects.map(p => `- ${p.name}`).join('\n')}

${yesterday ? `**Yesterday you accomplished:**
${yesterday.accomplishments?.map((a: string) => `- ${a}`).join('\n') || 'Not recorded'}` : ''}
`.trim(),
    questions: [
      'What are your top 1-3 priorities for today?',
      'Any blockers or challenges you anticipate?',
      'What would make today a success?',
    ],
  };
}

export async function buildEveningPrompt(): Promise<CheckinPrompt> {
  const identity = await loadIdentity();
  const history = await getCheckinHistory(7);
  
  // Get this morning's check-in
  const thisMorning = history.find(h => 
    h.type === 'morning' && 
    isToday(new Date(h.timestamp))
  );
  
  return {
    type: 'evening',
    greeting: `Good evening, ${identity.about.name}.`,
    context: `
${thisMorning ? `**This morning's priorities:**
${thisMorning.priorities?.map((p: string) => `- ${p}`).join('\n') || 'Not recorded'}` : ''}

**Your Active Goals:**
${[...identity.goals.short_term, ...identity.goals.medium_term]
  .filter(g => g.progress < 1)
  .map(g => `- ${g.title} (${Math.round(g.progress * 100)}%)`)
  .join('\n')}
`.trim(),
    questions: [
      'What did you accomplish today?',
      'Did anything not go as planned?',
      'What did you learn today?',
      'Any progress on your goals to record?',
    ],
  };
}

export async function buildWeeklyPrompt(): Promise<CheckinPrompt> {
  const identity = await loadIdentity();
  const history = await getCheckinHistory(30);
  
  // Get this week's check-ins
  const weekStart = getWeekStart(new Date());
  const thisWeek = history.filter(h => 
    new Date(h.timestamp) >= weekStart
  );
  
  // Calculate week stats
  const mornings = thisWeek.filter(h => h.type === 'morning').length;
  const evenings = thisWeek.filter(h => h.type === 'evening').length;
  const accomplishments = thisWeek
    .filter(h => h.type === 'evening')
    .flatMap(h => h.accomplishments || []);
  
  // Get all goals
  const allGoals = [
    ...identity.goals.short_term.map(g => ({ ...g, term: 'short' })),
    ...identity.goals.medium_term.map(g => ({ ...g, term: 'medium' })),
    ...identity.goals.long_term.map(g => ({ ...g, term: 'long' })),
  ];
  
  return {
    type: 'weekly',
    greeting: `Weekly Review - ${identity.about.name}`,
    context: `
**Week Stats:**
- Morning check-ins: ${mornings}/7
- Evening check-ins: ${evenings}/7
- Total accomplishments logged: ${accomplishments.length}

**This Week's Accomplishments:**
${accomplishments.map(a => `- ${a}`).join('\n') || 'None recorded'}

**Goal Progress:**
${allGoals.map(g => `- [${g.term}] ${g.title}: ${Math.round(g.progress * 100)}%`).join('\n')}

**Active Projects:**
${identity.projects.filter(p => p.status === 'active').map(p => `- ${p.name}`).join('\n')}

**Current Challenges:**
${identity.challenges.filter(c => c.status === 'active').map(c => `- ${c.title}`).join('\n') || 'None recorded'}
`.trim(),
    questions: [
      'What was your biggest win this week?',
      'What didn\'t go as planned?',
      'Any goals that need updating (progress or scope)?',
      'What\'s your focus for next week?',
      'Any new challenges or blockers to add?',
    ],
  };
}

// Helper functions
function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.setDate(diff));
}
```

### Check-In Runner

```typescript
// lib/checkin/runner.ts

import { modelRouter } from '../model-router';
import { buildMorningPrompt, buildEveningPrompt, buildWeeklyPrompt, type CheckinPrompt } from './templates';
import { recordCheckin, setState } from '../memory/state-manager';
import { updateIdentity } from '../context-loader';
import inquirer from 'inquirer';

interface CheckinResult {
  type: 'morning' | 'evening' | 'weekly';
  timestamp: string;
  responses: Record<string, string>;
  priorities?: string[];
  accomplishments?: string[];
  learnings?: string[];
  goalUpdates?: Array<{ goalId: string; progress: number }>;
}

export class CheckinRunner {
  
  async runMorning(): Promise<CheckinResult> {
    const prompt = await buildMorningPrompt();
    return this.runInteractive(prompt);
  }
  
  async runEvening(): Promise<CheckinResult> {
    const prompt = await buildEveningPrompt();
    return this.runInteractive(prompt);
  }
  
  async runWeekly(): Promise<CheckinResult> {
    const prompt = await buildWeeklyPrompt();
    return this.runInteractive(prompt);
  }
  
  private async runInteractive(prompt: CheckinPrompt): Promise<CheckinResult> {
    console.log(`\n${prompt.greeting}\n`);
    console.log(prompt.context);
    console.log('\n' + '='.repeat(50) + '\n');
    
    const responses: Record<string, string> = {};
    
    for (const question of prompt.questions) {
      const answer = await inquirer.prompt([{
        type: 'editor',
        name: 'response',
        message: question,
      }]);
      responses[question] = answer.response.trim();
    }
    
    // Parse structured data from responses
    const result: CheckinResult = {
      type: prompt.type,
      timestamp: new Date().toISOString(),
      responses,
    };
    
    // Extract priorities from morning check-in
    if (prompt.type === 'morning') {
      const priorityResponse = responses[prompt.questions[0]];
      result.priorities = this.extractListItems(priorityResponse);
    }
    
    // Extract accomplishments and learnings from evening
    if (prompt.type === 'evening') {
      result.accomplishments = this.extractListItems(responses[prompt.questions[0]]);
      result.learnings = this.extractListItems(responses[prompt.questions[2]]);
      
      // Check for goal progress updates
      const progressResponse = responses[prompt.questions[3]];
      if (progressResponse && progressResponse.length > 10) {
        result.goalUpdates = await this.parseGoalUpdates(progressResponse);
      }
    }
    
    // Record the check-in
    await recordCheckin(prompt.type, result);
    
    // Apply goal updates if any
    if (result.goalUpdates && result.goalUpdates.length > 0) {
      await this.applyGoalUpdates(result.goalUpdates);
    }
    
    // Add learnings to identity
    if (result.learnings && result.learnings.length > 0) {
      await this.addLearnings(result.learnings);
    }
    
    // Generate summary
    await this.showSummary(result);
    
    return result;
  }
  
  private extractListItems(text: string): string[] {
    if (!text) return [];
    
    // Try to extract bullet points or numbered lists
    const lines = text.split('\n');
    const items: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Match: - item, * item, 1. item, 1) item
      const match = trimmed.match(/^[-*\d.)\s]+(.+)$/);
      if (match) {
        items.push(match[1].trim());
      } else if (trimmed.length > 0 && !trimmed.includes(':')) {
        // Plain text line that's not a header
        items.push(trimmed);
      }
    }
    
    return items.filter(i => i.length > 0);
  }
  
  private async parseGoalUpdates(text: string): Promise<Array<{ goalId: string; progress: number }>> {
    // Use AI to parse goal progress mentions
    const { loadIdentity } = await import('../context-loader');
    const identity = await loadIdentity();
    
    const allGoals = [
      ...identity.goals.short_term,
      ...identity.goals.medium_term,
      ...identity.goals.long_term,
    ];
    
    const response = await modelRouter.complete({
      model: 'cheapest',
      messages: [{
        role: 'user',
        content: `Extract goal progress updates from this text. 
        
Available goals:
${allGoals.map(g => `- ${g.id}: ${g.title} (currently ${Math.round(g.progress * 100)}%)`).join('\n')}

User text:
"${text}"

Return JSON array of updates, or empty array if none mentioned:
[{ "goalId": "goal-id", "progress": 0.5 }]

Only include goals that the user explicitly mentions progress on.`,
      }],
    });
    
    try {
      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }
  
  private async applyGoalUpdates(updates: Array<{ goalId: string; progress: number }>): Promise<void> {
    await updateIdentity(identity => {
      const updateGoals = (goals: any[]) => 
        goals.map(g => {
          const update = updates.find(u => u.goalId === g.id);
          return update ? { ...g, progress: update.progress } : g;
        });
      
      return {
        ...identity,
        goals: {
          short_term: updateGoals(identity.goals.short_term),
          medium_term: updateGoals(identity.goals.medium_term),
          long_term: updateGoals(identity.goals.long_term),
        },
      };
    });
    
    console.log(`\n Updated ${updates.length} goal(s)`);
  }
  
  private async addLearnings(learnings: string[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await updateIdentity(identity => ({
      ...identity,
      learned: [
        ...identity.learned,
        ...learnings.map(lesson => ({
          lesson,
          context: 'From evening check-in',
          date: today,
        })),
      ],
    }));
  }
  
  private async showSummary(result: CheckinResult): Promise<void> {
    console.log('\n' + '='.repeat(50));
    console.log('CHECK-IN COMPLETE');
    console.log('='.repeat(50));
    
    if (result.priorities) {
      console.log('\n Today\'s Priorities:');
      result.priorities.forEach(p => console.log(`  - ${p}`));
    }
    
    if (result.accomplishments) {
      console.log('\n Accomplishments:');
      result.accomplishments.forEach(a => console.log(`  - ${a}`));
    }
    
    if (result.learnings && result.learnings.length > 0) {
      console.log('\n Learnings Added:');
      result.learnings.forEach(l => console.log(`  - ${l}`));
    }
    
    if (result.goalUpdates && result.goalUpdates.length > 0) {
      console.log('\n Goals Updated:');
      result.goalUpdates.forEach(u => 
        console.log(`  - ${u.goalId}: ${Math.round(u.progress * 100)}%`)
      );
    }
    
    console.log('\n');
  }
}

export const checkinRunner = new CheckinRunner();
```

### Quick Check-In Mode

For busy days, provide a faster alternative:

```typescript
// lib/checkin/quick.ts

import { modelRouter } from '../model-router';
import { loadIdentity } from '../context-loader';
import { recordCheckin } from '../memory/state-manager';
import inquirer from 'inquirer';

export async function quickMorning(): Promise<void> {
  const identity = await loadIdentity();
  
  console.log(`\n Quick Morning Check-in, ${identity.about.name}\n`);
  
  const activeGoals = [
    ...identity.goals.short_term,
    ...identity.goals.medium_term,
  ].filter(g => g.progress < 1);
  
  // Single question
  const { priorities } = await inquirer.prompt([{
    type: 'input',
    name: 'priorities',
    message: 'Top priority today (or comma-separated list):',
  }]);
  
  const priorityList = priorities.split(',').map((p: string) => p.trim());
  
  // Quick AI suggestion based on goals
  const suggestion = await modelRouter.complete({
    model: 'cheapest',
    messages: [{
      role: 'user',
      content: `Given these priorities: "${priorities}"
And these active goals: ${activeGoals.map(g => g.title).join(', ')}

Give one brief tip (1 sentence) for today.`,
    }],
  });
  
  console.log(`\n Tip: ${suggestion.content.trim()}`);
  
  await recordCheckin('morning', {
    timestamp: new Date().toISOString(),
    priorities: priorityList,
    quick: true,
  });
  
  console.log('\n Quick check-in recorded. Have a great day!\n');
}

export async function quickEvening(): Promise<void> {
  const identity = await loadIdentity();
  
  console.log(`\n Quick Evening Check-in, ${identity.about.name}\n`);
  
  const { wins } = await inquirer.prompt([{
    type: 'input',
    name: 'wins',
    message: 'What went well today?',
  }]);
  
  await recordCheckin('evening', {
    timestamp: new Date().toISOString(),
    accomplishments: wins.split(',').map((w: string) => w.trim()),
    quick: true,
  });
  
  console.log('\n Quick check-in recorded. Rest well!\n');
}
```

### CLI Commands

```typescript
// commands/checkin.ts

import { Command } from 'commander';
import { checkinRunner } from '../lib/checkin/runner';
import { quickMorning, quickEvening } from '../lib/checkin/quick';
import { getCheckinHistory, getState } from '../lib/memory/state-manager';

export const checkinCommand = new Command('checkin')
  .description('Accountability check-ins')
  .argument('[type]', 'Check-in type: morning, evening, weekly')
  .option('-q, --quick', 'Quick check-in mode')
  .action(async (type, options) => {
    // Default to morning if AM, evening if PM
    if (!type) {
      const hour = new Date().getHours();
      type = hour < 12 ? 'morning' : 'evening';
    }
    
    if (options.quick) {
      if (type === 'morning') {
        await quickMorning();
      } else if (type === 'evening') {
        await quickEvening();
      } else {
        console.log('Quick mode not available for weekly reviews');
      }
      return;
    }
    
    switch (type) {
      case 'morning':
        await checkinRunner.runMorning();
        break;
      case 'evening':
        await checkinRunner.runEvening();
        break;
      case 'weekly':
        await checkinRunner.runWeekly();
        break;
      default:
        console.log('Unknown check-in type. Use: morning, evening, or weekly');
    }
  });

// View check-in history
checkinCommand
  .command('history')
  .option('-n, --limit <count>', 'Number of entries', '10')
  .option('-t, --type <type>', 'Filter by type')
  .action(async (options) => {
    const history = await getCheckinHistory(parseInt(options.limit));
    
    const filtered = options.type 
      ? history.filter(h => h.type === options.type)
      : history;
    
    console.log('\nCheck-in History');
    console.log('='.repeat(40));
    
    for (const entry of filtered.reverse()) {
      const date = new Date(entry.timestamp).toLocaleDateString();
      const time = new Date(entry.timestamp).toLocaleTimeString();
      console.log(`\n[${entry.type.toUpperCase()}] ${date} ${time}`);
      
      if (entry.priorities) {
        console.log('  Priorities:', entry.priorities.join(', '));
      }
      if (entry.accomplishments) {
        console.log('  Accomplishments:', entry.accomplishments.join(', '));
      }
    }
  });

// Check streak
checkinCommand
  .command('streak')
  .description('View your check-in streak')
  .action(async () => {
    const history = await getCheckinHistory(100);
    
    // Calculate morning and evening streaks
    let morningStreak = 0;
    let eveningStreak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasMorning = history.some(h => 
        h.type === 'morning' && h.timestamp.startsWith(dateStr)
      );
      const hasEvening = history.some(h => 
        h.type === 'evening' && h.timestamp.startsWith(dateStr)
      );
      
      if (hasMorning && i === morningStreak) morningStreak++;
      if (hasEvening && i === eveningStreak) eveningStreak++;
    }
    
    console.log('\n Check-in Streak');
    console.log('='.repeat(30));
    console.log(`Morning: ${morningStreak} day${morningStreak !== 1 ? 's' : ''}`);
    console.log(`Evening: ${eveningStreak} day${eveningStreak !== 1 ? 's' : ''}`);
    
    // Weekly reviews
    const weeklyCount = history.filter(h => h.type === 'weekly').length;
    console.log(`Weekly reviews: ${weeklyCount} total`);
  });
```

## Reminders (Optional Enhancement)

For future enhancement, add system notifications:

```typescript
// lib/checkin/reminders.ts (Future enhancement)

import { schedule } from 'node-cron';
import { exec } from 'child_process';
import { getState } from '../memory/state-manager';

export function setupReminders() {
  // Morning reminder at 8 AM
  schedule('0 8 * * *', async () => {
    const state = await getState();
    const lastMorning = state.lastCheckin?.type === 'morning' &&
      isToday(new Date(state.lastCheckin.timestamp));
    
    if (!lastMorning) {
      notify('Morning Check-in', 'Start your day with intention: yxhyx checkin');
    }
  });
  
  // Evening reminder at 6 PM
  schedule('0 18 * * *', async () => {
    const state = await getState();
    const lastEvening = state.lastCheckin?.type === 'evening' &&
      isToday(new Date(state.lastCheckin.timestamp));
    
    if (!lastEvening) {
      notify('Evening Check-in', 'Reflect on your day: yxhyx checkin evening');
    }
  });
  
  // Weekly reminder on Sunday at 7 PM
  schedule('0 19 * * 0', () => {
    notify('Weekly Review', 'Time for your weekly review: yxhyx checkin weekly');
  });
}

function notify(title: string, message: string) {
  // macOS notification
  exec(`osascript -e 'display notification "${message}" with title "${title}"'`);
}
```

## Example Session

```
$ yxhyx checkin morning

Good morning, Zaakir!

**Your Active Goals:**
- Complete Yxhyx MVP (20%)
- Launch personal brand (10%)

**Active Projects:**
- Yxhyx Personal AI

**Yesterday you accomplished:**
- Completed identity system documentation
- Set up project structure

==================================================

? What are your top 1-3 priorities for today? 
  1. Finish memory system implementation
  2. Write check-in system
  3. Test news aggregation

? Any blockers or challenges you anticipate?
  Need to figure out cost tracking for model router

? What would make today a success?
  Having a working end-to-end check-in flow

==================================================
CHECK-IN COMPLETE
==================================================

 Today's Priorities:
  - Finish memory system implementation
  - Write check-in system
  - Test news aggregation

$ yxhyx checkin -q
 Quick Morning Check-in, Zaakir

? Top priority today (or comma-separated list): Ship the check-in system

 Tip: Focus on the core flow first, polish later.

 Quick check-in recorded. Have a great day!
```

## Key Features

| Feature | Benefit |
|---------|---------|
| **Goal-integrated** | References your actual goals, not generic prompts |
| **Progress-aware** | Shows what you did yesterday/this week |
| **Auto-updates** | Parses goal progress from your responses |
| **Learning capture** | Evening learnings added to identity |
| **Streak tracking** | Gamification for consistency |
| **Quick mode** | Low friction when busy |
| **Historical record** | Searchable check-in history |
