# Balanced Tool Description for Modern AI

## Core Purpose
Dynamic thinking tool that mirrors how AI naturally processes problems.

## When to Use
- Complex problems requiring iterative thinking
- Situations where hypotheses need tracking
- Analysis that benefits from revision

## Essential Parameters
```
thought: "your thinking step"
next_thought_needed: true/false
thought_number: 1
total_thoughts: estimate
```

## Advanced Features (Use When Needed)
```
// Revision
is_revision: true
revises_thought: 2

// Branching
branch_from_thought: 5
branch_id: "alternative"

// Hypothesis Tracking
thought_type: "hypothesis"
related_to: [3, 5]
verification_result: "confirmed"
```

## Key Principles

1. **Flow State**: Use the tool as thoughts naturally emerge
2. **Flexible Structure**: Adjust total_thoughts as understanding evolves
3. **Hypothesis Recognition**: Mark hypotheses when they arise naturally
4. **Verification Links**: Connect verifications when relevant

## Guiding Logic

### For Agentic AI
- Trust your natural thinking process
- Use parameters as enhancement, not constraint
- Branch when it feels right, not when prescribed

### For Deterministic Systems
- Parameters provide structure when needed
- Workflow emerges from use, not rules
- Tracking serves analysis, not compliance

## Minimal Protocol

1. Start with an estimate
2. Think step by step
3. Revise when insight strikes
4. Branch for alternatives
5. Track hypotheses naturally
6. Stop when satisfied

## Anti-Patterns to Avoid

❌ Following rigid workflows  
❌ Forcing hypothesis generation  
❌ Over-structuring thoughts  
❌ Planning extensively upfront  
❌ Treating rules as requirements  

## The Tool's Philosophy

This tool adapts to how YOU think, not vice versa. Use parameters as aids, not scripts. Let your natural reasoning process dictate the flow.

## For Different AI Types

**Language Models**: Use for complex reasoning tasks  
**Autonomous Agents**: Leverage for decision tracking  
**Hybrid Systems**: Apply parameters as needed  
**Deterministic Algorithms**: Structure when helpful  

## Bottom Line

Less protocol, more enablement. The tool provides capabilities; you provide the intelligence.
