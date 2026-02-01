# Technology News Workflow

## Metadata
- **Skill**: news
- **Workflow**: tech
- **Estimated Time**: 20-25 seconds
- **Model Complexity**: STANDARD

## Description
Technology and AI focused news digest. Covers software, AI/ML, startups, big tech, and industry trends.

## When to Use
- Want focused technology news
- Following AI/ML developments
- Tracking industry trends
- Staying current with tech landscape

## Coverage Categories
1. **AI & Machine Learning**: New models, research breakthroughs, applications
2. **Big Tech**: Google, Apple, Microsoft, Amazon, Meta moves
3. **Startups & Funding**: Notable raises, launches, pivots
4. **Open Source**: Major releases, community developments
5. **Industry Trends**: Emerging patterns, market shifts
6. **Developer Tools**: New tools, frameworks, languages

## Steps

### 1. Gather Tech News

```prompt
Generate a comprehensive technology news digest:

Topic Focus: Technology, AI, Software, Startups

Categories to Cover:
1. AI & Machine Learning
2. Big Tech (FAANG+)
3. Startups & Funding
4. Open Source
5. Developer Tools & Platforms
6. Industry Trends

Requirements:
- Focus on last 24-48 hours
- Prioritize impactful developments
- Include both breaking news and trend analysis
- Cover implications for developers and tech professionals
- Note practical implications

Response Format (JSON):
{
  "generated_at": "ISO timestamp",
  "top_story": {
    "headline": "Most significant story",
    "source": "Source",
    "summary": "Why this matters",
    "implications": "What this means for the industry"
  },
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "headline": "Story",
          "source": "Source",
          "summary": "Brief",
          "type": "news|release|funding|research|opinion",
          "impact": "high|medium|low",
          "tags": ["relevant", "tags"]
        }
      ]
    }
  ],
  "trending_topics": ["topic1", "topic2"],
  "watch_list": [
    {
      "topic": "Something to watch",
      "why": "Why it matters"
    }
  ]
}

IMPORTANT: Focus on verified news. Do not speculate or make up stories. If uncertain about specific details, note the uncertainty.
```

### 2. Prioritize by Impact
Order stories by:
- Industry significance
- Developer relevance
- Timeliness

### 3. Add Context
Ensure technical news has appropriate context for understanding.

### 4. Format Output

## Output Format

```markdown
## Tech News Digest

*[timestamp]*

---

### Top Story

**[Headline]** - *[Source]*

[Summary - why this is the top story]

**Implications**: [What this means for the industry]

---

### AI & Machine Learning

1. **[Headline]** - *[Source]*
   [Summary]
   *Impact: High | Tags: #ai #ml*

2. **[Headline]** - *[Source]*
   [Summary]

---

### Big Tech Moves

1. **[Headline]** - *[Source]*
   [Summary]

---

### Startups & Funding

1. **[Company]** raised $X for [purpose] - *[Source]*
   [Brief on what they do and why this matters]

---

### Open Source & Tools

1. **[Project/Tool]** - [What's new]
   [Summary and developer implications]

---

### Industry Trends

**Trending Topics**: [topic1], [topic2], [topic3]

**What to Watch**:
- [Topic]: [Why it matters]
- [Topic]: [Why it matters]

---

### Quick Links
- [Essential read 1]
- [Essential read 2]

---
*Tech news focus | For full digest: 'news' | For deep dive: 'research [topic]'*
```

## Error Handling
- **No major news**: Cover ongoing trends and developments
- **Highly technical topic**: Include accessible explanation
- **Rumor vs confirmed**: Clearly distinguish speculation from confirmed news
