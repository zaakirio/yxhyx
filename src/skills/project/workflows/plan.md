# Project Planning Workflow

## Metadata
- **Skill**: project
- **Workflow**: plan
- **Estimated Time**: 3-5 minutes
- **Model Complexity**: STANDARD

## Description
Think through a project idea before starting implementation. Helps clarify scope, identify challenges, and create a roadmap.

## Purpose
- Clarify project vision and goals
- Identify technical requirements
- Anticipate challenges
- Create actionable roadmap
- Prevent scope creep

## Steps

### 1. Understand the Idea

```prompt
Help the user plan a project idea.

Project Idea: {{query}}

User Context:
{{#if user_context}}
{{user_context}}
{{/if}}

Guide them through project planning:
1. Clarify the core problem/opportunity
2. Define success criteria
3. Identify key features
4. Technical considerations
5. Potential challenges
6. MVP scope
7. Roadmap

Response Format (JSON):
{
  "understanding": {
    "problem": "What problem does this solve?",
    "target_user": "Who is this for?",
    "value_proposition": "Why would they use it?"
  },
  "clarifying_questions": [
    "Question to better understand the idea"
  ],
  "initial_assessment": {
    "feasibility": "high|medium|low",
    "complexity": "simple|moderate|complex",
    "time_estimate": "Rough time estimate"
  }
}
```

### 2. Define Success

```prompt
Based on the project idea: {{project_idea}}

Help define what success looks like:
1. Primary success metric
2. Secondary metrics
3. Definition of "done" for MVP
4. Definition of "done" for full version

Response Format (JSON):
{
  "success_criteria": {
    "primary_metric": "Main measure of success",
    "secondary_metrics": ["Metric 1", "Metric 2"],
    "mvp_done": "When MVP is complete",
    "full_done": "When full version is complete"
  },
  "anti_goals": ["What this project is NOT trying to do"]
}
```

### 3. Feature Mapping

```prompt
For project: {{project_idea}}

Map out features:
1. Must-have (MVP)
2. Should-have (v1.0)
3. Nice-to-have (future)
4. Out of scope

Response Format (JSON):
{
  "features": {
    "must_have": ["Feature 1", "Feature 2"],
    "should_have": ["Feature 3", "Feature 4"],
    "nice_to_have": ["Feature 5"],
    "out_of_scope": ["Feature 6"]
  }
}
```

### 4. Technical Planning

```prompt
Technical planning for: {{project_idea}}

Consider:
1. Technology choices
2. Architecture approach
3. Third-party services needed
4. Data storage needs
5. Key technical decisions

Response Format (JSON):
{
  "technical": {
    "recommended_stack": {
      "language": "Recommendation",
      "framework": "Recommendation",
      "database": "If needed",
      "services": ["Service 1"]
    },
    "architecture": "Simple description",
    "key_decisions": [
      {
        "decision": "What needs to be decided",
        "options": ["Option A", "Option B"],
        "recommendation": "Recommended option",
        "rationale": "Why"
      }
    ]
  }
}
```

### 5. Challenge Identification

Anticipate potential challenges:
- Technical challenges
- Resource constraints
- Dependencies
- Unknowns

### 6. Create Roadmap

Phased approach:
- Phase 1: Foundation
- Phase 2: MVP
- Phase 3: Polish
- Phase 4: Launch

## Output Format

```markdown
## Project Plan: {{project_name}}

*Planning session: [date]*

---

### The Idea

**Problem:** [What problem does this solve?]

**For:** [Who is this for?]

**Value:** [Why would they use it?]

---

### Success Criteria

**Primary Metric:** [Main measure of success]

**MVP is done when:** [Definition]

**v1.0 is done when:** [Definition]

**This project is NOT:** [Anti-goals]

---

### Feature Map

| Priority | Feature | Notes |
|----------|---------|-------|
| Must-have | Feature 1 | ... |
| Must-have | Feature 2 | ... |
| Should-have | Feature 3 | ... |
| Nice-to-have | Feature 4 | ... |

**Out of Scope:**
- [Thing 1]
- [Thing 2]

---

### Technical Approach

**Recommended Stack:**
- Language: [recommendation]
- Framework: [recommendation]
- Database: [if needed]
- Services: [list]

**Architecture:** [Simple description]

**Key Decisions:**

| Decision | Options | Recommendation |
|----------|---------|----------------|
| [Decision 1] | A, B | A - [rationale] |

---

### Anticipated Challenges

| Challenge | Mitigation |
|-----------|------------|
| [Challenge 1] | [How to handle] |
| [Challenge 2] | [How to handle] |

---

### Roadmap

**Phase 1: Foundation** (Est: [time])
- [ ] [Task 1]
- [ ] [Task 2]

**Phase 2: MVP** (Est: [time])
- [ ] [Task 1]
- [ ] [Task 2]

**Phase 3: Polish** (Est: [time])
- [ ] [Task 1]

**Phase 4: Launch** (Est: [time])
- [ ] [Task 1]

---

### Next Steps

1. [Immediate next action]
2. [Second action]
3. [Third action]

---

*Ready to start? 'create project {{project_name}}'*
```

## Interactive Mode

Guide conversation through:
1. Understanding the idea
2. Defining success
3. Mapping features
4. Technical planning
5. Identifying challenges
6. Creating roadmap

## Follow-up Actions
- Save plan for reference
- Optionally add as project to identity
- Generate create workflow inputs
