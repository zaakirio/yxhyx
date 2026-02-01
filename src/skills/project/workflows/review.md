# Project Review Workflow

## Metadata
- **Skill**: project
- **Workflow**: review
- **Estimated Time**: 20-30 seconds
- **Model Complexity**: QUICK

## Description
Review the status of active projects and suggest next steps. Helps maintain momentum and clarity on multiple projects.

## Purpose
- Quick status check on projects
- Identify blocked or stalled projects
- Suggest next actions
- Maintain project momentum

## Context Required
- Active projects from identity.yaml
- Recent work on projects (if available)
- Project goals and next actions

## Steps

### 1. Gather Project Status

```prompt
Review the user's active projects.

Projects:
{{#each projects}}
- **{{this.name}}**: {{this.description}}
  - Status: {{this.status}}
  - Next Action: {{this.next_action}}
  - Goal: {{this.goal_id}}
{{/each}}

Generate a project status review that:
1. Summarizes each project's current state
2. Identifies any blocked or stalled projects
3. Suggests next actions
4. Highlights priorities
5. Notes any projects that might need attention

Response Format (JSON):
{
  "overview": "Brief overview of project portfolio",
  "projects": [
    {
      "name": "Project name",
      "status_assessment": "On track|Needs attention|Blocked|Stalled",
      "current_state": "Where the project is",
      "suggested_next_action": "What to do next",
      "priority": "high|medium|low",
      "notes": "Any observations"
    }
  ],
  "recommendations": [
    {
      "recommendation": "What to do",
      "rationale": "Why"
    }
  ],
  "focus_suggestion": "Which project to focus on"
}
```

### 2. Prioritize

Suggest priority order based on:
- Goal alignment
- Urgency
- Momentum
- Dependencies

### 3. Identify Blockers

Flag any projects that are:
- Blocked (external dependency)
- Stalled (no recent progress)
- At risk (deadline concerns)

### 4. Suggest Actions

Clear, actionable next steps for each project.

## Output Format

```markdown
## Project Status Review

*[date]*

---

### Overview

[Brief summary of project portfolio health]

**Active Projects:** [count]
**On Track:** [count]
**Needs Attention:** [count]

---

### Project Status

{{#each projects}}

#### {{name}}

**Status:** {{status_assessment}}

**Current State:** {{current_state}}

**Next Action:** {{suggested_next_action}}

**Priority:** {{priority}}

{{#if notes}}
**Note:** {{notes}}
{{/if}}

---

{{/each}}

### Recommendations

1. **{{recommendation_1}}**
   *Rationale: {{rationale_1}}*

2. **{{recommendation_2}}**
   *Rationale: {{rationale_2}}*

---

### Suggested Focus

**Focus on:** {{focus_suggestion}}

*Why: [Brief rationale]*

---

### Quick Actions

- [ ] [Action 1]
- [ ] [Action 2]
- [ ] [Action 3]

---

*Project review complete | To plan a new project: 'project plan [idea]'*
```

## Error Handling
- **No active projects**: Suggest creating one or reviewing goals
- **All projects blocked**: Help identify unblocking steps
- **Too many projects**: Suggest prioritization or parking some
