# Evening Check-In Workflow

## Metadata
- **Skill**: checkin
- **Workflow**: evening
- **Estimated Time**: 3-5 minutes
- **Model Complexity**: STANDARD

## Description
Evening reflection check-in to review the day, celebrate wins, capture learnings, and prepare for tomorrow.

## Purpose
- Reflect on accomplishments and progress
- Capture lessons and insights
- Process any challenges or setbacks
- Set up for a restful evening
- Prepare context for tomorrow

## Context Required
- Morning check-in data (priorities, intentions)
- User's active goals
- Current projects
- Recent learnings

## Steps

### 1. Day Review

```prompt
Good evening, {{user_name}}!

Let's reflect on your day together. Based on your context:

This Morning's Priorities:
{{#if morning_priorities}}
{{morning_priorities}}
{{else}}
(No morning check-in recorded)
{{/if}}

Goals You're Working Toward:
{{#each active_goals}}
- {{this.goal}}
{{/each}}

Generate a warm evening check-in that:
1. Acknowledges the day is ending
2. References morning intentions if available
3. Invites honest reflection
4. Celebrates any wins (big or small)
5. Helps process challenges
6. Captures learnings
7. Looks ahead to tomorrow

Response Format (JSON):
{
  "greeting": "Warm evening greeting",
  "reflection_prompts": [
    {
      "question": "Reflection question",
      "purpose": "What this helps with"
    }
  ],
  "celebration_prompt": "Prompt to identify wins",
  "learning_prompt": "Prompt to capture insights",
  "tomorrow_prep": "Question about tomorrow",
  "closing": "Supportive closing message"
}
```

### 2. Wins Celebration
Help user recognize accomplishments:
- What got done?
- What went well?
- What should be celebrated?
- Progress toward goals

### 3. Challenge Processing
Support processing of difficulties:
- What was challenging?
- What can be learned?
- What needs to be let go?
- What needs to carry forward?

### 4. Learning Capture
Extract insights for memory system:
- What worked that should be repeated?
- What didn't work to avoid?
- Any new insights or realizations?

### 5. Tomorrow Prep
Light preparation for next day:
- Any carryover priorities?
- Anything to prepare tonight?
- Initial thoughts on tomorrow's focus?

### 6. Closing
End on positive, restful note:
- Acknowledge the day
- Encourage rest
- Build anticipation for tomorrow

## Output Format

```markdown
## Good Evening, {{user_name}}!

*[date]*

---

### Let's Reflect on Your Day

{{#if morning_priorities}}
**This morning you intended to:**
{{morning_priorities}}
{{/if}}

---

### Reflection Questions

1. **What did you accomplish today?**
   (Big or small - everything counts)

2. **What went well that you want to repeat?**
   (Capture what worked)

3. **What was challenging?**
   (No judgment - just noticing)

4. **What did you learn today?**
   (Insights to carry forward)

---

### Celebrate Your Wins

Take a moment to acknowledge what you did today:

- [Win 1 - inferred or space for user]
- [Win 2]
- [Win 3]

*Every step forward matters.*

---

### Capture Your Learnings

**What worked:**
- [Space for learnings]

**What to adjust:**
- [Space for improvements]

---

### Looking Ahead

**For tomorrow, consider:**
- [Carryover priority]
- [Suggested focus]

**Anything to prepare tonight?**
- [Preparation suggestion]

---

### Closing Thoughts

[Warm, supportive closing message]

[Encouragement for rest and renewal]

---

*Evening reflection complete | For weekly review: 'checkin weekly'*
```

## Interactive Mode

If running interactively:
1. Ask about accomplishments
2. Celebrate wins together
3. Process any challenges
4. Extract learnings
5. Light prep for tomorrow
6. Supportive close

## Follow-up Actions
- Save check-in to history
- Update goal progress from accomplishments
- Save learnings to memory system
- Note any carryover items for tomorrow
