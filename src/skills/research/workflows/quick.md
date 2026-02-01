# Quick Research Workflow

## Metadata
- **Skill**: research
- **Workflow**: quick
- **Estimated Time**: 10-15 seconds
- **Model Complexity**: QUICK

## Description
Fast single-model research for simple questions. Use this when you need a quick answer without extensive exploration.

## When to Use
- Simple, straightforward queries
- Time-sensitive requests
- Just need a fast answer
- Quick fact checking

## Steps

### 1. Parse Query
Extract the core research topic from the user's request. Identify:
- The main subject
- Any specific aspects they're interested in
- Time constraints (recent vs historical)

### 2. Generate Optimized Search
Create a focused search query that will yield the best results:
- Use specific terminology
- Include relevant qualifiers
- Target authoritative sources

### 3. Execute Research
Use your knowledge to provide a comprehensive but concise answer.

```prompt
Research this topic and provide a brief, accurate summary:

Topic: {{query}}

Requirements:
- 2-3 paragraph comprehensive summary
- Focus on the most important and relevant facts
- Include 3-5 credible sources with URLs
- Prioritize recent information if relevant
- Note any uncertainties or caveats
- Be factual and objective

Response Format (JSON):
{
  "summary": "Clear, comprehensive summary of findings",
  "key_facts": ["fact 1", "fact 2", "fact 3"],
  "sources": [
    { "title": "Source Title", "url": "https://...", "snippet": "Brief description" }
  ],
  "confidence": 0.0-1.0,
  "caveats": ["Any important caveats or uncertainties"]
}

IMPORTANT: Only include URLs you are highly confident actually exist. Do not make up or guess URLs.
```

### 4. Verify Sources
Flag any sources that should be verified. Note which URLs are from well-known, reliable domains.

### 5. Format Output
Present results in a clear, readable format:
- Summary first
- Key facts as bullet points
- Sources with verification indicators
- Any caveats or next steps

## Error Handling
- **Timeout**: Return partial results with note about time constraint
- **No results**: Suggest alternative query or recommend standard research
- **Uncertain answer**: Clearly flag uncertainty and recommend deeper research

## Output Format

```markdown
## Quick Research: [Topic]

[Summary paragraph]

### Key Facts
- Fact 1
- Fact 2
- Fact 3

### Sources
- [Source Title](url) - Brief description
- [Source Title](url) - Brief description

### Confidence: High/Medium/Low

### Caveats
- Any important limitations or uncertainties

---
*Quick research mode - for deeper analysis, try 'deep research [topic]'*
```
