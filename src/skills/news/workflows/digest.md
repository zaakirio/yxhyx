# News Digest Workflow

## Metadata
- **Skill**: news
- **Workflow**: digest
- **Estimated Time**: 20-30 seconds
- **Model Complexity**: STANDARD

## Description
Generate a personalized news digest based on user's interests, goals, and preferences. Prioritizes relevance and perspective diversity.

## When to Use
- Morning briefing
- Daily news catch-up
- General awareness of what's happening
- Staying informed on areas of interest

## Personalization Sources
1. **User Interests**: From identity.yaml high/medium priority interests
2. **Active Goals**: Current goals that news might relate to
3. **Projects**: Active projects that benefit from industry awareness
4. **Preferences**: News format and depth preferences

## Steps

### 1. Load User Context
Retrieve user's interests, goals, and preferences to personalize the digest.

### 2. Determine Focus Areas
Based on user context, identify:
- Primary topics of interest
- Goal-relevant categories
- Balance of categories for well-rounded awareness

### 3. Generate Digest

```prompt
Generate a personalized news digest based on the user's context.

{{#if user_context}}
User Context:
{{user_context}}
{{/if}}

Requirements:
1. **Relevance**: Prioritize news related to user's interests and goals
2. **Recency**: Focus on last 24-48 hours
3. **Diversity**: Include multiple perspectives on controversial topics
4. **Balance**: Mix of different categories based on interests
5. **Actionability**: Highlight news that might require action or decision

News Digest Structure:
- 8-10 news items
- Each item: headline, source, 1-2 sentence summary, relevance note
- Group by category or theme
- Flag goal-relevant items

Response Format (JSON):
{
  "generated_at": "ISO timestamp",
  "summary": "2-3 sentence overview of today's key themes",
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "headline": "News headline",
          "source": "Source name",
          "summary": "1-2 sentence summary",
          "relevance": "Why this matters to the user",
          "goal_relevant": true/false,
          "perspective": "neutral|progressive|conservative|industry|academic"
        }
      ]
    }
  ],
  "goal_highlights": [
    {
      "goal": "Goal name",
      "relevant_news": ["headline1", "headline2"]
    }
  ],
  "perspective_balance": {
    "sources_used": ["source1", "source2"],
    "perspectives_represented": ["perspective1", "perspective2"],
    "balance_note": "Note on perspective coverage"
  }
}

IMPORTANT:
- Do not make up news stories - only reference real, verifiable news
- If unsure about specific recent events, focus on ongoing trends and developments
- Clearly distinguish between hard news and analysis/opinion
```

### 4. Assess Perspective Diversity
Evaluate the digest for:
- Source diversity (wire services, major outlets, specialty publications)
- Perspective diversity (different viewpoints represented)
- Geographic diversity (not just one region)

### 5. Add Goal Relevance Tags
Flag items that relate to user's active goals or projects.

### 6. Format Output
Present in a scannable, prioritized format.

## Output Format

```markdown
## Your News Digest

*Generated: [timestamp]*

### Today's Overview
[2-3 sentence summary of key themes and developments]

---

### Top Stories for You

**[Category 1]**

1. **[Headline]** - *[Source]*
   [Summary]
   *Relevance: [Why this matters to you]*
   
2. **[Headline]** - *[Source]*
   [Summary]

**[Category 2]**

3. **[Headline]** - *[Source]*
   [Summary]

---

### Goal-Relevant Updates

**[Goal Name]**
- [Related headline 1]
- [Related headline 2]

---

### Perspective Tracker
Sources used: [list]
Perspectives represented: [list]
Balance note: [assessment]

---
*Personalized for your interests | For deeper coverage: 'news about [topic]'*
```

## Error Handling
- **No recent news**: Focus on ongoing trends and developments
- **Limited sources**: Acknowledge limitation, suggest checking specific sources
- **Controversial topic**: Present multiple perspectives fairly
