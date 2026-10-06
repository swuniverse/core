# Diplomatie-Kern: Anforderungsmatrix (88 User Stories)

**Spec-Quelle:** `diplomatie-kern-spec.md`, Abschnitt „User Stories“.

**Leseschlüssel:** Jeder Eintrag ordnet genau eine User Story mindestens einem
nachprüfbaren automatisierten Test oder einer Akzeptanzprüfung zu. Dateinamen
beziehen sich auf die Repository-Wurzel. Die Ticket-Antworten unter
`diplomatie-kern-issues/` sind ergänzende akzeptierte Implementierungsartefakte;
diese Matrix ändert keine Ticket-Statuszeile.

| Story | Nachweis: automatisierter Test oder Akzeptanzartefakt                                                                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — `getDetail` active relationship assertions; Ticket 01 acceptance list.                                                                                |
| 2     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — public `getDetail` relationship assertions; Ticket 01.                                                                                                |
| 3     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — public relationship-contract tests; Ticket 01.                                                                                                        |
| 4     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — public proposal/draft visibility tests; Ticket 03.                                                                                                    |
| 5     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — president management authorization; Ticket 06.                                                                                                        |
| 6     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — diplomat management authorization; Ticket 06.                                                                                                         |
| 7     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — vice forbidden diplomacy tests; Ticket 02/06.                                                                                                         |
| 8     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — ordinary member forbidden tests; Ticket 02/06.                                                                                                        |
| 9     | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — alliance-less actor forbidden tests; Ticket 02/06.                                                                                                    |
| 10    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — server-provided diplomacy capabilities; Ticket 06.                                                                                                    |
| 11    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — same-faction target capability/tests; Ticket 02/06.                                                                                                   |
| 12    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — cross-faction target rejection; Ticket 01/02.                                                                                                         |
| 13    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — self-target rejection; Ticket 01/02.                                                                                                                  |
| 14    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — `declareWar`; Ticket 02.                                                                                                                              |
| 15    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — war notification tests; Ticket 02.                                                                                                                    |
| 16    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — war replaces relationship/proposal tests; Ticket 02.                                                                                                  |
| 17    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — war removes pending change tests; Ticket 02/05.                                                                                                       |
| 18    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — peace proposal tests; Ticket 04.                                                                                                                      |
| 19    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — peace-without-war rejection; Ticket 04.                                                                                                               |
| 20    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — canonical pending-proposal race; Ticket 04.                                                                                                               |
| 21    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — accept peace tests; Ticket 04.                                                                                                                        |
| 22    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — decline peace tests; Ticket 04.                                                                                                                       |
| 23    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — withdraw peace tests; Ticket 04.                                                                                                                      |
| 24    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — active peace detail tests; Ticket 04.                                                                                                                 |
| 25    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — peace permission matrix; Ticket 04/05.                                                                                                                |
| 26    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — friendship proposal tests; Ticket 03.                                                                                                                 |
| 27    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — alliance proposal tests; Ticket 03.                                                                                                                   |
| 28    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — trade proposal tests; Ticket 03.                                                                                                                      |
| 29    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — vassalage proposal tests; Ticket 03.                                                                                                                  |
| 30    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — accept relationship proposal tests; Ticket 03.                                                                                                        |
| 31    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — decline relationship proposal tests; Ticket 03.                                                                                                       |
| 32    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — withdraw relationship proposal tests; Ticket 03.                                                                                                      |
| 33    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — one canonical pending proposal constraint/race; Ticket 03.                                                                                                |
| 34    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — one active relationship constraint; Ticket 01.                                                                                                            |
| 35    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — accepted type change atomically replaces active relationship; Ticket 04.                                                                              |
| 36    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — pending type change preserves active relationship; Ticket 04.                                                                                         |
| 37    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — vassalage lord/vassal direction; Ticket 03/04.                                                                                                        |
| 38    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — mutual relationship presentation; Ticket 01.                                                                                                          |
| 39    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — end non-war relationship tests; Ticket 04.                                                                                                            |
| 40    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — direct end-war rejection; Ticket 02/04.                                                                                                               |
| 41    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — proposal permission tests; Ticket 05.                                                                                                                 |
| 42    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — treat-as-friend type matrix; Ticket 05.                                                                                                               |
| 43    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — war/peace permission rejection; Ticket 05.                                                                                                            |
| 44    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — live-position sharing alliance-only matrix; Ticket 05.                                                                                                |
| 45    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — propose relationship-change tests; Ticket 05.                                                                                                         |
| 46    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — accept/decline relationship-change tests; Ticket 05.                                                                                                  |
| 47    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — withdraw relationship-change tests; Ticket 05.                                                                                                        |
| 48    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — pending change preserves active permissions; Ticket 05.                                                                                               |
| 49    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — one pending change race; Ticket 05.                                                                                                                       |
| 50    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — unchanged change rejection; Ticket 05.                                                                                                                |
| 51    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — war/end removes pending changes; Ticket 02/04/05.                                                                                                     |
| 52    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — 20,000-character contract validation; Ticket 01/03.                                                                                                   |
| 53    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` and `apps/frontend/src/pages/alliances.spec.tsx` — trim/safe BBCode rendering; Ticket 01.                                                               |
| 54    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — empty contract acceptance; Ticket 01/03.                                                                                                              |
| 55    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — oversize contract atomic rejection; Ticket 01.                                                                                                        |
| 56    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — war has empty contract; Ticket 02.                                                                                                                    |
| 57    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — peace contract proposal tests; Ticket 04.                                                                                                             |
| 58    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — contractual-text change proposal tests; Ticket 05.                                                                                                    |
| 59    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — pending replacement preserves public contract; Ticket 05.                                                                                             |
| 60    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — participating management visibility tests; Ticket 05/06.                                                                                              |
| 61    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — unrelated draft access rejection; Ticket 03/05.                                                                                                       |
| 62    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — recipient-only response authorization; Ticket 03.                                                                                                     |
| 63    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — sender-only withdrawal authorization; Ticket 03.                                                                                                      |
| 64    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — stale proposal actions become domain errors; Ticket 03/04.                                                                                                |
| 65    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — two answers serialize to one success; Ticket 03.                                                                                                          |
| 66    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — simultaneous proposal invariant; Ticket 03.                                                                                                               |
| 67    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — war/acceptance serialization; Ticket 02/04.                                                                                                               |
| 68    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — relationship summary fields; Ticket 01.                                                                                                               |
| 69    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` and `apps/frontend/src/pages/alliances.spec.tsx` — sent/received management proposals; Ticket 06.                                                       |
| 70    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` and `apps/frontend/src/pages/alliances.spec.tsx` — active/pending replacement display; Ticket 06.                                                       |
| 71    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — pending change/proposer management fields; Ticket 06.                                                                                                 |
| 72    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — direct unauthorized mutation tests; Ticket 02/03/06.                                                                                                  |
| 73    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — public reads without membership; Ticket 01.                                                                                                           |
| 74    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — transition notification cases; Ticket 08.                                                                                                             |
| 75    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — rollback sends no delivery intent; Ticket 08.                                                                                                         |
| 76    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — failed delivery preserves committed state; Ticket 08.                                                                                                 |
| 77    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` and `apps/backend/src/modules/alliance/alliance.int-spec.ts` — durable retry/idempotency; Ticket 08.                                                    |
| 78    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — chronological pagination; Ticket 07.                                                                                                                  |
| 79    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — chronicle event selection; Ticket 07.                                                                                                                 |
| 80    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — omitted proposal/rejection/withdrawal events; Ticket 07.                                                                                              |
| 81    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — immutable event snapshots; Ticket 07.                                                                                                                 |
| 82    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — chronicle omits contracts/descriptions; Ticket 07.                                                                                                    |
| 83    | `apps/backend/src/modules/alliance/alliance.int-spec.ts` — persisted immutable chronicle rows; Ticket 07.                                                                                                            |
| 84    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` and `apps/frontend/src/pages/alliances.spec.tsx` — relationship placeholder; Ticket 07.                                                                 |
| 85    | `apps/backend/src/modules/alliance/alliance.service.spec.ts` — placeholder hides pending/draft content; Ticket 07.                                                                                                   |
| 86    | `apps/backend/src/modules/alliance/diplomacy-capability.service.spec.ts` and migration tests — capability-gated rollout; Ticket 08.                                                                                  |
| 87    | Ticket 01 and Ticket 08 acceptance lists plus cross-system regression suite: stored permissions deliberately have no combat/map/transfer/scan/access integration.                                                    |
| 88    | `apps/backend/src/modules/alliance/alliance.store.ts` interface plus `apps/backend/src/modules/alliance/alliance.service.spec.ts` — stable persistence model consumed through the store/service boundary; Ticket 01. |

## Final integration hardening evidence

The following focused artifacts additionally substantiate the final Ticket 08
acceptance criteria:

- `apps/backend/src/modules/alliance/diplomacy-rate-limiter.service.spec.ts`:
  independently constructed limiter instances share a reservation boundary.
- `apps/backend/src/modules/alliance/alliance.int-spec.ts`:
  two service instances cannot concurrently send the same leased durable
  notification intent.
- `apps/backend/src/database/migration-tests/20261006110000-add-diplomacy-delivery-leases-and-rate-limits.spec.ts`:
  deployable lease and cluster-wide rate-limit schema migration.
