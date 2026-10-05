# Allianz – Etappe 2: Diplomatie-Kern

Status: ready-for-agent

## Problem Statement

Nach Etappe 1 können Spieler Allianzen gründen, ihnen beitreten und sie verwalten. Allianzen können jedoch noch keine diplomatischen Beziehungen eingehen. Präsidenten und Diplomaten können weder Krieg erklären noch Abkommen anbieten oder beantworten; aktive Beziehungen, ausstehende Vorschläge und Vertragswerke sind weder auf Allianzseiten noch in einer eigenen Verwaltung sichtbar. Damit fehlen der fachliche Kern der STU-Allianzdiplomatie und eine belastbare Grundlage für spätere Auswirkungen auf Kampf, Sternenkarte, Scans, Transfers und Zugänge.

Die STU-Vorlage kann nicht unverändert übernommen werden: SWU kennt zwei grundsätzlich verfeindete Fraktionen, feste Ämter und strengere Sicherheits- und Konsistenzanforderungen. Diplomatie muss daher innerhalb einer Fraktion funktionieren, vollständig serverseitig autorisiert sein und auch bei konkurrierenden Aktionen einen eindeutigen Zustand bewahren.

## Solution

SWU erhält einen Diplomatiebereich für Allianzen derselben Fraktion. Präsident und Diplomat können Krieg erklären, Abkommen vorschlagen, eingehende Vorschläge annehmen oder ablehnen, eigene Vorschläge zurückziehen und aktive Nicht-Kriegsbeziehungen beenden. Unterstützt werden Krieg, Frieden, Freundschaft, Bündnis, Handelsabkommen und Vasallenschaft.

Je zwei Allianzen gibt es höchstens eine aktive **Beziehung** und höchstens einen ausstehenden **Beziehungsvorschlag**. Krieg tritt sofort in Kraft und beendet alle anderen Zustände dieses Paars; er endet nur durch die Annahme eines Friedensvorschlags. Bei anderen Typwechseln bleibt die aktuelle Beziehung bis zur Annahme des neuen Vorschlags wirksam.

Zusätzliche **Beziehungsfreigaben** werden ausdrücklich ausgehandelt: „Als Freund behandeln“ und, nur beim Bündnis, „Live-Kartenpositionen teilen“. Diese Etappe speichert und zeigt die Freigaben, aktiviert aber noch keine spielsystemübergreifenden Auswirkungen. Änderungen einer aktiven Beziehung – Typ, Freigaben oder **Vertragswerk** – benötigen die Zustimmung der anderen Allianz.

Öffentliche Allianzseiten zeigen aktive Beziehungen und deren Vertragswerk. Eine nur für Präsident und Diplomat zugängliche Verwaltung zeigt zusätzlich Vorschläge und zulässige Aktionen. Eine öffentliche **Diplomatie-Chronik** hält abgeschlossene diplomatische Ereignisse unveränderlich fest. Systemnachrichten informieren die jeweils andere Allianz nach erfolgreicher Zustandsänderung.

## User Stories

1. As an alliance member, I want to see my alliance’s active relationships, so that I understand its current diplomatic position.
2. As any authenticated player, I want to see the active relationships of an alliance, so that diplomacy is publicly understandable.
3. As any authenticated player, I want to open the public contractual text of an active relationship, so that I can understand what the participating alliances agreed.
4. As any authenticated player, I want pending proposals and draft contractual text to remain hidden, so that unfinished negotiations are confidential.
5. As an alliance president, I want to open the diplomacy management area, so that I can act on behalf of my alliance.
6. As an alliance diplomat, I want to open the diplomacy management area, so that I can perform my office’s purpose.
7. As an alliance vice, I want no diplomacy powers merely because I am vice, so that internal administration and diplomacy remain separate responsibilities.
8. As an ordinary alliance member, I want no diplomacy management powers, so that only authorized offices can bind the alliance.
9. As an alliance-less player, I want no alliance diplomacy management powers, so that I cannot represent an alliance.
10. As a president or diplomat, I want the server to return my permitted diplomacy actions, so that the interface does not infer authorization independently.
11. As a president or diplomat, I want to select another alliance of the same faction as a counterparty, so that diplomacy follows SWU’s faction rules.
12. As a president or diplomat, I want alliances of the opposing faction to be unavailable as diplomatic counterparties, so that permanent cross-faction hostility is not represented by negotiable records.
13. As a president or diplomat, I want to be prevented from targeting my own alliance, so that a relationship always has two distinct parties.
14. As a president or diplomat, I want to declare war on another alliance of my faction, so that war becomes active immediately without its consent.
15. As a member of the target alliance, I want to receive a system message when war is declared, so that my alliance learns of the new state.
16. As a player, I want a war declaration to replace every active relationship and pending proposal between the two alliances, so that the pair cannot be simultaneously at war and negotiating an older state.
17. As a player, I want a war declaration to discard any pending change to permissions or contractual text for the pair, so that stale negotiations cannot survive the war.
18. As a president or diplomat in a warring alliance, I want to propose peace, so that the war can be ended by mutual agreement.
19. As a president or diplomat, I want to be unable to offer peace when no war is active, so that peace remains a transition out of war rather than a generic initial offer.
20. As a player, I want at most one pending peace proposal for a war, so that duplicate offers cannot create ambiguous outcomes.
21. As a president or diplomat receiving a peace proposal, I want to accept it, so that the war is atomically replaced by active peace.
22. As a president or diplomat receiving a peace proposal, I want to decline it, so that war remains active and only the proposal disappears.
23. As a president or diplomat who sent a peace proposal, I want to withdraw it, so that war remains active and the proposal disappears.
24. As a player, I want active peace to remain publicly visible, so that the end of the war is represented explicitly.
25. As a player, I want peace to grant no friendship or map-sharing permission by itself, so that relationship names do not silently imply gameplay effects.
26. As a president or diplomat, I want to propose friendship to another same-faction alliance, so that it can decide whether to enter that relationship.
27. As a president or diplomat, I want to propose an alliance to another same-faction alliance, so that a closer relationship can be negotiated.
28. As a president or diplomat, I want to propose a trade agreement to another same-faction alliance, so that the agreement exists independently of its later gameplay integrations.
29. As a president or diplomat, I want to propose vassalage to another same-faction alliance, so that directional subordination can be represented.
30. As a president or diplomat receiving a non-war proposal, I want to accept it, so that it becomes the sole active relationship for the pair.
31. As a president or diplomat receiving a non-war proposal, I want to decline it, so that the current active relationship remains unchanged.
32. As a president or diplomat who sent a non-war proposal, I want to withdraw it, so that the current active relationship remains unchanged.
33. As a player, I want at most one pending relationship proposal per alliance pair, so that simultaneous contradictory negotiations cannot exist.
34. As a player, I want at most one active relationship per alliance pair, so that every pair has one unambiguous diplomatic state.
35. As a player, I want accepting a type-change proposal to atomically replace the prior active relationship, so that no intermediate duplicate or empty state is observable.
36. As a player, I want the prior active relationship to remain visible and effective while a type change is pending, so that a proposal does not change the state before acceptance.
37. As a player, I want vassalage to show the proposing alliance as lord and the receiving alliance as vassal, so that its direction is preserved.
38. As a player, I want all other relationship types to be presented as mutual, so that storage direction does not leak into their meaning.
39. As either party to an active non-war relationship, I want its president or diplomat to end it, so that an alliance is not trapped in a consensual agreement.
40. As a president or diplomat, I want to be unable to end war directly, so that war ends only through accepted peace.
41. As a president or diplomat, I want to include “treat as friend” in eligible proposals, so that friendship behavior can later be activated explicitly.
42. As a president or diplomat, I want “treat as friend” to be available for trade agreements, friendship, alliances and vassalage, so that the permission is negotiated independently from the relationship label.
43. As a president or diplomat, I want “treat as friend” to be unavailable for war and peace, so that those relationship types cannot carry a contradictory permission.
44. As a president or diplomat, I want live-position sharing to be available only for an alliance relationship, so that its later map effect has the agreed boundary.
45. As a president or diplomat, I want to propose a different set of permissions for an active relationship, so that permissions can evolve without immediately changing.
46. As a president or diplomat receiving a permission change, I want to accept or decline it, so that no permission changes unilaterally.
47. As a president or diplomat who offered a permission change, I want to withdraw it, so that the active permissions remain unchanged.
48. As a player, I want the previous permissions to remain active while a change is pending, so that negotiations have no premature effect.
49. As a player, I want at most one pending permission change per active relationship, so that its target state is unambiguous.
50. As a president or diplomat, I want unchanged permission proposals to be rejected, so that no meaningless pending change is created.
51. As a player, I want permission changes to be deleted when their relationship ends or war is declared, so that no orphaned permission state survives.
52. As a president or diplomat, I want to include a contractual text of up to 20,000 Unicode characters in a non-war proposal, so that the agreement can document its terms.
53. As a president or diplomat, I want contractual text to be trimmed and safely rendered with the existing safe BBCode support, so that formatting is useful without permitting unsafe HTML.
54. As a president or diplomat, I want an empty contractual text to be valid, so that an agreement does not require prose.
55. As a president or diplomat, I want an oversized contractual text to be rejected without changing any relationship state, so that validation is atomic.
56. As a player, I want war to have no contractual text, so that war is not represented as a negotiated contract.
57. As a president or diplomat, I want to include contractual text in a peace proposal, so that the terms of peace can be negotiated.
58. As a president or diplomat, I want changes to an active contractual text to require a proposal and acceptance, so that neither party can rewrite a public agreement alone.
59. As a player, I want the old public contractual text to remain visible while a replacement is pending, so that the accepted text remains authoritative.
60. As a president or diplomat of either participating alliance, I want to see the pending replacement text, so that my alliance can evaluate it.
61. As an unrelated player or alliance member, I want no access to pending contractual text even when I know an identifier, so that authorization cannot be bypassed by a direct request.
62. As a president or diplomat, I want a proposal response to fail when my alliance is not the recipient, so that only the correct party can accept or decline.
63. As a president or diplomat, I want withdrawal to fail when my alliance is not the sender, so that the receiving party cannot impersonate the proposer.
64. As a player, I want stale actions against already accepted, rejected, withdrawn or replaced proposals to fail as domain errors, so that retries do not corrupt state.
65. As a player, I want simultaneous responses to the same proposal to yield exactly one successful outcome, so that the relationship remains deterministic.
66. As a player, I want simultaneous proposals for the same alliance pair to preserve the one-pending invariant, so that database races cannot bypass domain checks.
67. As a player, I want simultaneous war and acceptance actions to resolve to one valid serialized state, so that no active pre-war agreement survives a committed war.
68. As a player, I want active relationships to show type, counterparty, direction where applicable, start time, active permissions and whether contractual text exists, so that the public state is understandable.
69. As a president or diplomat, I want the diplomacy administration to distinguish sent and received proposals, so that I know which actions are available.
70. As a president or diplomat, I want the administration to show the current active relationship beside a pending replacement, so that I understand what remains in force.
71. As a president or diplomat, I want the administration to identify a pending permission or contractual-text change and its proposer, so that my alliance can respond correctly.
72. As an unauthorized member, I want the server to refuse every diplomacy mutation even if I send the request directly, so that hidden buttons are not the security boundary.
73. As an authenticated player, I want public diplomacy reads to work without alliance membership, so that active diplomatic state is genuinely public.
74. As a member of an affected alliance, I want system messages for incoming proposals, accepted proposals, declined proposals, withdrawn proposals, ended agreements and permission or contractual changes, so that the alliance is informed.
75. As a player, I want system messages to be sent only after the diplomatic transaction commits, so that no message announces a state that was rolled back.
76. As a player, I want a failed message delivery not to roll back an already committed diplomatic change, so that messaging and domain state cannot diverge through rollback.
77. As a player, I want failed post-commit notifications to be retryable without repeating the diplomatic mutation, so that delivery can recover safely.
78. As any authenticated player, I want to browse an alliance’s public Diplomatie-Chronik newest first with pagination, so that completed diplomatic events remain traceable.
79. As a player, I want war declarations, accepted agreements, accepted type changes and ended active relationships in the Diplomatie-Chronik, so that it reflects completed public events.
80. As a player, I want pending, rejected and withdrawn proposals omitted from the public Diplomatie-Chronik, so that confidential or unrealized negotiations are not published.
81. As a player, I want each Diplomatie-Chronik entry to retain event type, actor, involved alliances, names at the event time, timestamp and small required metadata, so that it remains intelligible after later renames or dissolution.
82. As a player, I want contractual bodies and alliance descriptions omitted from chronicle snapshots, so that the chronicle does not duplicate mutable or sensitive content.
83. As a player, I want Diplomatie-Chronik entries to be immutable and not individually deletable, so that public diplomatic history cannot be rewritten.
84. As an alliance administrator, I want `$ALLIANCE_DIPLOMATIC_RELATIONS` to render the alliance’s active relationships safely in its description, so that the existing STU-compatible placeholder has useful output.
85. As a player, I want the placeholder to ignore pending proposals and confidential drafts, so that public descriptions cannot leak negotiations.
86. As a player, I want diplomacy schema changes to be deployable before the feature is enabled, so that rollout remains backward-compatible.
87. As a player, I want stored relationship permissions to have no combat, map, transfer, scan or access effect in this stage, so that partial cross-system behavior is not exposed.
88. As a developer, I want later gameplay systems to consume a stable relationship model rather than reconstruct diplomacy from UI data, so that the next stage can add effects without changing the core invariants.

## Implementation Decisions

- The Diplomatie-Kern extends the existing alliance domain rather than creating a second independent diplomacy subsystem. The alliance service remains the high-level domain boundary; persistence stays behind a port with equivalent TypeORM and in-memory implementations.
- The schema represents a party explicitly so that a later stage can add allianzlose Spieler without replacing the relationship model. This stage exposes and permits only Allianz-to-Allianz relationships. A party reference has exactly one subject and can never identify an alliance and a player simultaneously.
- An alliance pair is canonicalized independently of proposal direction. Database constraints enforce at most one active relationship and at most one pending relationship proposal per canonical pair. The service still validates these rules to return domain-specific errors.
- Relationships and proposals are distinct lifecycle concepts even if they share persistence infrastructure. An active relationship records the accepted type, direction where relevant, active contractual text, active permissions and activation time. A proposal records sender, recipient, proposed type, proposed contractual text, proposed permission target state and creation time.
- The six relationship types are shared domain values: Krieg, Frieden, Freundschaft, Bündnis, Handelsabkommen and Vasallenschaft. Only Vasallenschaft is directional; its proposal sender becomes Lehnsherr and its recipient becomes Vasall on acceptance.
- Diplomacy is limited to different alliances of the same faction. No relationship or proposal row is created for opposing factions. Cross-faction hostility remains a rule from ADR 0001, not a synthetic war relationship.
- Every mutation affecting a pair locks or otherwise serializes the canonical pair inside one database transaction. Acceptance atomically replaces the previous active relationship. War atomically removes the active relationship, proposal and pending permission/contract change before creating active war.
- A war declaration is immediate. Active war cannot be terminated through the generic relationship-ending action and can only be atomically replaced by accepted peace. Peace proposals are valid only against active war.
- A non-war relationship can be ended by the president or diplomat of either participating alliance. Ending it also removes all pending changes associated with it.
- At most one pending change exists for an active relationship. Its proposed target state includes all changed relationship properties required for negotiation: relationship type when changed, complete permission state and contractual text. A proposal that yields the same accepted state is rejected.
- Active permissions are modeled as explicit booleans, not inferred from relationship type. “Als Freund behandeln” is valid only for Handelsabkommen, Freundschaft, Bündnis and Vasallenschaft. “Live-Kartenpositionen teilen” is valid only for Bündnis. Invalid combinations are rejected or sanitized at the domain boundary before persistence; clients cannot activate hidden combinations.
- No stored permission has a gameplay effect in this stage. Shared DTOs label them as negotiated diplomatic state, and activation of their cross-system capabilities is reserved for “Beziehungswirkungen”.
- The active contractual text is public. A pending text is returned only to the president or diplomat of either participating alliance. Access checks use the authenticated viewer and relationship parties for every direct lookup.
- Contractual text accepts zero to 20,000 Unicode characters after trim. War always stores no contractual text. Display uses the existing safe BBCode renderer; raw HTML is never accepted as a rendering path.
- President and Diplomat have every diplomacy mutation capability. Vize and members without an Amt have none. These permissions extend the existing fixed-office matrix and are checked in the service for every command.
- Read DTOs are audience-specific. Public alliance details include only active relationship summaries. Diplomacy management responses additionally contain proposals, pending changes and server-computed actions such as declare, propose, accept, decline, withdraw and end. The frontend never derives authority from the viewer’s role alone.
- The alliance detail page receives public active relationship summaries and safely rendered contractual text access. A separate management view is available only when the server advertises diplomacy management capability.
- Public active summaries include stable identifiers, counterparty reference, relationship type, vassalage direction when applicable, activation time, active permissions and whether contractual text is present. Management summaries additionally identify proposal direction, creation time and pending target state.
- The existing `$ALLIANCE_DIPLOMATIC_RELATIONS` placeholder is populated from active public relationship data only. Its representation uses existing safe description rendering and does not introduce GraphViz or executable markup as a requirement.
- A public Diplomatie-Chronik is introduced in this stage. It records only committed public events: war declaration, accepted initial agreement, accepted type change and termination of an active relationship. Peace acceptance is an accepted type change from war. Pending, rejected and withdrawn proposals and permission/text-only changes are not public chronicle events unless they also accept a new relationship type.
- Chronicle entries are immutable. They retain event type, actor, both involved alliance identifiers and names at event time, timestamp and minimal metadata needed to describe type and vassalage direction. They do not copy alliance descriptions, banner data or the contractual body.
- Chronicle reads are public, paginated and newest first. Pagination follows the repository’s existing response conventions and uses a bounded page size.
- Diplomacy mutations produce notification intents in the same transaction as the state change. Delivery occurs only after commit through a reliably retryable boundary. Retrying delivery cannot repeat the domain command. A messaging failure never reverses committed diplomacy.
- Notifications are alliance-wide for the affected counterparty rather than limited to one office holder. They cover war, new proposal, acceptance, decline, withdrawal, relationship termination and accepted/rejected/withdrawn changes. They identify actor, alliance, counterparty and result without exposing a confidential draft in message text.
- Shared request and response contracts live with existing alliance DTOs. Controllers remain thin authenticated HTTP adapters using numeric identifiers, body validation and service-returned domain errors.
- Database migrations add diplomacy structures and constraints without requiring immediate feature activation. Existing alliance rows remain valid and require no backfill beyond deterministic defaults or indexes.
- Server-side rate limiting protects diplomacy mutation endpoints, especially war and proposal creation, without imposing STU cooldowns, proposal expiry or minimum contract duration.
- The frontend adds public active-relationship and chronicle sections plus a diplomacy management view integrated with existing alliance navigation, loading and error conventions. Actions disable while pending and reload authoritative server state after completion.
- All labels and prose use the canonical terms from `CONTEXT.md`: Beziehung, Beziehungstyp, Beziehungsvorschlag, Vertragswerk, Beziehungsfreigabe and Diplomatie-Chronik.

## Testing Decisions

- A good test asserts externally visible behavior: returned DTOs and server-computed actions, domain errors, committed relationship/proposal/chronicle state and emitted post-commit notification intents or delivered system messages. It does not assert private helper calls, ORM call order or internal representation choices.
- The primary and highest test seam is the alliance service against the in-memory persistence implementation. Its scenarios cover every state transition, each Amt, same- versus cross-faction parties, proposal direction, vassalage direction, contractual visibility, permission validation, server-computed actions, chronology and post-commit messaging behavior.
- The in-memory implementation mirrors database cardinalities and transaction rollback semantics, as it already does for alliance membership and applications. Test setup may seed relationships and proposals directly, but behavior tests drive transitions only through public service commands.
- A focused PostgreSQL integration suite verifies migration execution, foreign keys and cleanup, canonical unordered-pair uniqueness, one-active/one-pending/one-change constraints, transactional replacement and concurrency. Required races include two simultaneous proposals, two responses to one proposal, war racing with proposal acceptance and two simultaneous permission/text changes; each must end in one valid domain state with no raw database error exposed.
- Migration tests follow the existing recording-query-runner pattern and assert creation and reversal of tables, indexes, constraints and enum/check rules without coupling to irrelevant SQL formatting.
- Frontend component tests use the existing mocked API seam. They verify public versus confidential rendering, server-driven action visibility for Präsident, Diplomat, Vize and member, sent/received proposal actions, current relationship alongside pending replacement, disabled actions during requests, safe error display, authoritative reload and public chronicle pagination.
- Existing alliance service tests are prior art for office matrices, observable system messages, validation and transaction rollback. Existing alliance PostgreSQL tests are prior art for real constraints and concurrent acceptance. Existing alliance page tests are prior art for mocked routes, server-provided action flags and reload behavior.
- Safe BBCode and placeholder tests assert rendered output at the public service/component boundary, including that pending contractual text cannot appear in public alliance details or `$ALLIANCE_DIPLOMATIC_RELATIONS`.
- Authorization tests call every mutation directly as Vize, member without Amt, outsider and cross-faction actor where applicable; absence of a frontend button is never considered sufficient coverage.
- Notification tests prove that rollback emits nothing, a committed state survives a delivery failure and retrying notification delivery does not duplicate the relationship transition.

## Out of Scope

- Applying Freund, Feind or Neutral to combat, alarms, threat reactions, transfers, ship provisioning, emergency details or crew experience.
- Revealing ships or stations outside sensor range, sharing live map positions, sharing historical scans, alliance colors on influence areas or other Sternenkartenwirkungen.
- Docking, wormhole or trade-post privileges and their alliance targets.
- Allianzdepots and operational member views for colonies, ships, stations, storage or crew.
- The internal Allianzchronik for membership, office, banner and detail events; only the public Diplomatie-Chronik is part of this stage.
- The Allianzforum and its dashboard integration.
- Banner upload, replacement, deletion and `$ALLIANCE_BANNER`.
- Automatic Präsident succession, expanded dissolution/reset cleanup and account-deletion behavior beyond preserving referential integrity for the new diplomacy data. Their complete lifecycle is specified in a later stage.
- Allianz-to-alliance-less-player and alliance-less-player-to-alliance-less-player relationships. The schema must admit that extension, but public API and UI support arrive in “Siedler-Abkommen”.
- A general contact list, personal friend/enemy markers, notes or block list.
- A GraphViz diplomacy graph. Public relationship lists and the description placeholder provide the required player-facing information without adding that rendering dependency.
- Websocket live updates. This stage reloads authoritative state after actions and uses system messages.
- Cooldowns, expiry times, minimum relationship durations or recurring diplomacy jobs; STU has none.
- `[translate]` blocks, BBCode in alliance names, dead STU code and known STU security defects.
- Pirate-round prestige sharing and unrelated missing game systems.

## Further Notes

- This is the first of six specifications produced by the full-parity Wayfinder map. It depends on the implemented alliance core and creates the stable model consumed by the later “Beziehungswirkungen” stage.
- ADR 0001 remains binding: all members of an alliance share a faction, opposing factions are always enemies and diplomacy exists only inside a faction.
- Public functionality means visible to authenticated players, consistent with the existing authenticated alliance pages; it does not make unauthenticated HTTP access a requirement.
- “Bündnis” is the German domain label for the relationship type named “Allianz” in some STU material, avoiding confusion with the party **Allianz** itself.
- No STU defect is copied: pending text has access control; all actions are server-authorized; duplicate peace offers and multiple active/pending states are prevented; and partial writes on validation errors are forbidden.
- The accepted testing seams are: alliance service with the in-memory store, focused real-PostgreSQL integration tests and frontend component tests with a mocked API.
