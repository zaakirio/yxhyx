# Getting Started with Yxhyx

> Your personal AI assistant in 5 minutes

Yxhyx (pronounced "yix-hix") is a personal AI assistant that:
- **Knows you deeply** through a structured identity system
- **Learns from feedback** to improve over time
- **Keeps you accountable** with daily check-ins
- **Optimizes costs** by routing to the cheapest capable model

This guide will have you up and running in about 5 minutes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Quick Initialization](#quick-initialization)
5. [Verify Installation](#verify-installation)
6. [Your First Interactions](#your-first-interactions)
7. [Understanding the Memory System](#understanding-the-memory-system)
8. [Setting Up Goals](#setting-up-goals)
9. [Daily Usage Patterns](#daily-usage-patterns)
10. [Customization](#customization)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **[Bun](https://bun.sh/)** runtime (v1.0+)
  ```bash
  # Install Bun (macOS, Linux, WSL)
  curl -fsSL https://bun.sh/install | bash
  ```

- **At least one AI API key** (see [Configuration](#configuration))

### Recommended

- A terminal with ANSI color support (iTerm2, Warp, VS Code terminal, etc.)
- Git (for identity versioning)

---

## Installation

### Option 1: Install from Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/yxhyx.git
cd yxhyx

# Install dependencies
bun install

# Link globally (makes 'yxhyx' available everywhere)
bun link
```

### Option 2: Run Directly

If you don't want to install globally:

```bash
# From the yxhyx directory
bun run dev [command]

# Example
bun run dev init
bun run dev status
```

---

## Configuration

Yxhyx requires at least one AI provider API key. **Set this BEFORE running `yxhyx init`.**

### Recommended: Kimi/Moonshot (Cheapest)

Best for cost efficiency. Handles most tasks at ~$0.15 per million input tokens.

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export KIMI_API_KEY="your-kimi-api-key"

# Get a key at: https://platform.moonshot.cn/
```

### Alternative: OpenRouter (Most Flexible)

Access to many models (Claude, GPT-4, Llama, etc.) through one API.

```bash
export OPENROUTER_API_KEY="your-openrouter-key"

# Get a key at: https://openrouter.ai/
```

### Alternative: Anthropic (Highest Quality)

Direct access to Claude models. Best for complex tasks.

```bash
export ANTHROPIC_API_KEY="your-anthropic-key"

# Get a key at: https://console.anthropic.com/
```

### Apply Changes

```bash
# Reload your shell profile
source ~/.zshrc  # or source ~/.bashrc

# Verify the key is set
echo $KIMI_API_KEY  # Should print your key
```

---

## Quick Initialization

Once you have an API key configured, initialize Yxhyx:

```bash
yxhyx init --quick
```

The quick initialization asks only essential questions:
1. **Your name** - How Yxhyx will address you
2. **Your timezone** - Auto-detected, confirm or change
3. **Your interests** - Select 2-5 topics for content curation

This creates your identity at `~/.yxhyx/identity/identity.yaml`.

### Full Initialization (Optional)

For a more comprehensive setup:

```bash
yxhyx init
```

This additionally asks about:
- Your background and what you do
- Your life mission or purpose
- Communication style preferences (direct, diplomatic, or socratic)
- Response length preferences (concise, detailed, or adaptive)

---

## Verify Installation

After initialization, verify everything is working:

```bash
yxhyx verify
```

This checks:
- Identity file exists and is valid
- API keys are configured
- Memory system is ready
- Skills are loaded

For detailed output:

```bash
yxhyx verify --verbose
```

To also test the AI connection (makes one small API call):

```bash
yxhyx verify --test-ai
```

---

## Your First Interactions

### 1. Check Your Status

```bash
yxhyx status
```

This shows:
- Your active goals
- Active projects
- Memory statistics (ratings, learnings)
- API costs
- Last check-in

### 2. Have a Conversation

```bash
yxhyx "What are you able to help me with?"
```

Or use the explicit chat command:

```bash
yxhyx chat "Help me plan my day"
```

### 3. Rate the Response

After any interaction, rate how helpful it was (1-10):

```bash
yxhyx "8 - really helpful response"
```

Or just the number:

```bash
yxhyx "7"
```

This is **crucial** for the learning system. Low ratings (1-5) create failure learnings, high ratings (8-10) create success learnings.

### 4. View Your Learnings

```bash
yxhyx memory learnings
```

---

## Understanding the Memory System

Yxhyx's memory system is what makes it get better over time.

### The Learning Loop

```
1. You interact with Yxhyx
2. You rate the interaction (1-10)
3. Yxhyx captures the rating as a "signal"
4. Low ratings (1-5) generate failure learnings
5. High ratings (8-10) generate success learnings
6. Future interactions retrieve relevant learnings
7. Learnings are injected into AI context
8. AI uses past lessons to give better responses
```

### Key Files

```
~/.yxhyx/memory/
├── learning/
│   ├── signals/ratings.jsonl   # All your ratings
│   ├── patterns/               # Failure learnings (by month)
│   └── positive/               # Success learnings (by month)
└── state/
    ├── current.json            # Application state
    ├── checkin-history.jsonl   # Check-in records
    └── cost-tracking.json      # API costs by model
```

### View Weekly Patterns

```bash
yxhyx memory patterns
```

This synthesizes your recent ratings into actionable insights.

---

## Setting Up Goals

Goals are central to Yxhyx - they provide context for check-ins, news curation, and AI responses.

### Add a Goal

```bash
# Short-term goal (days to weeks)
yxhyx identity add-goal "Ship MVP by Friday" -t short

# Medium-term goal (weeks to months)
yxhyx identity add-goal "Launch SaaS product" -t medium

# Long-term goal (months to years)
yxhyx identity add-goal "Build a profitable business" -t long
```

### View Your Goals

```bash
yxhyx identity show
```

### Update Goal Progress

```bash
# Get the goal ID from 'identity show'
yxhyx identity progress goal-abc123 50
```

This sets the goal to 50% complete.

---

## Daily Usage Patterns

### Recommended Daily Flow

#### Morning (2 min)

```bash
# Quick morning check-in
yxhyx checkin morning -q
```

Or full check-in:

```bash
yxhyx checkin morning
```

This asks about your priorities and shows goal context.

#### During the Day

```bash
# Chat when you need help
yxhyx "How should I approach this problem?"

# Rate responses to build learnings
yxhyx "8 - good advice"

# Get personalized news
yxhyx news
```

#### Evening (2 min)

```bash
# Quick evening check-in
yxhyx checkin evening -q
```

This captures what went well and any learnings.

#### Weekly (10 min)

```bash
yxhyx checkin weekly
```

Comprehensive review of the week - accomplishments, learnings, goal updates.

### Check Your Streak

```bash
yxhyx checkin streak
```

---

## Customization

### Identity File

Your identity is stored in `~/.yxhyx/identity/identity.yaml`. You can edit this directly:

```yaml
about:
  name: "Your Name"
  timezone: "America/New_York"
  background: "What you do..."
  expertise:
    - TypeScript
    - System Design

mission: "Your life purpose..."

goals:
  short_term:
    - id: goal-abc123
      title: "Ship MVP"
      progress: 0.3
      
interests:
  high_priority:
    - topic: "AI/ML"
      subtopics: ["LLMs", "Agents"]

preferences:
  communication:
    style: direct      # direct | diplomatic | socratic
    length: concise    # concise | detailed | adaptive
```

### Model Configuration

Edit `~/.yxhyx/config/models.yaml` to customize model routing:

```yaml
routing:
  TRIVIAL: [kimi-8k]              # Simple tasks
  QUICK: [kimi-8k, gemini-flash]  # Quick tasks
  STANDARD: [kimi-32k, llama-70b] # Standard tasks
  COMPLEX: [claude-haiku]         # Complex tasks
  CRITICAL: [claude-sonnet]       # Critical tasks
```

### News Feeds

Edit `~/.yxhyx/config/feeds.yaml` to add your own RSS feeds:

```yaml
feeds:
  tech_ai:
    - name: "Hacker News"
      url: "https://hnrss.org/frontpage"
      priority: high
  custom:
    - name: "My Favorite Blog"
      url: "https://example.com/feed"
      priority: medium
```

---

## Troubleshooting

### "No API key configured" on init

Make sure your API key is exported in your current shell:

```bash
echo $KIMI_API_KEY  # Should print your key
```

If empty, add the export to your shell profile and reload:

```bash
echo 'export KIMI_API_KEY="your-key"' >> ~/.zshrc
source ~/.zshrc
```

### "Yxhyx not initialized"

Run the initialization:

```bash
yxhyx init --quick
```

### High API Costs

1. Check cost breakdown:
   ```bash
   yxhyx cost -d
   ```

2. Ensure Kimi is configured (cheapest option):
   ```bash
   echo $KIMI_API_KEY
   ```

3. Simple tasks should auto-route to cheap models. Check your model config.

### Check-in Not Working

Verify the check-in system:

```bash
yxhyx verify --verbose
```

Check if there are any errors in:
```bash
ls -la ~/.yxhyx/memory/state/
```

### Skills Not Loading

List available skills:

```bash
yxhyx skills list
```

If empty, reinstall default skills:

```bash
yxhyx init --force
```

---

## Next Steps

Now that you're set up:

1. **Build a rating habit** - Rate every significant interaction
2. **Do daily check-ins** - Even quick ones help
3. **Add your goals** - They provide crucial context
4. **Review weekly patterns** - `yxhyx memory patterns`
5. **Customize your identity** - The more context, the better

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `yxhyx init -q` | Quick initialization |
| `yxhyx verify` | Verify installation |
| `yxhyx status` | Overview of goals, costs, check-ins |
| `yxhyx "message"` | Chat with Yxhyx |
| `yxhyx "8"` | Rate last interaction |
| `yxhyx checkin morning -q` | Quick morning check-in |
| `yxhyx checkin evening -q` | Quick evening check-in |
| `yxhyx checkin weekly` | Weekly review |
| `yxhyx news` | Personalized news digest |
| `yxhyx identity show` | View your identity |
| `yxhyx identity add-goal "Goal" -t short` | Add a goal |
| `yxhyx memory learnings` | View captured learnings |
| `yxhyx memory patterns` | Weekly pattern synthesis |
| `yxhyx cost -d` | View API costs by model |
| `yxhyx skills list` | List available skills |

---

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/yxhyx/issues)
- **Documentation**: See `/docs` folder for detailed specs
- **Source Code**: Fully open source - read and contribute!

---

*Happy productivity!* 
