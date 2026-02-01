# Weekly Check-In Workflow

## Metadata
- **Skill**: checkin
- **Workflow**: weekly
- **Estimated Time**: 10-15 minutes
- **Model Complexity**: COMPLEX

## Description
Comprehensive weekly review and planning session. Reviews progress on goals, processes the week's experiences, captures key learnings, and plans the week ahead.

## Purpose
- Review progress across all goals
- Identify patterns and trends
- Capture significant learnings
- Celebrate wins and milestones
- Process challenges and setbacks
- Plan and prioritize the coming week
- Adjust goals if needed

## Context Required
- All goals with progress tracking
- Week's check-in history
- Active projects and their status
- Recent learnings
- Current challenges

## Steps

### 1. Week in Review

```prompt
It's time for your weekly review, {{user_name}}.

This Week's Context:
- Check-ins completed: {{checkin_count}}
- Days since last weekly: {{days_since_weekly}}

Your Goals:
{{#each goals}}
- **{{this.goal}}** ({{this.term}})
  - Progress: {{this.progress}}%
  - Status: {{this.status}}
{{/each}}

Active Projects:
{{#each projects}}
- **{{this.name}}**: {{this.status}}
{{/each}}

Generate a comprehensive weekly review that:
1. Summarizes the week's journey
2. Reviews each goal's progress
3. Celebrates wins and milestones
4. Addresses challenges honestly
5. Extracts key learnings
6. Plans the upcoming week
7. Suggests any goal adjustments

Response Format (JSON):
{
  "week_summary": "Overview of the week",
  "goal_reviews": [
    {
      "goal": "Goal name",
      "progress_this_week": "What happened",
      "wins": ["Win 1", "Win 2"],
      "challenges": ["Challenge 1"],
      "next_week_focus": "Priority for next week",
      "suggested_adjustment": "Any suggested changes (optional)"
    }
  ],
  "top_wins": ["Week's biggest wins"],
  "key_learnings": [
    {
      "learning": "What was learned",
      "context": "How it came about",
      "application": "How to apply going forward"
    }
  ],
  "patterns_noticed": ["Patterns or trends"],
  "next_week": {
    "theme": "Week's theme or focus",
    "priorities": ["Priority 1", "Priority 2", "Priority 3"],
    "intentions": ["Intention 1", "Intention 2"]
  },
  "self_care_reminder": "Reminder about sustainability and rest"
}
```

### 2. Goal-by-Goal Review
For each active goal:
- What progress was made?
- What contributed to progress?
- What blocked progress?
- Is the goal still relevant?
- Any adjustments needed?

### 3. Pattern Recognition
Identify recurring themes:
- What keeps working?
- What keeps not working?
- Energy patterns throughout week
- Productivity patterns
- Obstacle patterns

### 4. Learning Synthesis
Consolidate the week's insights:
- Key learnings
- Skills developed
- Knowledge gained
- Mindset shifts

### 5. Week Ahead Planning
Set up for success:
- Top 3 priorities
- Key milestones to hit
- Potential obstacles
- Support needed

### 6. Goal Adjustment Check
Review if goals need updating:
- Still relevant and motivating?
- Progress appropriate?
- Timeline realistic?
- Any new goals emerging?

## Output Format

```markdown
## Weekly Review

*Week of [date range]*

---

### Week at a Glance

[Overview of the week - energy, productivity, key events]

**Check-ins this week:** [count]

---

### Goal Progress Review

{{#each goals}}

#### {{goal}}
**Term:** {{term}} | **Progress:** {{progress}}%

**This Week:**
- [What happened with this goal]

**Wins:**
- [Win 1]
- [Win 2]

**Challenges:**
- [Challenge 1]

**Next Week Focus:**
- [Priority for this goal next week]

{{#if suggested_adjustment}}
**Suggested Adjustment:** {{suggested_adjustment}}
{{/if}}

---

{{/each}}

### This Week's Wins

1. [Biggest win]
2. [Second win]
3. [Third win]

*Take a moment to feel proud of these accomplishments.*

---

### Key Learnings

| Learning | Context | Application |
|----------|---------|-------------|
| [Learning 1] | [How it came about] | [How to use it] |
| [Learning 2] | [How it came about] | [How to use it] |

---

### Patterns Noticed

**What's working:**
- [Pattern 1]
- [Pattern 2]

**What needs attention:**
- [Pattern 1]
- [Pattern 2]

---

### The Week Ahead

**Theme:** [Week's theme or focus]

**Top 3 Priorities:**
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

**Intentions:**
- [Intention 1]
- [Intention 2]

**Potential Obstacles:**
- [Obstacle 1] → [Mitigation]
- [Obstacle 2] → [Mitigation]

---

### Self-Care Check

[Reminder about sustainability, rest, and balance]

**This week, remember to:**
- [Self-care reminder 1]
- [Self-care reminder 2]

---

### Closing Reflection

[Thoughtful closing that acknowledges the journey and builds anticipation for the week ahead]

---

*Weekly review complete | Next review recommended: [date]*
```

## Interactive Mode

For interactive session:
1. Start with overall week feel
2. Review each goal with discussion
3. Celebrate wins together
4. Process challenges
5. Extract learnings
6. Plan week ahead
7. Set intentions
8. Close with encouragement

## Follow-up Actions
- Save comprehensive check-in to history
- Update all goal progress
- Save learnings to memory system
- Update any project statuses
- Flag any goals for adjustment
- Set up week's priorities
