# Topic News Workflow

## Metadata
- **Skill**: news
- **Workflow**: topic
- **Estimated Time**: 15-20 seconds
- **Model Complexity**: QUICK

## Description
News and updates focused on a specific topic. Provides deeper coverage of a single area of interest.

## When to Use
- Want detailed news on a specific topic
- Following a developing story
- Need updates on a particular industry or area
- Researching recent developments in a field

## Steps

### 1. Parse Topic
Extract the specific topic from the user's request:
- Identify main subject
- Note any time constraints (last week, this month)
- Understand desired depth

### 2. Gather Topic News

```prompt
Provide comprehensive news coverage on this specific topic:

Topic: {{query}}

Requirements:
1. Focus exclusively on this topic
2. Cover last 24-72 hours primarily, with context from past week if relevant
3. Include multiple sources and perspectives
4. Distinguish between news events and analysis
5. Note any developing stories or ongoing situations

Coverage Structure:
- Latest developments (most recent first)
- Context and background
- Different perspectives/reactions
- Implications and what to watch

Response Format (JSON):
{
  "topic": "Topic name",
  "as_of": "ISO timestamp",
  "executive_summary": "2-3 sentences on the current state",
  "developments": [
    {
      "headline": "What happened",
      "date": "When",
      "source": "Source name",
      "summary": "Details",
      "type": "breaking|update|analysis|opinion",
      "significance": "high|medium|low"
    }
  ],
  "context": "Background information needed to understand current news",
  "perspectives": [
    {
      "source_type": "Source category",
      "view": "Their perspective"
    }
  ],
  "watch_items": ["Things that might develop further"],
  "related_topics": ["Related areas to explore"]
}

IMPORTANT: Focus on verifiable news events. Clearly label opinion/analysis vs factual reporting.
```

### 3. Assess Coverage
Evaluate completeness:
- Are major developments covered?
- Are different perspectives represented?
- Is context sufficient?

### 4. Format Output

## Output Format

```markdown
## News: {{topic}}

*As of: [timestamp]*

### Latest Developments

**Summary**: [Executive summary]

---

#### Recent Updates

1. **[Headline]** - *[Source]* - [Date]
   [Summary]
   *Significance: [High/Medium/Low]*

2. **[Headline]** - *[Source]* - [Date]
   [Summary]

---

### Context & Background
[Background information needed to understand current developments]

---

### Perspectives

| Source Type | View |
|-------------|------|
| [Type 1]    | [Their take] |
| [Type 2]    | [Their take] |

---

### What to Watch
- [Developing aspect 1]
- [Developing aspect 2]

### Related Topics
- [Related topic 1]
- [Related topic 2]

---
*Topic-focused news | For general digest: 'news'*
```

## Error Handling
- **No recent news**: Provide most recent available information with date context
- **Niche topic**: Expand to broader related category if needed
- **Fast-moving story**: Note that situation may have evolved
