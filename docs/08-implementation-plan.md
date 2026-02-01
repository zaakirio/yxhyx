# Implementation Plan - Phased Build Roadmap

## Overview

This document outlines a phased approach to building Yxhyx. Each phase builds on the previous, resulting in progressively more capable system. The plan is designed for an ongoing project where features are built incrementally.

## Timeline Overview

```
Phase 1: Foundation (Week 1-2)
├── Project setup
├── Identity system
├── Basic CLI
└── Model router

Phase 2: Memory (Week 2-3)
├── Work tracking
├── Learning capture
└── Context injection

Phase 3: Core Skills (Week 3-4)
├── Chat functionality
├── Check-in system
└── News aggregation

Phase 4: Research (Week 4-5)
├── URL verification
├── Multi-model research
└── RSS integration

Phase 5: Polish (Week 5-6)
├── Error handling
├── Testing
└── Documentation
```

## Phase 1: Foundation

**Goal**: Basic project structure with identity management and model routing.

### Tasks

#### 1.1 Project Setup
```bash
# Create project
mkdir yxhyx && cd yxhyx
bun init

# Install dependencies
bun add commander inquirer yaml zod rss-parser
bun add -d typescript @types/bun vitest @biomejs/biome

# Create directory structure
mkdir -p lib/{schemas,memory,skills,research}
mkdir -p commands
mkdir -p bin
```

**Deliverables**:
- [ ] `package.json` with dependencies
- [ ] `tsconfig.json` configured
- [ ] `biome.json` for linting
- [ ] Basic directory structure

#### 1.2 Identity Schema
```typescript
// lib/schemas/identity.ts
// - Define Zod schema for identity
// - Export TypeScript types
```

**Deliverables**:
- [ ] `lib/schemas/identity.ts` - Zod schema
- [ ] Identity validation working

#### 1.3 Context Loader
```typescript
// lib/context-loader.ts
// - Load identity from YAML
// - Update identity atomically
// - Query helpers (getActiveGoals, etc.)
```

**Deliverables**:
- [ ] `lib/context-loader.ts` - CRUD operations
- [ ] `lib/view-generator.ts` - Markdown view generation

#### 1.4 Model Router
```typescript
// lib/model-router/router.ts
// - Complexity classification
// - Provider abstraction (Kimi, OpenRouter, Anthropic)
// - Cost tracking
```

**Deliverables**:
- [ ] `lib/model-router/complexity.ts`
- [ ] `lib/model-router/router.ts`
- [ ] `config/models.yaml` template

#### 1.5 Basic CLI
```typescript
// bin/yxhyx.ts
// - Commander setup
// - init command
// - identity commands
```

**Deliverables**:
- [ ] `bin/yxhyx.ts` - Entry point
- [ ] `commands/init.ts` - Initialization wizard
- [ ] `commands/identity.ts` - Identity management

### Phase 1 Verification

```bash
# Initialize
bun run bin/yxhyx.ts init

# Check identity
bun run bin/yxhyx.ts identity show

# Add a goal
bun run bin/yxhyx.ts identity add-goal "Test goal" -t short

# Verify cost routing
bun run bin/yxhyx.ts identity show
```

---

## Phase 2: Memory System

**Goal**: Persistent work tracking and learning capture.

### Tasks

#### 2.1 Work Tracking
```typescript
// lib/memory/work-manager.ts
// - Create work (effort-based structure)
// - Add items
// - Complete work
// - Current work state
```

**Deliverables**:
- [ ] `lib/schemas/work.ts` - Work item schema
- [ ] `lib/memory/work-manager.ts` - Work CRUD
- [ ] Work directory auto-creation

#### 2.2 Learning Capture
```typescript
// lib/memory/learning-manager.ts
// - Rating capture (explicit/implicit)
// - Learning generation from ratings
// - Pattern synthesis
```

**Deliverables**:
- [ ] `lib/schemas/learning.ts` - Learning schema
- [ ] `lib/memory/learning-manager.ts` - Learning CRUD
- [ ] Explicit rating parser
- [ ] (Optional) Implicit sentiment analysis

#### 2.3 State Management
```typescript
// lib/memory/state-manager.ts
// - Current state tracking
// - Check-in history
// - Cost tracking
```

**Deliverables**:
- [ ] `lib/memory/state-manager.ts`
- [ ] State file initialization in `init`

#### 2.4 Context Injection
```typescript
// lib/memory/context-injection.ts
// - Build enhanced context with learnings
// - Task-specific context building
```

**Deliverables**:
- [ ] `lib/memory/context-injection.ts`
- [ ] Learning retrieval (keyword-based)

#### 2.5 Memory Commands
```typescript
// commands/memory.ts
// - View learnings
// - View patterns
// - Rate command
// - Cost tracking
```

**Deliverables**:
- [ ] `commands/memory.ts`
- [ ] `commands/cost.ts`

### Phase 2 Verification

```bash
# Rate an interaction
bun run bin/yxhyx.ts "8 - great response"

# View learnings
bun run bin/yxhyx.ts memory learnings

# View costs
bun run bin/yxhyx.ts cost
```

---

## Phase 3: Core Skills

**Goal**: Chat, check-ins, and basic news functionality.

### Tasks

#### 3.1 Chat Command
```typescript
// commands/chat.ts
// - Single message mode
// - Interactive mode
// - Rating integration
```

**Deliverables**:
- [ ] `commands/chat.ts`
- [ ] Context injection integration
- [ ] Work tracking integration

#### 3.2 Check-In Templates
```typescript
// lib/checkin/templates.ts
// - Morning prompt builder
// - Evening prompt builder
// - Weekly prompt builder
```

**Deliverables**:
- [ ] `lib/checkin/templates.ts`
- [ ] Goal/project integration

#### 3.3 Check-In Runner
```typescript
// lib/checkin/runner.ts
// - Interactive check-in flow
// - Response parsing
// - Goal update extraction
```

**Deliverables**:
- [ ] `lib/checkin/runner.ts`
- [ ] `lib/checkin/quick.ts` - Quick mode
- [ ] `commands/checkin.ts`

#### 3.4 Status Command
```typescript
// commands/status.ts
// - Goals summary
// - Check-in status
// - Cost summary
```

**Deliverables**:
- [ ] `commands/status.ts`
- [ ] Formatting utilities

### Phase 3 Verification

```bash
# Chat
bun run bin/yxhyx.ts chat "Hello, what can you help me with?"

# Interactive chat
bun run bin/yxhyx.ts chat -i

# Check-in
bun run bin/yxhyx.ts checkin morning

# Quick check-in
bun run bin/yxhyx.ts checkin -q

# Status
bun run bin/yxhyx.ts status
```

---

## Phase 4: Research & News

**Goal**: Multi-source research and news aggregation.

### Tasks

#### 4.1 URL Verification
```typescript
// lib/research/url-verifier.ts
// - HTTP status check
// - Content verification
// - Batch verification
```

**Deliverables**:
- [ ] `lib/research/url-verifier.ts`

#### 4.2 Feed Fetcher
```typescript
// lib/research/feed-fetcher.ts
// - RSS parsing
// - Feed configuration
// - Deduplication
```

**Deliverables**:
- [ ] `lib/research/feed-fetcher.ts`
- [ ] `lib/research/source-types.ts`
- [ ] `config/feeds.yaml` template

#### 4.3 News Digest
```typescript
// lib/research/news-digest.ts
// - Digest generation
// - Interest matching
// - Goal relevance
```

**Deliverables**:
- [ ] `lib/research/news-digest.ts`
- [ ] `commands/news.ts`

#### 4.4 Research Functions
```typescript
// lib/research/quick-research.ts
// lib/research/standard-research.ts
// - Single-model research
// - Multi-model research
// - Synthesis
```

**Deliverables**:
- [ ] `lib/research/quick-research.ts`
- [ ] `lib/research/standard-research.ts`
- [ ] Research subcommand in news

### Phase 4 Verification

```bash
# News digest
bun run bin/yxhyx.ts news

# Specific category
bun run bin/yxhyx.ts news -c security

# Quick research
bun run bin/yxhyx.ts news research "TypeScript best practices"

# Deep research
bun run bin/yxhyx.ts news research "AI agent architectures" -d
```

---

## Phase 5: Polish

**Goal**: Production-ready quality.

### Tasks

#### 5.1 Error Handling
- [ ] Graceful API failures
- [ ] Network timeout handling
- [ ] Invalid config recovery
- [ ] User-friendly error messages

#### 5.2 Testing
```typescript
// tests/
// - Unit tests for core functions
// - Integration tests for commands
// - Mock AI responses
```

**Deliverables**:
- [ ] `tests/identity.test.ts`
- [ ] `tests/memory.test.ts`
- [ ] `tests/router.test.ts`
- [ ] `tests/commands.test.ts`

#### 5.3 Documentation
- [ ] README.md
- [ ] INSTALL.md
- [ ] Example configs
- [ ] Troubleshooting guide

#### 5.4 Build & Publish
```bash
# Build
bun build ./bin/yxhyx.ts --outdir ./dist --target node

# Test install
npm pack
npm install -g ./yxhyx-1.0.0.tgz

# Verify
yxhyx --version
```

**Deliverables**:
- [ ] Working `bun run build`
- [ ] npm publish ready
- [ ] Shell completions

### Phase 5 Verification

```bash
# Run tests
bun test

# Build
bun run build

# Install globally
npm install -g .

# Full workflow test
yxhyx init
yxhyx identity add-goal "Test publishing" -t short
yxhyx checkin morning
yxhyx news
yxhyx status
yxhyx "7 - works well"
```

---

## Future Enhancements

After core functionality is stable:

### Voice Integration
- [ ] ElevenLabs TTS for responses
- [ ] Speech-to-text input
- [ ] Voice command mode

### Scheduling
- [ ] Cron-based reminders
- [ ] Automated check-in prompts
- [ ] Scheduled news digests

### UI Dashboard (Phase 6+)
- [ ] Next.js dashboard
- [ ] Identity editor
- [ ] Goal visualization
- [ ] Check-in history charts

### Advanced Learning
- [ ] Embedding-based retrieval
- [ ] Pattern prediction
- [ ] Proactive suggestions

---

## Development Guidelines

### Code Standards
- Use TypeScript strict mode
- Validate all external data with Zod
- Handle errors gracefully
- Log appropriately (verbose flag)

### Testing Strategy
- Unit test pure functions
- Integration test commands with mocked AI
- Manual testing for UX

### Git Workflow
```bash
# Feature branches
git checkout -b feature/memory-system

# Conventional commits
git commit -m "feat(memory): add work tracking"
git commit -m "fix(router): handle timeout"
git commit -m "docs: update implementation plan"

# Regular commits
git push origin feature/memory-system
```

### Daily Development Flow
```bash
# Start with status
yxhyx status

# Morning check-in
yxhyx checkin morning

# Code...

# Evening check-in
yxhyx checkin evening

# Rate the day
yxhyx "7 - productive day"
```

---

## Milestone Checklist

### MVP (End of Phase 3)
- [ ] Can initialize and store identity
- [ ] Can chat with context
- [ ] Can do morning/evening check-ins
- [ ] Can rate interactions
- [ ] Model routing works
- [ ] Costs are tracked

### Full Release (End of Phase 5)
- [ ] All commands working
- [ ] News aggregation functional
- [ ] Research with URL verification
- [ ] Tests passing
- [ ] Documentation complete
- [ ] Published to npm

---

## Quick Reference

### Key Files by Phase

| Phase | Key Files |
|-------|-----------|
| 1 | `lib/schemas/identity.ts`, `lib/context-loader.ts`, `lib/model-router/router.ts` |
| 2 | `lib/memory/work-manager.ts`, `lib/memory/learning-manager.ts` |
| 3 | `commands/chat.ts`, `lib/checkin/runner.ts` |
| 4 | `lib/research/feed-fetcher.ts`, `lib/research/news-digest.ts` |
| 5 | `tests/*`, `README.md` |

### Command Availability by Phase

| Command | Phase |
|---------|-------|
| `init` | 1 |
| `identity` | 1 |
| `chat` | 3 |
| `checkin` | 3 |
| `status` | 3 |
| `memory` | 2 |
| `cost` | 2 |
| `news` | 4 |
| `research` | 4 |
| `skills` | 5 |
