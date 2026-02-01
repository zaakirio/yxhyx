# Yxhyx - Personal AI Assistant

> *An AI assistant that knows you best, keeps you accountable, and curates your world.*

## Overview

Yxhyx (pronounced "yix-hix") is a personal AI assistant designed to:
- **Know you deeply** through a structured identity/context system
- **Keep you accountable** with daily/weekly check-ins tied to your goals
- **Curate personalized content** from diverse news sources
- **Assist with research** using multi-model parallel queries
- **Optimize costs** by routing tasks to the cheapest capable model

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- At least one AI API key:
  - `KIMI_API_KEY` or `MOONSHOT_API_KEY` (Moonshot/Kimi - recommended for cost efficiency)
  - `OPENROUTER_API_KEY` (OpenRouter - access to many models)
  - `ANTHROPIC_API_KEY` (Anthropic Claude - highest quality)

### Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/yxhyx.git
cd yxhyx

# Install dependencies
bun install

# Build
bun run build

# Install globally
bun link

# Or run directly
bun run dev
```

### Configure API Keys

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export KIMI_API_KEY="your-moonshot-api-key"
# Or
export OPENROUTER_API_KEY="your-openrouter-key"
# Or
export ANTHROPIC_API_KEY="your-anthropic-key"
```

## Quick Start

```bash
# Initialize Yxhyx (creates ~/.yxhyx directory)
yxhyx init

# Chat with your AI assistant
yxhyx chat "Help me plan my day"

# Or just type your message directly
yxhyx "What should I focus on today?"

# Morning check-in
yxhyx checkin morning

# Get personalized news
yxhyx news

# View your status
yxhyx status

# Rate an interaction (1-10)
yxhyx "8 - great response"
```

## Commands

| Command | Description |
|---------|-------------|
| `yxhyx init` | Initialize Yxhyx with guided setup |
| `yxhyx chat [message]` | Chat with your AI assistant |
| `yxhyx chat -i` | Interactive chat mode |
| `yxhyx checkin [morning\|evening\|weekly]` | Accountability check-ins |
| `yxhyx checkin -q` | Quick check-in mode |
| `yxhyx news` | Get personalized news digest |
| `yxhyx news -c security` | News filtered by category |
| `yxhyx news research "topic"` | Quick research on a topic |
| `yxhyx identity show` | View your identity profile |
| `yxhyx identity add-goal "Goal" -t short` | Add a goal |
| `yxhyx status` | Quick overview of goals, projects, costs |
| `yxhyx cost` | View API costs for current month |
| `yxhyx cost -d` | Detailed cost breakdown by model |
| `yxhyx memory learnings` | View captured learnings |

## Architecture

Inspired by [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) but rebuilt with key improvements:

| Component | PAI Approach | Yxhyx Improvement |
|-----------|--------------|-------------------|
| **Identity** | 18+ scattered markdown files | Single structured YAML with validation |
| **Memory** | Capture-heavy, retrieval-light | Learning retrieval + context injection |
| **Research** | Generic multi-model | News-optimized with recency filtering |
| **Costs** | Claude-focused | Route to cheapest capable model |

### Directory Structure

```
~/.yxhyx/
├── config/
│   ├── models.yaml          # Model routing configuration
│   └── feeds.yaml           # RSS feed sources
├── identity/
│   └── identity.yaml        # Your personal context (single source of truth)
├── memory/
│   ├── work/                # Task tracking
│   ├── learning/            # Captured learnings
│   │   ├── signals/         # Ratings
│   │   ├── patterns/        # Failure patterns
│   │   └── positive/        # Success patterns
│   └── state/               # Application state, costs, check-ins
└── skills/                  # Modular skill configurations
```

## Key Features

### 1. Identity System
Single structured YAML file (`~/.yxhyx/identity/identity.yaml`) with:
- About you (name, background, expertise)
- Goals (short/medium/long-term with progress tracking)
- Projects with next actions
- Interests for content curation
- Beliefs and lessons learned
- Preferences (communication style, tech stack, news format)

### 2. Memory System
Persistent learning that actually gets used:
- **Work tracking** with effort-based complexity (TRIVIAL, QUICK, STANDARD, THOROUGH)
- **Rating capture** - explicit (`8 - good response`) and implicit
- **Learning retrieval** - surfaces relevant past lessons for new tasks
- **Context injection** - applies your learnings to every interaction

### 3. Cost-Optimized Model Routing
Automatic task classification routes to the cheapest capable model:

| Complexity | Models | Est. Cost |
|------------|--------|-----------|
| TRIVIAL | Kimi k2.5 | ~$0.001 |
| QUICK | Kimi, Gemini Flash | ~$0.002 |
| STANDARD | Kimi 32k, Llama 70B | ~$0.01 |
| COMPLEX | Claude Haiku, Sonnet | ~$0.05 |
| CRITICAL | Claude Sonnet | ~$0.10+ |

Estimated monthly cost with daily use: **$5-15/month**

### 4. News Aggregation
Non-biased, personalized news:
- RSS feed integration with configurable sources
- Source categorization (wire, major, trade, social)
- Perspective diversity tracking
- Goal-relevant highlighting
- **URL verification** - no hallucinated links (SSRF-protected)

### 5. Accountability Check-Ins
- **Morning**: Plan the day with goal context
- **Evening**: Reflect and capture learnings
- **Weekly**: Comprehensive review and goal updates
- Automatic goal progress updates from your responses

## Development

```bash
# Run in development mode
bun run dev

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run typecheck

# Build for production
bun run build
```

### Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **CLI**: Commander.js
- **Validation**: Zod
- **Testing**: Vitest
- **Linting**: Biome
- **Data**: YAML + JSON + Markdown (local, portable)

## Documentation

Complete implementation specifications are in `/docs`:

| File | Description |
|------|-------------|
| [00-overview.md](docs/00-overview.md) | Project overview and architecture |
| [01-identity-system.md](docs/01-identity-system.md) | Deep personal context system |
| [02-memory-system.md](docs/02-memory-system.md) | Persistent learning and memory |
| [03-research-system.md](docs/03-research-system.md) | Multi-source research and news |
| [04-model-router.md](docs/04-model-router.md) | Cost-optimized model selection |
| [05-checkin-system.md](docs/05-checkin-system.md) | Accountability check-ins |
| [06-cli-interface.md](docs/06-cli-interface.md) | Terminal CLI implementation |
| [07-skills-framework.md](docs/07-skills-framework.md) | Modular skills architecture |
| [08-implementation-plan.md](docs/08-implementation-plan.md) | Phased build roadmap |

## Troubleshooting

### "No models available" error

Make sure you have at least one API key set:

```bash
# Check if keys are set
echo $KIMI_API_KEY
echo $OPENROUTER_API_KEY
echo $ANTHROPIC_API_KEY
```

### "Yxhyx not initialized" error

Run the initialization:

```bash
yxhyx init
```

### Check-in not finding yesterday's data

Check-ins are stored in `~/.yxhyx/memory/state/checkin-history.jsonl`. Ensure the file exists and has valid JSON lines.

### High API costs

1. Check cost breakdown: `yxhyx cost -d`
2. Simple tasks should route to Kimi - ensure `KIMI_API_KEY` is set
3. Review model configuration in `~/.yxhyx/config/models.yaml`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `bun run lint && bun run test`
5. Submit a pull request

## License

MIT

## Acknowledgments

- [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) - Daniel Miessler's personal AI framework
- [OpenClaw](https://github.com/ArcadeLabsInc/OpenClaw) - Multi-channel personal AI assistant
