# Quick Check-In Workflow

## Metadata
- **Skill**: checkin
- **Workflow**: quick
- **Estimated Time**: 1-2 minutes
- **Model Complexity**: QUICK

## Description
Fast check-in for busy moments. Captures essential state without deep reflection.

## Purpose
- Quick state capture when time is limited
- Maintain check-in momentum even on busy days
- Capture energy/mood data points
- Brief priority reset

## When to Use
- Busy day with no time for full check-in
- Mid-day check-in
- Quick priority reset
- Just need to touch base

## Steps

### 1. Quick State Capture

```prompt
Quick check-in for {{user_name}}.

Current time: {{time}}
Today's date: {{date}}

Generate a brief, efficient check-in that captures:
1. Current energy/mood (1-10 scale)
2. Top priority right now
3. Any blockers
4. One thing to appreciate

Keep it concise - this is a quick touchpoint.

Response Format (JSON):
{
  "greeting": "Brief, warm greeting",
  "prompts": [
    { "label": "Energy", "question": "How's your energy? (1-10)" },
    { "label": "Priority", "question": "What's your ONE priority right now?" },
    { "label": "Blocker", "question": "Anything in your way?" },
    { "label": "Win", "question": "One thing going well?" }
  ],
  "quick_encouragement": "Brief motivational note"
}
```

### 2. Rapid Assessment
Four quick questions:
1. Energy level (1-10)
2. Current top priority
3. Any immediate blockers
4. One thing to appreciate

### 3. Quick Capture
Save the essentials:
- Timestamp
- Energy level
- Priority noted
- Any blocker flagged

## Output Format

```markdown
## Quick Check-In

*[timestamp]*

---

### Rapid Assessment

**Energy Level:** ___/10

**Right now, my priority is:**
___________________________

**In my way:**
___________________________

**Going well:**
___________________________

---

### Quick Note

[Brief encouragement - one sentence]

---

*Quick check-in saved | For deeper reflection: 'checkin evening'*
```

## Interactive Mode (Ultra-Brief)

```
Quick check-in!

Energy (1-10)? > [input]
Top priority? > [input]
Any blockers? > [input]
One win? > [input]

Got it. Keep going!
```

## Follow-up Actions
- Save minimal check-in record
- Update state with energy level
- Flag any blockers for later review
