# Yxhyx - Personal AI Assistant

> *An AI assistant that knows you best, keeps you accountable, and curates your world.*

## Overview

Yxhyx is a personal AI assistant designed to:
- **Know you deeply** through a structured identity/context system
- **Keep you accountable** with daily/weekly check-ins tied to your goals
- **Curate personalized content** from diverse news sources
- **Assist with research** using multi-model parallel queries
- **Optimize costs** by routing tasks to the cheapest capable model

## Architecture

Inspired by [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) but rebuilt with key improvements:

| Component | PAI Approach | Yxhyx Improvement |
|-----------|--------------|-------------------|
| **Identity** | 18+ scattered markdown files | Single structured YAML with git versioning |
| **Memory** | Capture-heavy, retrieval-light | Learning retrieval + context injection |
| **Research** | Generic multi-model | News-optimized with recency filtering |
| **Costs** | Claude-focused | Route to cheapest capable model (Kimi k2.5) |

## Documentation

Complete implementation specifications are in `/docs`:

| File | Description |
|------|-------------|
| [00-overview.md](docs/00-overview.md) | Project overview and architecture |
| [01-identity-system.md](docs/01-identity-system.md) | Deep personal context (TELOS-inspired) |
| [02-memory-system.md](docs/02-memory-system.md) | Persistent learning and memory |
| [03-research-system.md](docs/03-research-system.md) | Multi-source research and news |
| [04-model-router.md](docs/04-model-router.md) | Cost-optimized model selection |
| [05-checkin-system.md](docs/05-checkin-system.md) | Accountability check-ins |
| [06-cli-interface.md](docs/06-cli-interface.md) | Terminal CLI implementation |
| [07-skills-framework.md](docs/07-skills-framework.md) | Modular skills architecture |
| [08-implementation-plan.md](docs/08-implementation-plan.md) | Phased build roadmap |

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **CLI**: Commander.js
- **AI Models**: Kimi k2.5 (primary), OpenRouter, Claude (quality)
- **Data**: YAML + JSON + Markdown (local, portable)
- **Validation**: Zod

## Key Features

### 1. Identity System
Single structured YAML file with all your context:
- Goals (short/medium/long-term)
- Projects with next actions
- Interests for content curation
- Beliefs and lessons learned
- Preferences for communication and tech

### 2. Memory System
Persistent learning that actually gets used:
- Work tracking with effort classification
- Rating capture (explicit + implicit)
- **Learning retrieval** - surfaces relevant lessons
- **Context injection** - applies learnings to new tasks

### 3. News Aggregation
Non-biased, personalized news:
- RSS feed integration
- Source categorization (wire, major, trade)
- Perspective diversity tracking
- Goal-relevant highlighting
- URL verification (no hallucinated links)

### 4. Check-Ins
Accountability tied to your goals:
- Morning: Plan with goal context
- Evening: Reflect and capture learnings
- Weekly: Comprehensive review
- Auto-updates goal progress

### 5. Cost Optimization
Spend smart on AI:
- Automatic complexity classification
- Route simple tasks to Kimi k2.5 (~$0.001/request)
- Reserve Claude for complex work
- Track all costs by model/month

## Quick Start (After Building)

```bash
# Install
bun install -g yxhyx

# Initialize
yxhyx init

# Use
yxhyx chat "Hello!"
yxhyx checkin morning
yxhyx news
yxhyx status
```

## Building

Follow the implementation plan in [08-implementation-plan.md](docs/08-implementation-plan.md).

Start with Phase 1 (Foundation):
1. Set up project structure
2. Implement identity system
3. Create model router
4. Build basic CLI

## Estimated Monthly Cost

With intelligent routing: **$5-15/month** for daily use.

| Task Type | Model | Cost |
|-----------|-------|------|
| Check-ins, Q&A | Kimi k2.5 | ~$0.001 |
| News digest | Kimi k2.5 | ~$0.002 |
| Research | OpenRouter | ~$0.01-0.05 |
| Complex tasks | Claude | ~$0.05-0.20 |

## Reference Repos

This project draws inspiration from:
- [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) - Daniel Miessler's personal AI framework
- [OpenClaw](https://github.com/ArcadeLabsInc/OpenClaw) - Multi-channel personal AI assistant

## License

MIT
