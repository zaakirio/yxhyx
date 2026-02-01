# Skills Framework - Modular Capabilities

## Overview

Skills are modular capabilities that extend Yxhyx's functionality. Each skill is a self-contained unit with its own configuration, workflows, and tools. The framework is inspired by PAI's skill system but simplified for easier development and maintenance.

## Design Principles

1. **Self-Contained**: Each skill has everything it needs in one directory
2. **Declarative**: Configuration via YAML, not code
3. **Composable**: Skills can use other skills
4. **Testable**: Each skill can be tested in isolation
5. **Hot-Loadable**: Skills can be added without restart

## Skill Structure

```
~/.yxhyx/skills/
├── research/
│   ├── skill.yaml           # Skill definition
│   ├── workflows/
│   │   ├── quick.md         # Quick research workflow
│   │   ├── standard.md      # Standard research workflow
│   │   └── deep.md          # Deep research workflow
│   └── tools/
│       └── url-verifier.ts  # Skill-specific tools
│
├── news/
│   ├── skill.yaml
│   ├── workflows/
│   │   └── digest.md
│   └── templates/
│       └── digest.hbs
│
├── checkin/
│   ├── skill.yaml
│   ├── workflows/
│   │   ├── morning.md
│   │   ├── evening.md
│   │   └── weekly.md
│   └── templates/
│       ├── morning.hbs
│       └── weekly.hbs
│
└── project/
    ├── skill.yaml
    ├── workflows/
    │   └── create.md
    └── templates/
        ├── typescript/
        ├── python/
        └── nextjs/
```

## Skill Definition Schema

```yaml
# skill.yaml

name: research
version: "1.0.0"
description: Multi-source research and information gathering

# When this skill should be activated
triggers:
  patterns:
    - "research"
    - "look up"
    - "find information"
    - "investigate"
  keywords:
    - research
    - lookup
    - investigate

# Dependencies on other skills
dependencies: []

# Available workflows
workflows:
  quick:
    description: Fast single-model research
    file: workflows/quick.md
    triggers:
      - "quick research"
      - "quick lookup"
    
  standard:
    description: Standard multi-model research
    file: workflows/standard.md
    default: true  # Default workflow for this skill
    
  deep:
    description: Extensive parallel research
    file: workflows/deep.md
    triggers:
      - "deep research"
      - "extensive research"
      - "thorough research"

# Configuration options
config:
  url_verification: true
  max_sources: 10
  timeout_seconds: 60

# Required environment variables
env:
  required: []
  optional:
    - PERPLEXITY_API_KEY
```

## Workflow Definition

Workflows are Markdown files that define step-by-step processes:

```markdown
# Quick Research Workflow

## Metadata
- **Skill**: research
- **Workflow**: quick
- **Estimated Time**: 10-15 seconds
- **Model**: cheapest

## Description
Fast single-model research for simple questions.

## Steps

### 1. Parse Query
Extract the research topic from the user's request.

### 2. Generate Search
Create an optimized search query.

### 3. Execute Search
Use the model's built-in knowledge or web search capability.

```prompt
Research this topic and provide a brief summary:

Topic: {{query}}

Requirements:
- 2-3 paragraph summary
- Include 3-5 sources with URLs
- Prioritize recent information
- Note any uncertainties

Format as JSON:
{
  "summary": "...",
  "sources": [{ "title": "...", "url": "..." }],
  "confidence": 0.0-1.0,
  "caveats": ["..."]
}
```

### 4. Verify URLs
Run URL verification on all sources.

### 5. Format Output
Present results with verified/unverified indicators.

## Error Handling
- Timeout: Return partial results with note
- No results: Suggest alternative query
- URL verification fails: Flag but include with warning
```

## Skill Loader

```typescript
// lib/skills/loader.ts

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

const SKILLS_DIR = `${process.env.HOME}/.yxhyx/skills`;

interface SkillDefinition {
  name: string;
  version: string;
  description: string;
  triggers: {
    patterns: string[];
    keywords: string[];
  };
  dependencies: string[];
  workflows: Record<string, {
    description: string;
    file: string;
    default?: boolean;
    triggers?: string[];
  }>;
  config: Record<string, any>;
  env: {
    required: string[];
    optional: string[];
  };
}

interface LoadedSkill {
  definition: SkillDefinition;
  path: string;
  workflows: Map<string, string>;  // workflow name -> content
}

class SkillLoader {
  private skills: Map<string, LoadedSkill> = new Map();
  private loaded = false;
  
  async loadAll(): Promise<void> {
    if (this.loaded) return;
    
    const skillDirs = await readdir(SKILLS_DIR);
    
    for (const dir of skillDirs) {
      const skillPath = join(SKILLS_DIR, dir);
      const configPath = join(skillPath, 'skill.yaml');
      
      if (!existsSync(configPath)) continue;
      
      const configContent = await readFile(configPath, 'utf-8');
      const definition = parse(configContent) as SkillDefinition;
      
      // Load workflows
      const workflows = new Map<string, string>();
      for (const [name, workflow] of Object.entries(definition.workflows)) {
        const workflowPath = join(skillPath, workflow.file);
        if (existsSync(workflowPath)) {
          const content = await readFile(workflowPath, 'utf-8');
          workflows.set(name, content);
        }
      }
      
      this.skills.set(definition.name, {
        definition,
        path: skillPath,
        workflows,
      });
    }
    
    this.loaded = true;
  }
  
  async getSkill(name: string): Promise<LoadedSkill | null> {
    await this.loadAll();
    return this.skills.get(name) || null;
  }
  
  async findSkillForInput(input: string): Promise<{ skill: LoadedSkill; workflow: string } | null> {
    await this.loadAll();
    
    const lowerInput = input.toLowerCase();
    
    for (const skill of this.skills.values()) {
      // Check patterns
      for (const pattern of skill.definition.triggers.patterns) {
        if (lowerInput.includes(pattern.toLowerCase())) {
          // Find best workflow
          const workflow = this.findWorkflow(skill, lowerInput);
          return { skill, workflow };
        }
      }
      
      // Check keywords
      for (const keyword of skill.definition.triggers.keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          const workflow = this.findWorkflow(skill, lowerInput);
          return { skill, workflow };
        }
      }
    }
    
    return null;
  }
  
  private findWorkflow(skill: LoadedSkill, input: string): string {
    // Check workflow-specific triggers
    for (const [name, workflow] of Object.entries(skill.definition.workflows)) {
      if (workflow.triggers) {
        for (const trigger of workflow.triggers) {
          if (input.includes(trigger.toLowerCase())) {
            return name;
          }
        }
      }
    }
    
    // Return default workflow
    for (const [name, workflow] of Object.entries(skill.definition.workflows)) {
      if (workflow.default) {
        return name;
      }
    }
    
    // Return first workflow
    return Object.keys(skill.definition.workflows)[0];
  }
  
  async listSkills(): Promise<SkillDefinition[]> {
    await this.loadAll();
    return Array.from(this.skills.values()).map(s => s.definition);
  }
}

export const skillLoader = new SkillLoader();
```

## Skill Router

```typescript
// lib/skills/router.ts

import { skillLoader } from './loader';
import { modelRouter } from '../model-router';
import { loadIdentity } from '../context-loader';

interface SkillExecutionResult {
  skill: string;
  workflow: string;
  output: string;
  cost: number;
  duration: number;
}

export class SkillRouter {
  
  async route(input: string): Promise<SkillExecutionResult | null> {
    // Find matching skill
    const match = await skillLoader.findSkillForInput(input);
    
    if (!match) {
      return null;  // No skill matched, use default chat
    }
    
    const { skill, workflow } = match;
    
    // Load workflow content
    const workflowContent = skill.workflows.get(workflow);
    if (!workflowContent) {
      throw new Error(`Workflow ${workflow} not found in skill ${skill.definition.name}`);
    }
    
    // Execute skill
    return this.executeSkill(skill.definition.name, workflow, workflowContent, input);
  }
  
  private async executeSkill(
    skillName: string,
    workflowName: string,
    workflowContent: string,
    input: string
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    
    // Load user context
    const identity = await loadIdentity();
    
    // Build skill execution prompt
    const systemPrompt = `
You are executing the "${workflowName}" workflow from the "${skillName}" skill.

## User Context
Name: ${identity.about.name}
Communication style: ${identity.preferences.communication.style}

## Workflow Instructions
${workflowContent}

## Important Rules
1. Follow the workflow steps in order
2. If URL verification is mentioned, verify all URLs
3. Format output according to workflow specifications
4. Note any errors or partial results
`;

    const response = await modelRouter.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    return {
      skill: skillName,
      workflow: workflowName,
      output: response.content,
      cost: response.cost,
      duration,
    };
  }
}

export const skillRouter = new SkillRouter();
```

## Built-In Skills

### Research Skill

```yaml
# skills/research/skill.yaml

name: research
version: "1.0.0"
description: Multi-source research and information gathering

triggers:
  patterns:
    - "research"
    - "look up"
    - "find out about"
    - "what do you know about"
  keywords:
    - research
    - investigate
    - lookup

workflows:
  quick:
    description: Fast single-model research
    file: workflows/quick.md
    triggers:
      - "quick research"
      - "quick lookup"
    
  standard:
    description: Standard multi-model research
    file: workflows/standard.md
    default: true
    
  deep:
    description: Extensive parallel research
    file: workflows/deep.md
    triggers:
      - "deep research"
      - "thorough"
      - "comprehensive"

config:
  url_verification: true
  max_sources: 10
```

### News Skill

```yaml
# skills/news/skill.yaml

name: news
version: "1.0.0"
description: Personalized news aggregation and digest

triggers:
  patterns:
    - "news"
    - "what's happening"
    - "latest updates"
  keywords:
    - news
    - headlines
    - digest

workflows:
  digest:
    description: Generate personalized news digest
    file: workflows/digest.md
    default: true
    
  topic:
    description: News about a specific topic
    file: workflows/topic.md
    triggers:
      - "news about"
      - "updates on"

config:
  max_items: 10
  include_goal_relevance: true
```

### Check-In Skill

```yaml
# skills/checkin/skill.yaml

name: checkin
version: "1.0.0"
description: Accountability check-ins and reflection

triggers:
  patterns:
    - "check in"
    - "check-in"
    - "checkin"
    - "how am I doing"
  keywords:
    - checkin
    - accountability
    - reflection

workflows:
  morning:
    description: Morning planning check-in
    file: workflows/morning.md
    triggers:
      - "morning"
      - "start my day"
    
  evening:
    description: Evening reflection check-in
    file: workflows/evening.md
    triggers:
      - "evening"
      - "end of day"
    
  weekly:
    description: Weekly comprehensive review
    file: workflows/weekly.md
    triggers:
      - "weekly"
      - "week review"
```

### Project Skill

```yaml
# skills/project/skill.yaml

name: project
version: "1.0.0"
description: Project scaffolding and management

triggers:
  patterns:
    - "create project"
    - "new project"
    - "start a project"
    - "spin up"
  keywords:
    - project
    - scaffold
    - bootstrap

workflows:
  create:
    description: Create a new project from template
    file: workflows/create.md
    default: true

config:
  default_template: typescript
  auto_git_init: true
```

## Creating Custom Skills

### Step 1: Create Directory Structure

```bash
mkdir -p ~/.yxhyx/skills/my-skill/workflows
```

### Step 2: Define Skill

```yaml
# ~/.yxhyx/skills/my-skill/skill.yaml

name: my-skill
version: "1.0.0"
description: My custom skill description

triggers:
  patterns:
    - "my trigger phrase"
  keywords:
    - myskill

workflows:
  default:
    description: Default workflow
    file: workflows/default.md
    default: true

config:
  custom_option: value
```

### Step 3: Create Workflow

```markdown
# My Skill Default Workflow

## Metadata
- **Skill**: my-skill
- **Workflow**: default

## Description
What this workflow does.

## Steps

### 1. Step One
Description of step one.

### 2. Step Two
Description of step two.

## Output Format
How to format the output.
```

### Step 4: Test

```bash
yxhyx "my trigger phrase"
```

## Skill CLI Commands

```typescript
// commands/skills.ts

import { Command } from 'commander';
import { skillLoader } from '../lib/skills/loader';

export const skillsCommand = new Command('skills')
  .description('Manage skills');

skillsCommand
  .command('list')
  .description('List all available skills')
  .action(async () => {
    const skills = await skillLoader.listSkills();
    
    console.log('\nInstalled Skills:');
    console.log('='.repeat(40));
    
    for (const skill of skills) {
      console.log(`\n${skill.name} v${skill.version}`);
      console.log(`  ${skill.description}`);
      console.log(`  Workflows: ${Object.keys(skill.workflows).join(', ')}`);
      console.log(`  Triggers: ${skill.triggers.keywords.slice(0, 3).join(', ')}...`);
    }
  });

skillsCommand
  .command('info <name>')
  .description('Show detailed skill information')
  .action(async (name) => {
    const skill = await skillLoader.getSkill(name);
    
    if (!skill) {
      console.log(`Skill '${name}' not found`);
      return;
    }
    
    console.log(`\n${skill.definition.name} v${skill.definition.version}`);
    console.log('='.repeat(40));
    console.log(skill.definition.description);
    
    console.log('\nTrigger Patterns:');
    skill.definition.triggers.patterns.forEach(p => console.log(`  - "${p}"`));
    
    console.log('\nWorkflows:');
    for (const [name, wf] of Object.entries(skill.definition.workflows)) {
      console.log(`  ${name}${wf.default ? ' (default)' : ''}`);
      console.log(`    ${wf.description}`);
      if (wf.triggers) {
        console.log(`    Triggers: ${wf.triggers.join(', ')}`);
      }
    }
  });

skillsCommand
  .command('create <name>')
  .description('Create a new skill from template')
  .action(async (name) => {
    // Create skill directory and files
    console.log(`Creating skill: ${name}`);
    // Implementation...
  });
```

## Key Features

| Feature | Benefit |
|---------|---------|
| **YAML configuration** | Easy to create and modify |
| **Workflow markdown** | Human-readable process definitions |
| **Automatic routing** | Skills activate based on input |
| **Composable** | Skills can depend on other skills |
| **Hot-loadable** | Add skills without restart |
| **Template support** | Handlebars templates for output |
