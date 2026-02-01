# OpenCode Integration

Yxhyx integrates with [OpenCode](https://opencode.ai) to bring your personal AI context into powerful agentic coding sessions. This allows you to use Yxhyx in two complementary ways:

1. **Standalone CLI** - Quick tasks, check-ins, and lightweight chat via API
2. **OpenCode integration** - Full agentic coding with your identity context

## Overview

When you run `yxhyx init`, you'll be prompted to set up OpenCode integration. This creates configuration files that allow OpenCode to:

- Know who you are (name, background, communication preferences)
- Understand your goals and projects
- Access Yxhyx skills for check-ins, research, and news
- Write learnings back to your Yxhyx memory

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interaction                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   yxhyx CLI                          opencode                   │
│   ─────────                          ────────                   │
│   • Quick chat                       • Agentic coding           │
│   • Check-ins                        • File operations          │
│   • News/research                    • Complex tasks            │
│   • Identity management              • Multi-step workflows     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     Shared Data Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ~/.yxhyx/                     ~/.config/opencode/             │
│   ─────────                     ────────────────────            │
│   identity/                     AGENTS.md (global rules)        │
│   ├── identity.yaml  ◄─────────────────────────────────────┐    │
│   └── views/                    opencode.json              │    │
│       ├── ABOUT.md   ◄─────────────────────────────────────┤    │
│       ├── GOALS.md   ◄─────────────────────────────────────┤    │
│       └── ...                   skills/                    │    │
│                                 ├── yxhyx-checkin/ ────────┘    │
│   memory/                       ├── yxhyx-research/             │
│   └── learning/  ◄──────────────├── yxhyx-news/                 │
│                                 └── yxhyx-identity/             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Setup

### During `yxhyx init`

When you initialize Yxhyx, the setup wizard will:

1. **Detect OpenCode** - Checks if `opencode` is installed or if `~/.config/opencode/` exists
2. **Prompt for integration** - Asks if you want to set up the integration
3. **Backup existing config** - If you have existing OpenCode config, it's backed up with a timestamp
4. **Create files** - Generates AGENTS.md, opencode.json, and skill files

```bash
$ yxhyx init

✓ Welcome to Yxhyx - Your Personal AI Assistant

[... identity setup prompts ...]

? OpenCode detected. Set up Yxhyx integration with OpenCode? (Y/n) Y

ℹ Setting up OpenCode integration...
ℹ Existing config backed up to: ~/.config/opencode-backup-2025-02-01T18-30-00
✓ OpenCode integration configured!
ℹ Created 6 files:
   - ~/.config/opencode/AGENTS.md (global rules)
   - ~/.config/opencode/opencode.json (config)
   - ~/.config/opencode/skills/yxhyx-*/SKILL.md (4 skills)
```

### Manual Setup (if OpenCode installed later)

If you install OpenCode after initializing Yxhyx:

```bash
# Re-run init with --force to add OpenCode integration
yxhyx init --force

# Or manually trigger sync (if init was done with OpenCode)
yxhyx sync --opencode
```

## Files Created

### `~/.config/opencode/AGENTS.md`

This is the global rules file that OpenCode loads for every session. It includes:

- Your name, timezone, and location
- Communication preferences (style, length)
- Current goals summary
- Active projects summary
- Instructions for how the AI should behave
- References to full identity views
- Memory system instructions

Example structure:
```markdown
# Yxhyx - Personal AI Assistant

You are Yxhyx, {name}'s personal AI assistant. You know them deeply.

## Quick Reference
- **Name**: {name}
- **Communication**: {style}, {length} responses
- **Top Interests**: {interests}

## Current Goals
{goals summary}

## How to Behave
1. Address {name} by name occasionally
2. Be {style} in communication
3. Reference their goals when relevant
...

## Available Skills
- yxhyx-checkin
- yxhyx-research
- yxhyx-news
- yxhyx-identity
```

### `~/.config/opencode/opencode.json`

Configuration that points OpenCode to your Yxhyx data:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "~/.yxhyx/identity/views/ABOUT.md",
    "~/.yxhyx/identity/views/GOALS.md"
  ],
  "permission": {
    "skill": {
      "yxhyx-*": "allow"
    }
  }
}
```

### Skills

Four OpenCode skills are created in `~/.config/opencode/skills/`:

| Skill | Description |
|-------|-------------|
| `yxhyx-checkin` | Morning/evening/weekly accountability check-ins |
| `yxhyx-research` | Multi-source research with URL verification |
| `yxhyx-news` | Personalized news digest based on interests |
| `yxhyx-identity` | View and update your identity |

Each skill follows the OpenCode SKILL.md format with YAML frontmatter.

## Usage

### Using OpenCode with Yxhyx Context

```bash
# Launch OpenCode - your identity is automatically loaded
opencode

# OpenCode now knows:
# - Your name, background, and expertise
# - Your communication preferences
# - Your current goals and projects
# - Your interests for contextual help
```

### Using Yxhyx Skills in OpenCode

Inside OpenCode, you can invoke Yxhyx skills:

```
> Load the yxhyx-checkin skill and do my morning check-in

> I need to research Kubernetes networking - use the yxhyx-research skill

> Show me news about my interests using yxhyx-news

> Show my current goals using yxhyx-identity
```

The AI will load the appropriate skill and execute the workflow.

### Memory Integration

When OpenCode learns something significant about you, it can write to your Yxhyx memory:

- **Positive learnings**: `~/.yxhyx/memory/learning/positive/`
- **Failure patterns**: `~/.yxhyx/memory/learning/patterns/`

This ensures learnings from OpenCode sessions are captured for future Yxhyx interactions.

## Keeping in Sync

### Automatic Sync

When you modify your identity via Yxhyx commands, the sync happens automatically:

```bash
yxhyx identity add-goal "Learn Rust" -t medium
# ✓ Views regenerated
# ✓ OpenCode files synced (if integration is set up)
```

### Manual Sync

If you edit `identity.yaml` directly or want to force a refresh:

```bash
# Sync everything
yxhyx sync

# Only regenerate identity views
yxhyx sync --views

# Only regenerate OpenCode files
yxhyx sync --opencode

# Verbose output
yxhyx sync --verbose
```

## Troubleshooting

### OpenCode not seeing my identity

1. Check if AGENTS.md exists: `cat ~/.config/opencode/AGENTS.md`
2. Run sync: `yxhyx sync --opencode`
3. Verify the file references are correct

### Skills not appearing in OpenCode

1. Check skill directories exist: `ls ~/.config/opencode/skills/`
2. Verify SKILL.md files have correct frontmatter
3. Run sync: `yxhyx sync --opencode`

### Changes not reflecting in OpenCode

1. Run `yxhyx sync` to regenerate all files
2. Restart OpenCode to reload configuration
3. Check that `~/.yxhyx/identity/identity.yaml` has the expected content

### Backup restoration

If something goes wrong, restore from backup:

```bash
# List backups
ls ~/.config/opencode-backup-*

# Restore a backup
cp -r ~/.config/opencode-backup-2025-02-01T18-30-00/* ~/.config/opencode/
```

## Best Practices

1. **Use Yxhyx CLI for identity changes** - Commands like `yxhyx identity add-goal` handle syncing automatically

2. **Run sync after manual edits** - If you edit `identity.yaml` directly, run `yxhyx sync`

3. **Keep backups** - The integration creates timestamped backups, but you can also create manual ones

4. **Check costs** - OpenCode uses more tokens than Yxhyx CLI; monitor with `yxhyx cost`

5. **Use skills appropriately** - Simple tasks: Yxhyx CLI. Complex coding: OpenCode with skills

## Comparison: Yxhyx CLI vs OpenCode

| Feature | Yxhyx CLI | OpenCode + Yxhyx |
|---------|-----------|------------------|
| Cost | Lower (cheapest model routing) | Higher (capable models) |
| Speed | Fast | Moderate |
| File editing | No | Yes |
| Multi-step tasks | Limited | Full support |
| Check-ins | Native | Via skill |
| Research | Native | Via skill |
| News | Native | Via skill |
| Identity context | Full | Full |
| Agentic coding | No | Yes |

**Recommendation**: Use Yxhyx CLI for quick interactions, check-ins, and when cost matters. Use OpenCode when you need agentic capabilities, file editing, or complex multi-step workflows.
