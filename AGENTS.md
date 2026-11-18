## Agent skills

### Issue tracker

Issues and specs are local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

Use `docs/agents/ticket-workflow.md` for ticket implementation and separate verification passes.

### Triage labels

Uses the canonical five triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Uses a multi-context layout. See `docs/agents/domain.md`.

### Ticket implementation

Use GPT-6.1 Sol with high reasoning for ticket planning and review. Delegate
well-scoped implementation to the `ticket-coder` agent (GPT-6 Luna, high)
when available; Sol implements complex or sensitive tickets directly.
Follow `docs/agents/ticket-workflow.md` for routing, handoff, verification,
and model-availability fallback. This explicitly authorizes coding delegation
during ticket work; use at most one coding subagent at a time.
