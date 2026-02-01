/**
 * OpenCode Integration - Set up Yxhyx integration with OpenCode
 *
 * This module handles:
 * - Detecting OpenCode installation
 * - Backing up existing OpenCode configuration
 * - Generating AGENTS.md (global rules with identity context)
 * - Generating opencode.json configuration
 * - Creating OpenCode-format skills (SKILL.md)
 * - Syncing when identity changes
 */

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { loadIdentity } from './context-loader';
import type { Identity } from './schemas/identity';

const execAsync = promisify(exec);

// Paths
const OPENCODE_CONFIG_DIR = `${process.env.HOME}/.config/opencode`;
const OPENCODE_SKILLS_DIR = `${OPENCODE_CONFIG_DIR}/skills`;

/**
 * Check if OpenCode is installed
 */
export async function detectOpenCode(): Promise<{
	installed: boolean;
	binaryPath?: string;
	configExists: boolean;
}> {
	let binaryPath: string | undefined;
	let installed = false;

	// Check if opencode is in PATH
	try {
		const { stdout } = await execAsync('which opencode');
		binaryPath = stdout.trim();
		installed = true;
	} catch {
		// Not in PATH, check common locations
		const commonPaths = [
			`${process.env.HOME}/.opencode/bin/opencode`,
			'/usr/local/bin/opencode',
			'/opt/homebrew/bin/opencode',
		];

		for (const path of commonPaths) {
			if (existsSync(path)) {
				binaryPath = path;
				installed = true;
				break;
			}
		}
	}

	const configExists = existsSync(OPENCODE_CONFIG_DIR);

	return { installed, binaryPath, configExists };
}

/**
 * Backup existing OpenCode configuration
 */
export async function backupExistingConfig(): Promise<string | null> {
	if (!existsSync(OPENCODE_CONFIG_DIR)) {
		return null;
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const backupDir = `${process.env.HOME}/.config/opencode-backup-${timestamp}`;

	await cp(OPENCODE_CONFIG_DIR, backupDir, { recursive: true });

	return backupDir;
}

/**
 * Generate the AGENTS.md file with identity context
 */
export async function generateAgentsMd(identity: Identity): Promise<string> {
	const { about, goals, projects, interests, preferences } = identity;

	// Get top interests
	const topInterests = [
		...interests.high_priority.slice(0, 3),
		...interests.medium_priority.slice(0, 2),
	]
		.map((i) => i.topic)
		.join(', ');

	// Get active goals summary
	const activeGoals = [
		...goals.short_term.filter((g) => g.progress < 1),
		...goals.medium_term.filter((g) => g.progress < 1),
		...goals.long_term.filter((g) => g.progress < 1),
	];

	const goalsSummary =
		activeGoals.length > 0
			? activeGoals
					.slice(0, 5)
					.map((g) => `- ${g.title} (${Math.round(g.progress * 100)}%)`)
					.join('\n')
			: '_No active goals_';

	// Get active projects summary
	const activeProjects = projects.filter((p) => p.status === 'active');
	const projectsSummary =
		activeProjects.length > 0
			? activeProjects
					.slice(0, 5)
					.map((p) => `- **${p.name}**: ${p.description.slice(0, 100)}...`)
					.join('\n')
			: '_No active projects_';

	// Communication style description
	const styleDescriptions: Record<string, string> = {
		direct: 'Get straight to the point, no fluff',
		diplomatic: 'Balanced and considerate, but still clear',
		socratic: 'Guide with questions, help discover answers',
	};

	const lengthDescriptions: Record<string, string> = {
		concise: 'Keep it brief - bullet points over paragraphs',
		detailed: 'Comprehensive explanations when needed',
		adaptive: 'Match response length to question complexity',
	};

	const content = `# Yxhyx - Personal AI Assistant

You are Yxhyx, ${about.name}'s personal AI assistant. You know them deeply.

## Quick Reference

- **Name**: ${about.name}
- **Timezone**: ${about.timezone}
- **Location**: ${about.location || 'Not specified'}
- **Communication**: ${preferences.communication.style}, ${preferences.communication.length} responses
- **Top Interests**: ${topInterests || 'Not specified'}

## Current Goals

${goalsSummary}

## Active Projects

${projectsSummary}

## How to Behave

1. Address ${about.name} by name occasionally (but not every message)
2. Be **${preferences.communication.style}** - ${styleDescriptions[preferences.communication.style] || ''}
3. Keep responses **${preferences.communication.length}** - ${lengthDescriptions[preferences.communication.length] || ''}
4. Reference their goals when relevant to keep them accountable
5. When you learn something significant about ${about.name}, write it to memory

## Full Context (Read When Needed)

For complete identity details, read these files:
- \`~/.yxhyx/identity/views/ABOUT.md\` - Background, expertise, mission
- \`~/.yxhyx/identity/views/GOALS.md\` - All goals with progress
- \`~/.yxhyx/identity/views/PROJECTS.md\` - Projects and next actions
- \`~/.yxhyx/identity/views/INTERESTS.md\` - Interest priorities
- \`~/.yxhyx/identity/views/LEARNED.md\` - Past lessons
- \`~/.yxhyx/identity/views/CHALLENGES.md\` - Current challenges

## Memory System

When you learn something important about ${about.name} or discover a pattern:

**Positive learnings** (things that work well):
\`\`\`bash
# Write to: ~/.yxhyx/memory/learning/positive/{date}-{topic}.md
\`\`\`

**Failure patterns** (things to avoid):
\`\`\`bash
# Write to: ~/.yxhyx/memory/learning/patterns/{date}-{topic}.md
\`\`\`

Format for learning files:
\`\`\`markdown
# Learning: {Brief Title}

**Date**: {YYYY-MM-DD}
**Context**: {What were we working on}

## What Happened
{Description}

## Key Insight
{The actual learning}

## Application
{When/how to apply this in the future}
\`\`\`

## Available Skills

Use the \`skill\` tool to access Yxhyx capabilities:
- \`yxhyx-checkin\` - Accountability check-ins (morning/evening/weekly)
- \`yxhyx-research\` - Multi-source research with URL verification
- \`yxhyx-news\` - Personalized news digest
- \`yxhyx-identity\` - View and update identity

---
*Generated by Yxhyx on ${new Date().toISOString()}*
*Run \`yxhyx sync\` to regenerate after identity changes*
`;

	return content;
}

/**
 * Generate opencode.json configuration
 */
export function generateOpenCodeConfig(): object {
	return {
		$schema: 'https://opencode.ai/config.json',
		instructions: ['~/.yxhyx/identity/views/ABOUT.md', '~/.yxhyx/identity/views/GOALS.md'],
		permission: {
			skill: {
				'yxhyx-*': 'allow',
			},
		},
	};
}

/**
 * Generate all OpenCode skill files
 */
export async function generateOpenCodeSkills(identity: Identity): Promise<void> {
	const { about } = identity;

	// Ensure skills directory exists
	await mkdir(OPENCODE_SKILLS_DIR, { recursive: true });

	// Generate each skill
	const skills = [
		{
			name: 'yxhyx-checkin',
			content: generateCheckinSkill(about.name),
		},
		{
			name: 'yxhyx-research',
			content: generateResearchSkill(about.name),
		},
		{
			name: 'yxhyx-news',
			content: generateNewsSkill(about.name),
		},
		{
			name: 'yxhyx-identity',
			content: generateIdentitySkill(about.name),
		},
	];

	for (const skill of skills) {
		const skillDir = `${OPENCODE_SKILLS_DIR}/${skill.name}`;
		await mkdir(skillDir, { recursive: true });
		await writeFile(`${skillDir}/SKILL.md`, skill.content);
	}
}

/**
 * Generate check-in skill
 */
function generateCheckinSkill(userName: string): string {
	return `---
name: yxhyx-checkin
description: Accountability check-ins - morning planning, evening reflection, weekly review. Helps ${userName} track goals and build consistency.
---

# Check-In Skill

Perform accountability check-ins for ${userName}.

## Available Workflows

### Morning Check-In
**Trigger**: "morning check-in", "start my day", "plan today"

1. Read yesterday's evening check-in from \`~/.yxhyx/memory/state/checkin-history.jsonl\` (last entry with type "evening")
2. Read current goals from \`~/.yxhyx/identity/views/GOALS.md\`
3. Ask: "What are your top 3 priorities for today?"
4. Connect their priorities to their goals - ask how each priority moves a goal forward
5. Ask: "Any blockers or concerns I should know about?"
6. Summarize and save check-in to history

### Evening Check-In
**Trigger**: "evening check-in", "end of day", "reflect on today"

1. Read today's morning check-in from history
2. Ask: "What did you accomplish today?"
3. Compare to morning priorities
4. Ask: "What worked well? What didn't?"
5. If they mention a learning, capture it to \`~/.yxhyx/memory/learning/positive/\` or \`patterns/\`
6. Save check-in to history

### Weekly Check-In
**Trigger**: "weekly check-in", "week review", "weekly reflection"

1. Read all check-ins from the past 7 days from history
2. Summarize the week: accomplishments, patterns, recurring blockers
3. Review goal progress from \`~/.yxhyx/identity/views/GOALS.md\`
4. Ask: "What do you want to focus on next week?"
5. Suggest goal updates if progress warrants it
6. Save comprehensive check-in to history

## Check-In History Format

Append to \`~/.yxhyx/memory/state/checkin-history.jsonl\`:
\`\`\`json
{"type": "morning", "date": "2025-02-01", "timestamp": "2025-02-01T08:30:00Z", "priorities": ["priority 1", "priority 2"], "blockers": [], "notes": ""}
{"type": "evening", "date": "2025-02-01", "timestamp": "2025-02-01T18:00:00Z", "accomplished": ["task 1"], "wins": ["win 1"], "challenges": ["challenge 1"], "learnings": []}
{"type": "weekly", "date": "2025-02-01", "timestamp": "2025-02-01T10:00:00Z", "summary": "...", "goal_progress": {}, "next_week_focus": []}
\`\`\`

## Tone

Be encouraging but direct. Reference ${userName}'s goals to keep them accountable.
Celebrate wins, but also gently call out when priorities weren't met.
`;
}

/**
 * Generate research skill
 */
function generateResearchSkill(userName: string): string {
	return `---
name: yxhyx-research
description: Multi-source research with URL verification. Quick, standard, or deep research modes based on complexity.
---

# Research Skill

Conduct research for ${userName}, tailored to their interests.

## Workflows

### Quick Research (10-15 seconds)
**Trigger**: Simple factual questions, "quick lookup", "briefly research"

- Single focused search
- 2-3 paragraph summary
- 3-5 verified sources
- Best for: facts, definitions, quick answers

### Standard Research (30-60 seconds)
**Trigger**: Default for "research X", "find out about X"

- Multiple perspectives
- Comprehensive summary
- 5-10 verified sources
- Note relevance to ${userName}'s interests/goals if applicable

### Deep Research (2-5 minutes)
**Trigger**: "Deep research", "thorough", "comprehensive"

- Multiple search angles
- Cross-reference sources for accuracy
- Identify contradictions or debates in the field
- Synthesize into actionable insights
- Connect findings to ${userName}'s goals if relevant

## URL Verification

**ALWAYS verify URLs before including them:**
1. Check URL format is valid (proper scheme, domain)
2. Prefer authoritative sources (.gov, .edu, major publications)
3. Note recency - prefer recent sources for fast-moving topics
4. If you can't verify a URL, mark it as \`[unverified]\`

## Output Format

\`\`\`markdown
## Research: {topic}

### Summary
{2-3 paragraph summary of key findings}

### Key Findings
- Finding 1 with supporting detail
- Finding 2 with supporting detail
- Finding 3 with supporting detail

### Sources
1. [Title](url) - {one-line description of what this source covers}
2. [Title](url) - {one-line description}
...

### Relevance to Your Goals
{If applicable: how this connects to ${userName}'s stated goals or interests}
\`\`\`

## Context

Read ${userName}'s interests from: \`~/.yxhyx/identity/views/INTERESTS.md\`
This helps prioritize information relevant to them.
`;
}

/**
 * Generate news skill
 */
function generateNewsSkill(userName: string): string {
	return `---
name: yxhyx-news
description: Personalized news digest based on ${userName}'s interests. Aggregates from multiple sources with goal-relevance highlighting.
---

# News Skill

Generate personalized news digests for ${userName}.

## Workflow

1. Read interests from \`~/.yxhyx/identity/views/INTERESTS.md\`
2. Read current goals from \`~/.yxhyx/identity/views/GOALS.md\`
3. Read feed configuration from \`~/.yxhyx/config/feeds.yaml\` (if exists)
4. Gather recent news via web search or configured feeds
5. Filter and rank by interest relevance
6. Highlight items relevant to current goals
7. Present organized digest

## Output Format

\`\`\`markdown
## News Digest - {date}

### 🎯 Goal-Relevant
{Items directly related to ${userName}'s current goals - explain WHY it's relevant}

### 🔥 Top Stories in Your Interests
**{Interest Category}**
- [Headline](url) - {one-line summary}
- [Headline](url) - {one-line summary}

**{Another Interest}**
- [Headline](url) - {one-line summary}

### 📰 Other Notable
{Interesting items that don't fit above categories}

### 💡 Worth Watching
{Emerging trends or developing stories in ${userName}'s areas}
\`\`\`

## Personalization Rules

1. **High-priority interests** get more coverage
2. **Goal-relevant news** always goes first
3. **Recency matters** - prefer news from last 24-48 hours
4. **Source diversity** - don't over-represent any single source
5. **Verify all URLs** before including

## News Preferences

Check \`~/.yxhyx/identity/identity.yaml\` for:
- \`preferences.news.format\`: bullet_points | paragraphs | headlines_only
- \`preferences.news.max_items\`: how many items to include
- \`preferences.news.preferred_sources\`: sources to prioritize
`;
}

/**
 * Generate identity management skill
 */
function generateIdentitySkill(userName: string): string {
	return `---
name: yxhyx-identity
description: View and update ${userName}'s identity - goals, projects, interests, and preferences. Helps maintain accurate personal context.
---

# Identity Skill

Manage ${userName}'s identity and personal context.

## View Commands

### Show Full Identity
**Trigger**: "Show my identity", "who am I to you", "what do you know about me"

Read and present a summary from:
- \`~/.yxhyx/identity/views/ABOUT.md\`
- Key goals from \`~/.yxhyx/identity/views/GOALS.md\`
- Active projects from \`~/.yxhyx/identity/views/PROJECTS.md\`

### Show Goals
**Trigger**: "Show my goals", "what are my goals", "goal status"

Read and present: \`~/.yxhyx/identity/views/GOALS.md\`

### Show Projects
**Trigger**: "Show my projects", "what am I working on", "project status"

Read and present: \`~/.yxhyx/identity/views/PROJECTS.md\`

### Show Interests
**Trigger**: "Show my interests", "what am I interested in"

Read and present: \`~/.yxhyx/identity/views/INTERESTS.md\`

## Update Commands

### Add Goal
**Trigger**: "Add goal: {description}", "New goal: {description}"

1. Ask clarifying questions: timeframe (short/medium/long-term), deadline, related projects
2. Generate a unique ID
3. Read current \`~/.yxhyx/identity/identity.yaml\`
4. Add new goal to appropriate section in \`goals\`
5. Write updated YAML back
6. Tell ${userName} to run \`yxhyx sync\` to update views

### Update Goal Progress
**Trigger**: "Update goal progress", "{goal} is now X% complete"

1. Find goal in identity.yaml by title or ID
2. Update the \`progress\` field (0.0 to 1.0)
3. Write updated YAML
4. Remind to run \`yxhyx sync\`

### Add Project
**Trigger**: "Add project: {name}", "New project: {name}"

1. Gather: description, status (active), related goals, initial next actions
2. Generate unique ID
3. Add to \`projects\` array in identity.yaml
4. Write and remind to sync

### Add Learning
**Trigger**: "I learned: {lesson}", "Note this learning: {lesson}"

1. Add to \`learned\` array in identity.yaml with today's date
2. Also write to \`~/.yxhyx/memory/learning/positive/{date}-learning.md\`
3. Write and remind to sync

### Update Preferences
**Trigger**: "Change my communication style to...", "I prefer..."

1. Identify which preference to update
2. Update in identity.yaml \`preferences\` section
3. Write and remind to sync

## Important Notes

- **Source of truth**: \`~/.yxhyx/identity/identity.yaml\`
- **Views are generated**: The .md files in views/ are auto-generated
- **Always remind to sync**: After any change, tell ${userName} to run \`yxhyx sync\`
- **Validate before writing**: Ensure YAML structure is maintained
`;
}

/**
 * Main function to set up OpenCode integration
 */
export async function setupOpenCodeIntegration(): Promise<{
	backupPath: string | null;
	filesCreated: string[];
}> {
	const identity = await loadIdentity();
	const filesCreated: string[] = [];

	// Backup existing config
	const backupPath = await backupExistingConfig();

	// Ensure config directory exists
	await mkdir(OPENCODE_CONFIG_DIR, { recursive: true });

	// Generate and write AGENTS.md
	const agentsMd = await generateAgentsMd(identity);
	await writeFile(`${OPENCODE_CONFIG_DIR}/AGENTS.md`, agentsMd);
	filesCreated.push(`${OPENCODE_CONFIG_DIR}/AGENTS.md`);

	// Generate and write opencode.json (merge with existing if present)
	const configPath = `${OPENCODE_CONFIG_DIR}/opencode.json`;
	let existingConfig: object = {};

	if (existsSync(configPath)) {
		try {
			const content = await readFile(configPath, 'utf-8');
			existingConfig = JSON.parse(content);
		} catch {
			// Invalid JSON, will overwrite
		}
	}

	const newConfig = generateOpenCodeConfig();
	const mergedConfig = { ...existingConfig, ...newConfig };
	await writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
	filesCreated.push(configPath);

	// Generate skills
	await generateOpenCodeSkills(identity);
	filesCreated.push(`${OPENCODE_SKILLS_DIR}/yxhyx-checkin/SKILL.md`);
	filesCreated.push(`${OPENCODE_SKILLS_DIR}/yxhyx-research/SKILL.md`);
	filesCreated.push(`${OPENCODE_SKILLS_DIR}/yxhyx-news/SKILL.md`);
	filesCreated.push(`${OPENCODE_SKILLS_DIR}/yxhyx-identity/SKILL.md`);

	return { backupPath, filesCreated };
}

/**
 * Sync OpenCode integration after identity changes
 * Regenerates AGENTS.md and skills with current identity
 */
export async function syncOpenCodeIntegration(): Promise<void> {
	const identity = await loadIdentity();

	// Regenerate AGENTS.md
	const agentsMd = await generateAgentsMd(identity);
	await mkdir(OPENCODE_CONFIG_DIR, { recursive: true });
	await writeFile(`${OPENCODE_CONFIG_DIR}/AGENTS.md`, agentsMd);

	// Regenerate skills
	await generateOpenCodeSkills(identity);
}

/**
 * Check if OpenCode integration is set up
 */
export function isOpenCodeIntegrationSetUp(): boolean {
	return (
		existsSync(`${OPENCODE_CONFIG_DIR}/AGENTS.md`) &&
		existsSync(`${OPENCODE_SKILLS_DIR}/yxhyx-checkin/SKILL.md`)
	);
}
