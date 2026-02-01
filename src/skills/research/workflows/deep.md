# Deep Research Workflow

## Metadata
- **Skill**: research
- **Workflow**: deep
- **Estimated Time**: 60-90 seconds
- **Model Complexity**: COMPLEX

## Description
Extensive, comprehensive research for complex topics requiring thorough analysis. Use this for important decisions, deep understanding, or when you need to explore all angles of a topic.

## When to Use
- Complex topics requiring thorough understanding
- Important decisions that need comprehensive information
- Academic or professional research
- Topics with many perspectives or controversies
- Need to understand historical context and future implications

## CRITICAL: URL Verification Protocol

**Every URL MUST be verified before inclusion.**
- Research models are known to hallucinate URLs
- A single broken link is a catastrophic failure for trust
- Prefer well-known, established domains
- When verification isn't possible, describe the source without linking

## Steps

### 1. Deep Query Analysis
Thoroughly analyze the research request:
- Identify the core question and all sub-questions
- Determine scope boundaries (what's in/out of scope)
- Identify stakeholders and their perspectives
- Note any constraints (time period, geography, domain)
- Consider related topics that might be relevant

### 2. Research Framework Design
Create a comprehensive research framework:
- Break topic into logical components
- Identify source categories needed (academic, news, primary, expert)
- Plan for multiple perspectives and viewpoints
- Consider historical context and future implications
- Design verification strategy for claims

### 3. Multi-Dimensional Research
Conduct research across multiple dimensions:

```prompt
Conduct comprehensive, deep research on this topic:

Topic: {{query}}

Research Dimensions:

1. **Foundational Understanding**
   - What is this topic fundamentally about?
   - What are the key concepts and terminology?
   - What's the historical context?

2. **Current State**
   - What is the current status/situation?
   - Who are the key players/stakeholders?
   - What are the main debates or controversies?

3. **Multiple Perspectives**
   - What do different groups think about this?
   - What are the strongest arguments on each side?
   - Where is there consensus? Where is there disagreement?

4. **Evidence and Data**
   - What data/evidence supports various positions?
   - What are the methodological considerations?
   - What gaps exist in current knowledge?

5. **Implications and Applications**
   - What are the practical implications?
   - Who is affected and how?
   - What decisions does this inform?

6. **Future Outlook**
   - What trends are emerging?
   - What might change in the future?
   - What should we watch for?

Requirements:
- Comprehensive 6-10 paragraph analysis
- Cover all dimensions thoroughly
- Include 10-15 high-quality sources
- Present balanced, nuanced perspectives
- Distinguish between facts, interpretations, and speculation
- Note confidence levels for different claims
- Identify knowledge gaps and uncertainties

Response Format (JSON):
{
  "executive_summary": "3-4 sentence high-level overview",
  "sections": [
    {
      "title": "Section Name",
      "content": "Detailed analysis",
      "confidence": "high|medium|low",
      "sources_used": ["source1", "source2"]
    }
  ],
  "perspectives": [
    {
      "stakeholder": "Group name",
      "position": "Their position",
      "reasoning": "Why they hold this view",
      "evidence": "Supporting evidence"
    }
  ],
  "key_findings": [
    {
      "finding": "Description",
      "confidence": "high|medium|low",
      "supporting_evidence": "What supports this"
    }
  ],
  "controversies": [
    {
      "topic": "Controversial aspect",
      "positions": ["Position A", "Position B"],
      "current_status": "Where the debate stands"
    }
  ],
  "sources": [
    {
      "title": "Source Title",
      "url": "https://...",
      "type": "academic|official|news|expert|primary",
      "credibility": "high|medium",
      "what_it_covers": "Brief description"
    }
  ],
  "knowledge_gaps": ["Gap 1", "Gap 2"],
  "future_research": ["Suggested follow-up research"],
  "confidence_assessment": {
    "overall": "high|medium|low",
    "reasoning": "Why this confidence level",
    "caveats": ["Important limitations"]
  }
}

CRITICAL URL GUIDANCE:
- Only include URLs from well-known, established sources
- Prefer: Wikipedia, major news outlets (NYT, BBC, Reuters), official government sites, established academic institutions, official documentation
- When in doubt, describe the source without providing a URL
- Better to have fewer verified URLs than many unverified ones
```

### 4. Cross-Reference and Validate
- Cross-check key claims across multiple sources
- Identify and resolve contradictions
- Assess source credibility and potential biases
- Note where consensus exists vs. where experts disagree

### 5. Synthesize into Narrative
Weave findings into a coherent, comprehensive narrative:
- Lead with most important findings
- Organize logically by theme or chronology
- Maintain balance and objectivity
- Connect dots between different aspects
- Draw clear, supported conclusions

### 6. Quality Assurance
Final checks before delivery:
- All major claims are supported by cited sources
- URLs are from known, reliable domains only
- Perspectives are fairly represented
- Confidence levels are appropriate
- Response fully addresses the original question
- Limitations and gaps are acknowledged

## Output Format

```markdown
## Deep Research: [Topic]

### Executive Summary
[3-4 sentences capturing the most important findings and conclusions]

---

### 1. Foundation & Context

#### Background
[Historical context and fundamental concepts]

#### Key Terminology
- **Term 1**: Definition
- **Term 2**: Definition

---

### 2. Current Landscape

#### State of Affairs
[Current situation, key players, recent developments]

#### Key Statistics & Data
- Statistic 1
- Statistic 2

---

### 3. Multiple Perspectives

#### Stakeholder Analysis

| Stakeholder | Position | Reasoning | Evidence Strength |
|-------------|----------|-----------|-------------------|
| Group A     | [View]   | [Why]     | Strong/Moderate/Weak |
| Group B     | [View]   | [Why]     | Strong/Moderate/Weak |

#### Areas of Consensus
- [Point of agreement 1]
- [Point of agreement 2]

#### Areas of Controversy
- [Debate 1]: [Description of the disagreement]
- [Debate 2]: [Description of the disagreement]

---

### 4. Key Findings

| Finding | Confidence | Evidence |
|---------|------------|----------|
| Finding 1 | High | [Supporting evidence] |
| Finding 2 | Medium | [Supporting evidence] |

---

### 5. Implications & Applications

#### Practical Implications
[Who is affected, how, and what decisions this informs]

#### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

---

### 6. Future Outlook

#### Emerging Trends
- [Trend 1]
- [Trend 2]

#### What to Watch
- [Indicator 1]
- [Indicator 2]

---

### Sources

#### Academic & Official
| Source | Type | Relevance |
|--------|------|-----------|
| [Title](url) | Academic | [What it covers] |

#### News & Analysis
| Source | Type | Relevance |
|--------|------|-----------|
| [Title](url) | News | [What it covers] |

---

### Research Assessment

**Overall Confidence**: [High/Medium/Low]

**Reasoning**: [Why this confidence level]

**Limitations**:
- [Limitation 1]
- [Limitation 2]

**Knowledge Gaps**:
- [Gap 1]
- [Gap 2]

**Suggested Follow-up Research**:
- [Topic for further investigation]

---
*Deep research mode - comprehensive analysis*
```

## Error Handling
- **Highly contested topic**: Clearly present all major positions without taking sides
- **Rapidly evolving topic**: Note recency of information, flag potential obsolescence
- **Limited reliable sources**: Acknowledge limitations, distinguish verified from speculative
- **Complex technical content**: Include accessible explanations alongside technical detail
- **Sensitive topic**: Maintain objectivity, note ethical considerations
