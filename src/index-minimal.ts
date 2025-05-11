// Minimal, non-overengineered tool description for AI agents

const minimalToolDescription = `Flexible thinking tool for iterative problem-solving.

Use for complex problems requiring multiple thoughts, hypothesis tracking, or revision.

Core parameters:
- thought: your thinking step
- next_thought_needed: continue? (true/false)  
- thought_number: current position
- total_thoughts: estimate (adjustable)

Advanced features (optional):
- is_revision: revising previous thought
- revises_thought: which thought to revise
- branch_from_thought: start new reasoning path
- branch_id: branch identifier
- thought_type: "hypothesis" | "verification"
- related_to: array of thought numbers
- verification_result: "confirmed" | "refuted" | "partial" | "pending"

Use naturally. No rigid workflow. Parameters serve you, not vice versa.`;

export default minimalToolDescription;
