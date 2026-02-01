# Standard Research Workflow

## Metadata
- **Skill**: research
- **Workflow**: standard
- **Estimated Time**: 15-30 seconds
- **Model Complexity**: STANDARD

## Description
Standard multi-perspective research combining depth with breadth. This is the default research mode that balances thoroughness with speed.

## When to Use
- Default mode for most research requests
- Need multiple perspectives on a topic
- Want reliable, verified information
- Need a solid understanding without extensive time investment

## CRITICAL: URL Verification

**All URLs must be verified before delivery.**
- Research models frequently hallucinate URLs
- A single broken link undermines trust in the entire response
- Only include URLs from well-known, authoritative domains
- When in doubt, omit the URL but keep the source description

## Steps

### 1. Analyze Request
Parse the user's query to understand:
- Core topic and subtopics
- Desired depth and focus areas
- Any specific perspectives needed
- Time sensitivity (recent vs evergreen content)

### 2. Design Research Strategy
Plan the research approach:
- Identify key aspects to cover
- Determine authoritative source types
- Balance depth vs breadth

### 3. Gather Information
Compile information from multiple angles:

```prompt
Conduct thorough research on this topic:

Topic: {{query}}

Research Approach:
1. **Core Understanding**: What is this topic fundamentally about?
2. **Key Details**: What are the most important facts and nuances?
3. **Multiple Perspectives**: What different viewpoints exist?
4. **Practical Implications**: What does this mean in practice?
5. **Recent Developments**: What's new or changing?

Requirements:
- Comprehensive 3-5 paragraph analysis
- Cover multiple angles and perspectives
- Include 5-8 credible sources
- Note areas of consensus and controversy
- Highlight practical implications
- Be objective and balanced

Response Format (JSON):
{
  "summary": "Executive summary (2-3 sentences)",
  "analysis": "Detailed multi-paragraph analysis",
  "perspectives": [
    { "viewpoint": "Perspective name", "position": "Description of this view" }
  ],
  "key_insights": ["Insight 1", "Insight 2", "Insight 3"],
  "sources": [
    { "title": "Source Title", "url": "https://...", "type": "academic|news|official|blog", "snippet": "What this source covers" }
  ],
  "confidence": 0.0-1.0,
  "gaps": ["Areas that need more research"],
  "recommendations": ["Suggested next steps or related topics"]
}

CRITICAL: Only include URLs you are highly confident exist. Prefer well-known domains (Wikipedia, major news sites, official documentation, etc.).
```

### 4. Synthesize Findings
Combine information into a coherent narrative:
- Identify themes and patterns
- Resolve contradictions where possible
- Highlight areas of agreement and disagreement
- Draw actionable conclusions

### 5. Quality Check
Before delivering:
- Verify key claims are supported
- Check URL domains are legitimate and well-known
- Ensure balanced perspective representation
- Confirm response addresses the original query

### 6. Format Output
Present findings in a structured, readable format.

## Output Format

```markdown
## Research: [Topic]

### Summary
[Executive summary - 2-3 sentences capturing the key takeaway]

### Analysis

[Detailed analysis organized by theme or aspect]

#### [Subtopic 1]
[Analysis paragraph]

#### [Subtopic 2]
[Analysis paragraph]

### Key Insights
1. [Most important insight]
2. [Second insight]
3. [Third insight]

### Perspectives
| Viewpoint | Position |
|-----------|----------|
| [View 1]  | [Description] |
| [View 2]  | [Description] |

### Sources
| Source | Type | Summary |
|--------|------|---------|
| [Title](url) | Academic | Brief description |
| [Title](url) | News | Brief description |

### Confidence Level
[High/Medium/Low] - [Brief explanation]

### Research Gaps
- [Areas that could use more investigation]

### Suggested Next Steps
- [Related topics or deeper dives to consider]

---
*Standard research mode | For deeper analysis: 'deep research [topic]'*
```

## Error Handling
- **Conflicting information**: Present both sides, note the conflict
- **Limited sources**: Acknowledge limitations, suggest alternative angles
- **Technical topic**: Include explanatory context for accessibility
- **Outdated information**: Flag recency concerns, note when information might be stale
