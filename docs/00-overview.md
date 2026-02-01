# Yxhyx - Personal AI Assistant

## Project Overview

**Yxhyx** is a personal AI assistant designed to know you deeply, keep you accountable, curate personalized content, and help you achieve your goals. It runs locally on your Mac/Linux machine and uses cost-optimized AI models (Kimi k2.5, OpenRouter) to provide intelligent assistance through a terminal CLI.

## Core Philosophy

### Design Principles

1. **Context-First**: Every interaction is informed by who you are, what you're working on, and what you've learned together
2. **Cost-Conscious**: Route tasks to the cheapest model capable of handling them
3. **Persistent Learning**: Capture feedback, synthesize patterns, and improve over time
4. **Accountability**: Daily/weekly check-ins tied to your goals
5. **Non-Biased Information**: Aggregate news from diverse sources with perspective tracking
6. **Local-First**: Your data stays on your machine in portable formats

### Inspired By (But Better Than)

This system draws inspiration from Daniel Miessler's PAI (Personal AI Infrastructure) while addressing key weaknesses:

| PAI Strength | Yxhyx Improvement |
|--------------|-------------------|
| TELOS life context | Simplified schema, git-based versioning, structured data with views |
| Memory system | Learning retrieval, positive pattern capture, context injection |
| Research system | News-optimized workflows, recency filtering, source categorization |
| Hook-based architecture | Simpler event model, merged handlers, reduced overhead |

## System Architecture

```
+------------------------------------------------------------------+
|                           YXHYX                                   |
|                    Personal AI Assistant                          |
+------------------------------------------------------------------+
|                                                                    |
|  +----------------+   +----------------+   +----------------+     |
|  |   IDENTITY     |   |    MEMORY      |   |    SKILLS      |     |
|  |   (Context)    |   |    SYSTEM      |   |                |     |
|  +----------------+   +----------------+   +----------------+     |
|  | identity.yaml  |   | work/          |   | research/      |     |
|  | - about        |   | learning/      |   | news/          |     |
|  | - mission      |   | - signals/     |   | checkin/       |     |
|  | - goals        |   | - synthesis/   |   | project/       |     |
|  | - beliefs      |   | state/         |   |                |     |
|  | - interests    |   |                |   |                |     |
|  | - preferences  |   |                |   |                |     |
|  +----------------+   +----------------+   +----------------+     |
|          |                   |                    |               |
|          +-------------------+--------------------+               |
|                              |                                    |
|                    +---------v---------+                         |
|                    |   MODEL ROUTER    |                         |
|                    +-------------------+                         |
|                    | Complexity -> Model                         |
|                    | TRIVIAL -> Kimi k2.5                        |
|                    | STANDARD -> OpenRouter                      |
|                    | COMPLEX -> Claude                           |
|                    +-------------------+                         |
|                              |                                    |
|                    +---------v---------+                         |
|                    |   CLI INTERFACE   |                         |
|                    +-------------------+                         |
|                    | yxhyx chat        |                         |
|                    | yxhyx checkin     |                         |
|                    | yxhyx news        |                         |
|                    | yxhyx research    |                         |
|                    | yxhyx status      |                         |
|                    +-------------------+                         |
|                                                                    |
+------------------------------------------------------------------+
```

## Directory Structure

```
~/.yxhyx/                              # Main installation directory
├── config/
│   ├── settings.yaml                  # Core configuration
│   ├── models.yaml                    # Model routing rules
│   ├── feeds.yaml                     # RSS/news feed configuration
│   └── schema/                        # JSON schemas for validation
│       ├── identity.schema.json
│       ├── work.schema.json
│       └── learning.schema.json
│
├── identity/                          # Structured personal context
│   ├── identity.yaml                  # Single source of truth
│   └── views/                         # Auto-generated markdown views
│       ├── ABOUT.md
│       ├── GOALS.md
│       └── ...
│
├── memory/
│   ├── work/                          # Task tracking
│   │   ├── {task_id}.jsonl            # Simple: single file
│   │   └── {task_id}/                 # Complex: directory
│   │       ├── meta.yaml
│   │       └── items/
│   ├── learning/
│   │   ├── signals/
│   │   │   └── ratings.jsonl
│   │   ├── patterns/
│   │   │   └── {date}.md
│   │   └── positive/
│   │       └── {date}.md
│   └── state/
│       ├── current.json
│       └── checkin-history.jsonl
│
├── skills/
│   ├── research/
│   │   ├── skill.yaml
│   │   └── workflows/
│   ├── news/
│   │   ├── skill.yaml
│   │   └── workflows/
│   ├── checkin/
│   │   ├── skill.yaml
│   │   └── templates/
│   └── project/
│       ├── skill.yaml
│       └── templates/
│
├── lib/                               # Shared utilities
│   ├── model-router.ts
│   ├── context-loader.ts
│   ├── memory-manager.ts
│   ├── feed-fetcher.ts
│   └── url-verifier.ts
│
└── bin/
    └── yxhyx                          # Main CLI entry point
```

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Runtime** | Bun | Fast, modern, TypeScript-native |
| **Language** | TypeScript | Type safety, good tooling |
| **CLI Framework** | Commander.js | Well-documented, lightweight |
| **AI - Primary** | Kimi k2.5 | Cost-effective for simple tasks |
| **AI - Flexible** | OpenRouter | Access to many models |
| **AI - Quality** | Anthropic Claude | When quality matters |
| **Data Storage** | YAML + JSON + Markdown | Simple, portable, version-controllable |
| **Schema Validation** | Zod | Runtime validation with great TypeScript support |
| **RSS** | rss-parser | Reliable RSS fetching |

## Key Features

### 1. Deep Personal Context (Identity System)
- Single structured YAML file for all personal context
- Schema validation for data integrity
- Git-based versioning for history
- Auto-generated markdown views for readability

### 2. Persistent Memory & Learning
- Work tracking with effort-based complexity
- Dual feedback capture (explicit ratings + implicit sentiment)
- Pattern synthesis for recurring insights
- **Learning retrieval** - surface relevant learnings at decision time
- **Positive pattern capture** - what worked, not just what didn't

### 3. Cost-Optimized Model Routing
- Automatic task complexity classification
- Route to cheapest capable model
- Cost tracking and reporting
- Manual override when needed

### 4. Multi-Source News Aggregation
- RSS feed integration
- Source categorization (wire, major, trade, social)
- Recency-weighted synthesis
- Perspective diversity tracking
- URL verification (no hallucinated links)

### 5. Accountability Check-Ins
- Morning: Plan the day aligned with goals
- Evening: Reflect on accomplishments
- Weekly: Comprehensive review
- Progress tracking against GOALS

### 6. Project Scaffolding
- Voice/text command to create projects
- Templates based on preferences
- Automatic git initialization

## Estimated Costs

With intelligent model routing:

| Task Type | Model | Est. Cost |
|-----------|-------|-----------|
| Check-ins, simple Q&A | Kimi k2.5 | ~$0.001/request |
| News synthesis | Kimi k2.5 | ~$0.002/digest |
| Standard research | OpenRouter | ~$0.01-0.05/research |
| Complex planning | Claude Sonnet | ~$0.05-0.20/task |

**Estimated monthly cost with daily use: $5-15/month**

## Documents in This Folder

| File | Description |
|------|-------------|
| `00-overview.md` | This file - project overview and architecture |
| `01-identity-system.md` | Detailed spec for the identity/context system |
| `02-memory-system.md` | Detailed spec for memory and learning |
| `03-research-system.md` | Detailed spec for research and news aggregation |
| `04-model-router.md` | Detailed spec for cost-optimized model routing |
| `05-checkin-system.md` | Detailed spec for accountability check-ins |
| `06-cli-interface.md` | Detailed spec for the CLI interface |
| `07-skills-framework.md` | Detailed spec for the skills architecture |
| `08-implementation-plan.md` | Phased roadmap with milestones |

## Getting Started (After Building)

```bash
# Install Yxhyx
bun install -g yxhyx

# Run initial setup
yxhyx init

# Start using
yxhyx chat "Help me plan my day"
yxhyx checkin morning
yxhyx news
yxhyx status
```

## Next Steps

Read the detailed specification documents in order:
1. Start with `01-identity-system.md` for the context foundation
2. Then `02-memory-system.md` for persistence
3. Continue through to `08-implementation-plan.md` for the build roadmap
