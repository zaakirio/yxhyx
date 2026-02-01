# Morning Check-In Workflow

## Metadata
- **Skill**: checkin
- **Workflow**: morning
- **Estimated Time**: 3-5 minutes
- **Model Complexity**: STANDARD

## Description
Morning planning check-in to set intentions, review goals, and plan the day ahead. Designed to be conversational and supportive.

## Purpose
- Set clear intentions for the day
- Connect daily activities to larger goals
- Identify potential obstacles and plan for them
- Start the day with clarity and purpose

## Context Required
- User's active goals (from identity.yaml)
- Active projects and their next actions
- Recent check-in history
- Current challenges
- Yesterday's accomplishments (if available)

## Steps

### 1. Greeting and Context Setting

```prompt
Good morning, {{user_name}}!

Let's plan your day together. Based on your current context:

Goals in Focus:
{{#each active_goals}}
- {{this.goal}} ({{this.progress}}% progress)
{{/each}}

Active Projects:
{{#each active_projects}}
- {{this.name}}: Next action: {{this.next_action}}
{{/each}}

{{#if yesterday_accomplishments}}
Yesterday you accomplished:
{{yesterday_accomplishments}}
{{/if}}

Generate a warm, personalized morning check-in that:
1. Acknowledges the user by name
2. References their goals and projects
3. Asks about their energy/mood
4. Helps them identify top priorities
5. Anticipates potential obstacles
6. Sets a positive, focused tone

Response Format (JSON):
{
  "greeting": "Personalized greeting",
  "context_summary": "Brief summary of where they are in their goals",
  "questions": [
    {
      "question": "Check-in question",
      "purpose": "Why we're asking this"
    }
  ],
  "suggestions": [
    {
      "suggestion": "Suggested focus area",
      "rationale": "Why this matters today"
    }
  ],
  "motivation": "Brief motivational note tied to their goals"
}
```

### 2. Priority Identification
Help user identify their top 1-3 priorities:
- What will move goals forward?
- What's urgent vs important?
- What will they regret not doing?

### 3. Obstacle Anticipation
Proactively identify potential challenges:
- What might get in the way?
- What can be done to mitigate?
- What support might be needed?

### 4. Intention Setting
Help user set clear intentions:
- What does success look like today?
- How will they feel at end of day?
- What mindset serves them best?

### 5. Capture and Save
Record the check-in for evening reference:
- Stated priorities
- Energy level
- Intentions
- Anticipated obstacles

## Output Format

```markdown
## Good Morning, {{user_name}}!

*[date]*

---

### Where You Are

[Brief context summary - where they stand with goals and projects]

---

### Let's Plan Your Day

**Questions for you:**

1. **How are you feeling this morning?**
   (Energy level, mood, readiness)

2. **What's the ONE thing that would make today successful?**
   (Your top priority)

3. **What might get in your way today?**
   (Obstacles to anticipate)

---

### Suggested Focus Areas

Based on your goals and projects:

1. **[Suggestion 1]**
   *Rationale: [Why this matters]*

2. **[Suggestion 2]**
   *Rationale: [Why this matters]*

---

### Set Your Intentions

Complete these statements:
- Today I will focus on: ___
- I will feel accomplished when: ___
- If I get stuck, I will: ___

---

### Motivation

[Personalized motivational note connected to their goals and values]

---

*Morning check-in | For evening reflection: 'checkin evening'*
```

## Interactive Mode

If running interactively, guide conversation:
1. Ask about energy/mood
2. Help identify top priority
3. Discuss any concerns
4. Set intentions together
5. End with encouragement

## Follow-up Actions
- Save check-in to history
- Update any goal progress mentioned
- Schedule evening check-in reminder (if enabled)
