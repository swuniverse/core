# Token-efficient ticket implementation

## Models and availability

- Planner and final reviewer: `gpt-6.1-sol`, reasoning `high`.
- Coding agent for bounded work: `ticket-coder`, configured as `gpt-6-luna`
  with reasoning `high` in `.codex/agents/ticket-coder.toml`.
- The project model settings are defaults for clients that load this config;
  they do not switch an already running session or override managed settings.
- Before delegation, check the session's callable agent/model capabilities.
  Do not assume that a configured agent or model is available. If custom agents
  cannot be selected but explicit model selection is supported, delegate with
  `gpt-6-luna`, `high`, and the same coding instructions.
- If Luna is unavailable, implement with Sol in the current session when
  available. If the session cannot switch to Sol either, continue with its
  available model and briefly report the deviation. Do not repeatedly retry an
  unavailable model, silently substitute another delegated model, or stop solely
  to request a model switch.

## Route each ticket

Read the relevant ticket, its dependencies, existing implementation notes, and
the domain guidance before choosing a route. Check the current code: ticket
size and a `ready-for-agent` label alone do not establish implementation risk.

| Work | Route |
| --- | --- |
| Text changes, reuse of existing UI components, simple display changes | Luna; the ticket itself can serve as the handoff |
| Bounded API and UI changes with settled contracts and behavior | Sol supplies a short handoff, Luna implements, Sol reviews |
| Architecture, authorization or information disclosure, authentication, transactions, concurrent writes, migrations affecting data integrity, complex game rules | Sol plans and implements directly |
| Unclear requirements or unresolved cross-context contracts | Sol resolves the decisions before considering delegation |

For a mixed ticket, delegate a bounded part only if its contract is settled and
the handoff costs less than implementing it directly. Keep at most one coding
subagent active. The parent must not edit the same implementation concurrently.
No extra planning, exploration, or review agents by default.

## Keep the handoff short

Use the existing `.scratch/` ticket as the primary specification. Do not repeat
its full contents or pass an entire conversation when a focused handoff suffices.
Provide:

1. Ticket and relevant spec/domain/ADR paths, plus dependency state.
2. Exact scope and relevant current code paths or symbols.
3. Only decisions not already settled in the ticket, including invariants.
4. Required checks and the expected completion report.

Reuse existing acceptance criteria and established code patterns. Do not write a
second full plan for an already specified ticket. Preserve unrelated workspace
changes and follow the issue tracker's claim/status conventions where applicable.

## Verify and finish

### Separate implementation and verification (user decision, 2026-11-18)

By default, each implementation pass includes a short diff review and the smallest
relevant tests. Broad regression suites and full workspace builds are collected
for a separate verification pass across multiple tickets. Avoid running full
builds or broad suites after every ticket without a concrete reason.

Manual browser checks by the user are not required (user decision, 2026-11-20):
do not list them as remaining checks and do not wait for them. The only
remaining check after the immediate checks is the collected full verification
run.

Commit implemented work after the immediate checks. If required review or
verification remains, keep `Status: claimed` and add a comment saying
"umgesetzt, Prüfung ausstehend" with the commit hash or unique commit subject,
checks already run, and the exact
remaining checks. Check off only acceptance criteria supported by current
evidence. Do not mark the ticket `resolved` or record it as completed in the map
until the separate verification pass has satisfied the remaining requirements.
Dependent tickets remain blocked until then.

During the verification pass, review the actual diff against the acceptance
criteria and run the outstanding checks. Pay particular attention to permissions,
boundary conditions, and integration behavior; cover UI behavior with automated
tests instead of manual browser inspection.
Passing tests alone do not establish completion. Do not repeat successful checks
unless intervening changes or a concrete concern make their evidence stale.

The coding agent reports changed behavior, check outcomes, and remaining questions
without closing the ticket. The planner/reviewer closes it only after the
required verification is complete. Earlier completed tickets are not reopened
merely because the default workflow changed.

Request a focused correction for a local defect. If Luna needs unresolved design
decisions or a correction still fails to satisfy the same criterion, Sol takes
over instead of continuing a repeated delegation loop. Re-run checks affected by
corrections; do not duplicate already successful checks without a reason.

Only after review and required verification, mark the ticket `resolved`
according to `issue-tracker.md`, and append a concise comment
with implementation and verification evidence. Leave incomplete work open and
record the remaining blocker or criterion.

Record actual model usage, routing deviations, and material rework briefly in
the completion comment. Include token/usage figures only when the client exposes
them; never estimate or invent measured savings. Optimize usage per accepted
ticket, including planning, handoff, review, and retries.
