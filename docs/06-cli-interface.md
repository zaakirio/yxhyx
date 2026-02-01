# CLI Interface - Terminal-Based Interaction

## Overview

Yxhyx provides a clean, powerful terminal interface built with Commander.js. The CLI is the primary way you'll interact with your personal AI assistant.

## Command Structure

```
yxhyx <command> [subcommand] [options] [arguments]

Commands:
  init                    Initialize Yxhyx (first-time setup)
  chat [message]          Interactive chat or single message
  checkin [type]          Accountability check-ins (morning/evening/weekly)
  news                    Personalized news digest
  research <query>        Research a topic
  identity                Manage your identity/context
  memory                  View/manage memory system
  status                  Quick status overview
  cost                    View API costs
  help                    Show help
```

## Main Entry Point

```typescript
// bin/yxhyx.ts
#!/usr/bin/env bun

import { Command } from 'commander';
import { chatCommand } from '../commands/chat';
import { checkinCommand } from '../commands/checkin';
import { newsCommand } from '../commands/news';
import { identityCommand } from '../commands/identity';
import { memoryCommand } from '../commands/memory';
import { initCommand } from '../commands/init';
import { statusCommand } from '../commands/status';
import { costCommand } from '../commands/cost';

const program = new Command();

program
  .name('yxhyx')
  .description('Your personal AI assistant')
  .version('1.0.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(chatCommand);
program.addCommand(checkinCommand);
program.addCommand(newsCommand);
program.addCommand(identityCommand);
program.addCommand(memoryCommand);
program.addCommand(statusCommand);
program.addCommand(costCommand);

// Default to chat if no command specified
program.arguments('[message...]').action(async (message) => {
  if (message && message.length > 0) {
    // Treat as chat message
    const { chat } = await import('../commands/chat');
    await chat(message.join(' '));
  } else {
    program.help();
  }
});

program.parse();
```

## Chat Command

```typescript
// commands/chat.ts

import { Command } from 'commander';
import { modelRouter } from '../lib/model-router';
import { buildEnhancedContext } from '../lib/memory/context-injection';
import { workManager } from '../lib/memory/work-manager';
import { learningManager } from '../lib/memory/learning-manager';
import * as readline from 'readline';

export const chatCommand = new Command('chat')
  .description('Chat with Yxhyx')
  .argument('[message...]', 'Message to send')
  .option('-m, --model <model>', 'Force specific model')
  .option('-i, --interactive', 'Start interactive session')
  .action(async (message, options) => {
    if (options.interactive || !message || message.length === 0) {
      await interactiveChat(options);
    } else {
      await chat(message.join(' '), options);
    }
  });

export async function chat(
  message: string, 
  options: { model?: string } = {}
): Promise<void> {
  // Check for explicit rating
  const rating = learningManager.parseExplicitRating(message);
  if (rating) {
    await learningManager.captureRating({
      id: `rating-${Date.now()}`,
      timestamp: new Date().toISOString(),
      rating: rating.rating,
      source: 'explicit',
      comment: rating.comment,
    });
    console.log(`\n Rated: ${rating.rating}/10${rating.comment ? ` - ${rating.comment}` : ''}\n`);
    return;
  }
  
  // Build context
  const context = await buildEnhancedContext(message, 'chat');
  
  // Create work item
  const workId = await workManager.createWork(message, 'QUICK');
  
  // Get response
  const startTime = Date.now();
  const response = await modelRouter.complete({
    model: options.model,
    messages: [
      { role: 'system', content: context },
      { role: 'user', content: message },
    ],
  });
  const duration = (Date.now() - startTime) / 1000;
  
  // Display response
  console.log('\n' + response.content + '\n');
  
  // Show metadata
  console.log(`[${response.model} | $${response.cost.toFixed(4)} | ${duration.toFixed(1)}s]`);
  
  // Complete work
  await workManager.completeWork(workId);
}

async function interactiveChat(options: { model?: string }): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  console.log('\n Yxhyx Interactive Mode');
  console.log('Type your message, "exit" to quit, or a number (1-10) to rate.\n');
  
  const conversationHistory: Array<{ role: string; content: string }> = [];
  
  const prompt = (): void => {
    rl.question('You: ', async (input) => {
      const trimmed = input.trim();
      
      if (trimmed.toLowerCase() === 'exit') {
        console.log('\nGoodbye!\n');
        rl.close();
        return;
      }
      
      if (trimmed === '') {
        prompt();
        return;
      }
      
      // Check for rating
      const rating = learningManager.parseExplicitRating(trimmed);
      if (rating) {
        await learningManager.captureRating({
          id: `rating-${Date.now()}`,
          timestamp: new Date().toISOString(),
          rating: rating.rating,
          source: 'explicit',
          comment: rating.comment,
        });
        console.log(` Rated: ${rating.rating}/10\n`);
        prompt();
        return;
      }
      
      // Build context for first message
      if (conversationHistory.length === 0) {
        const context = await buildEnhancedContext(trimmed, 'chat');
        conversationHistory.push({ role: 'system', content: context });
      }
      
      conversationHistory.push({ role: 'user', content: trimmed });
      
      const response = await modelRouter.complete({
        model: options.model,
        messages: conversationHistory,
      });
      
      conversationHistory.push({ role: 'assistant', content: response.content });
      
      console.log(`\nYxhyx: ${response.content}`);
      console.log(`[${response.model} | $${response.cost.toFixed(4)}]\n`);
      
      prompt();
    });
  };
  
  prompt();
}
```

## Status Command

```typescript
// commands/status.ts

import { Command } from 'commander';
import { loadIdentity } from '../lib/context-loader';
import { getMonthlyCost } from '../lib/memory/state-manager';
import { workManager } from '../lib/memory/work-manager';
import { getCheckinHistory } from '../lib/memory/state-manager';

export const statusCommand = new Command('status')
  .description('Quick status overview')
  .action(async () => {
    const identity = await loadIdentity();
    const monthlyCost = await getMonthlyCost();
    const currentWork = await workManager.getCurrentWork();
    const recentCheckins = await getCheckinHistory(7);
    
    // Calculate streaks
    const today = new Date().toISOString().split('T')[0];
    const hasTodayMorning = recentCheckins.some(c => 
      c.type === 'morning' && c.timestamp.startsWith(today)
    );
    const hasTodayEvening = recentCheckins.some(c => 
      c.type === 'evening' && c.timestamp.startsWith(today)
    );
    
    // Active goals
    const activeGoals = [
      ...identity.goals.short_term,
      ...identity.goals.medium_term,
      ...identity.goals.long_term,
    ].filter(g => g.progress < 1);
    
    // Active projects
    const activeProjects = identity.projects.filter(p => p.status === 'active');
    
    console.log(`
=====================================
  YXHYX STATUS - ${identity.about.name}
=====================================

 CHECK-INS
  Morning: ${hasTodayMorning ? 'Done' : 'Pending'}
  Evening: ${hasTodayEvening ? 'Done' : 'Pending'}

 ACTIVE GOALS (${activeGoals.length})
${activeGoals.slice(0, 3).map(g => 
  `  ${progressBar(g.progress)} ${g.title}`
).join('\n')}
${activeGoals.length > 3 ? `  ... and ${activeGoals.length - 3} more` : ''}

 ACTIVE PROJECTS (${activeProjects.length})
${activeProjects.map(p => `  - ${p.name}`).join('\n')}

${currentWork ? ` CURRENT WORK
  ${currentWork.id}` : ''}

 MONTHLY COST
  $${monthlyCost.toFixed(4)}

=====================================
    `);
  });

function progressBar(progress: number): string {
  const filled = Math.round(progress * 10);
  const empty = 10 - filled;
  return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
}
```

## Package Configuration

```json
// package.json

{
  "name": "yxhyx",
  "version": "1.0.0",
  "description": "Your personal AI assistant",
  "type": "module",
  "bin": {
    "yxhyx": "./dist/bin/yxhyx.js"
  },
  "scripts": {
    "build": "bun build ./bin/yxhyx.ts --outdir ./dist/bin --target node",
    "dev": "bun run ./bin/yxhyx.ts",
    "test": "vitest",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.2.0",
    "yaml": "^2.3.0",
    "zod": "^3.22.0",
    "rss-parser": "^3.13.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/inquirer": "^9.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@biomejs/biome": "^1.5.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## TypeScript Configuration

```json
// tsconfig.json

{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "types": ["bun-types"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## Environment Configuration

```bash
# ~/.yxhyx/.env

# Required: At least one AI provider
KIMI_API_KEY=your_kimi_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional

# Optional: For advanced features
ELEVENLABS_API_KEY=your_elevenlabs_key  # Voice features
```

## Shell Completion (Future Enhancement)

```typescript
// lib/completion.ts

export function generateBashCompletion(): string {
  return `
_yxhyx_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="init chat checkin news research identity memory status cost help"
  
  if [ \$COMP_CWORD -eq 1 ]; then
    COMPREPLY=($(compgen -W "\$commands" -- "\$cur"))
  elif [ "\${COMP_WORDS[1]}" = "checkin" ] && [ \$COMP_CWORD -eq 2 ]; then
    COMPREPLY=($(compgen -W "morning evening weekly" -- "\$cur"))
  elif [ "\${COMP_WORDS[1]}" = "identity" ] && [ \$COMP_CWORD -eq 2 ]; then
    COMPREPLY=($(compgen -W "show add-goal add-lesson progress history" -- "\$cur"))
  fi
}

complete -F _yxhyx_completions yxhyx
`;
}

export function generateZshCompletion(): string {
  return `
#compdef yxhyx

_yxhyx() {
  local -a commands
  commands=(
    'init:Initialize Yxhyx'
    'chat:Chat with Yxhyx'
    'checkin:Accountability check-ins'
    'news:Personalized news digest'
    'research:Research a topic'
    'identity:Manage identity/context'
    'memory:View/manage memory'
    'status:Quick status overview'
    'cost:View API costs'
  )
  
  _arguments -C \\
    '1: :->command' \\
    '*: :->args'
    
  case \$state in
    command)
      _describe 'command' commands
      ;;
    args)
      case \$words[2] in
        checkin)
          _values 'type' morning evening weekly
          ;;
      esac
      ;;
  esac
}

_yxhyx
`;
}
```

## Output Formatting Utilities

```typescript
// lib/cli/formatting.ts

import { loadIdentity } from '../context-loader';

// ANSI color codes
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export function bold(text: string): string {
  return colorize(text, 'bold');
}

export function success(text: string): string {
  return `${colors.green}${text}${colors.reset}`;
}

export function error(text: string): string {
  return `${colors.red}${text}${colors.reset}`;
}

export function warning(text: string): string {
  return `${colors.yellow}${text}${colors.reset}`;
}

export function info(text: string): string {
  return `${colors.cyan}${text}${colors.reset}`;
}

export function dim(text: string): string {
  return colorize(text, 'dim');
}

// Progress bar
export function progressBar(progress: number, width = 20): string {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round(progress * 100);
  
  const color = progress >= 0.7 ? colors.green : 
                progress >= 0.3 ? colors.yellow : colors.red;
  
  return `${color}${bar}${colors.reset} ${percent}%`;
}

// Table formatting
export function table(
  headers: string[],
  rows: string[][],
  options: { padding?: number } = {}
): string {
  const padding = options.padding ?? 2;
  
  // Calculate column widths
  const widths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  
  // Build header
  const headerRow = headers
    .map((h, i) => h.padEnd(widths[i]))
    .join(' '.repeat(padding));
  
  const separator = widths.map(w => '-'.repeat(w)).join(' '.repeat(padding));
  
  // Build rows
  const bodyRows = rows.map(row =>
    row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' '.repeat(padding))
  );
  
  return [headerRow, separator, ...bodyRows].join('\n');
}

// Spinner for async operations
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private current = 0;
  private interval: Timer | null = null;
  private message: string;
  
  constructor(message: string) {
    this.message = message;
  }
  
  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.interval = setInterval(() => {
      const frame = this.frames[this.current];
      process.stdout.write(`\r${colors.cyan}${frame}${colors.reset} ${this.message}`);
      this.current = (this.current + 1) % this.frames.length;
    }, 80);
  }
  
  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r\x1B[K'); // Clear line
    process.stdout.write('\x1B[?25h'); // Show cursor
    if (finalMessage) {
      console.log(finalMessage);
    }
  }
  
  succeed(message?: string): void {
    this.stop(`${colors.green}✓${colors.reset} ${message || this.message}`);
  }
  
  fail(message?: string): void {
    this.stop(`${colors.red}✗${colors.reset} ${message || this.message}`);
  }
}
```

## Example Usage

```bash
# Initialize (first time)
$ yxhyx init

# Quick chat
$ yxhyx "What's on my agenda today?"

# Interactive chat
$ yxhyx chat -i

# Check-in
$ yxhyx checkin morning
$ yxhyx checkin -q  # Quick mode

# News
$ yxhyx news
$ yxhyx news -c security  # Specific category

# Research
$ yxhyx news research "best practices for TypeScript error handling"

# Identity management
$ yxhyx identity show
$ yxhyx identity add-goal "Learn Rust" -t short
$ yxhyx identity progress goal-st-1 50

# Memory/learnings
$ yxhyx memory learnings
$ yxhyx memory patterns

# Status and costs
$ yxhyx status
$ yxhyx cost -d  # Detailed by model

# Rate last interaction
$ yxhyx "8 - great response"
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Commander.js** | Well-documented, TypeScript support, familiar syntax |
| **Inquirer for prompts** | Rich input types, good UX |
| **Colorized output** | Better readability, visual feedback |
| **Default to chat** | Most common action, low friction |
| **Quick modes** | Low friction for busy days |
| **Rating via chat** | Natural integration, no separate command |
| **Spinner for async** | Visual feedback for AI calls |
