# 08: Letzte Aktivität erfassen

**What to build:** SWU erfasst für jeden Spieler den Zeitpunkt seiner letzten Aktivität, ohne dass der Spieler etwas tun muss. Er wird bei authentifizierter Nutzung höchstens alle fünf Minuten aktualisiert und dient der Mitgliederübersicht sowie später der automatischen Präsidentennachfolge.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/08-letzte-aktivitaet-erfassen.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Rückwärtskompatible Migration mit Migrationstest: nullable Zeitstempel der letzten Aktivität an der Spielertabelle; `lastActiveTick` bleibt unverändert und ungenutzt.
- [ ] Jede authentifizierte API-Anfrage aktualisiert den Zeitstempel über eine bedingte Datenbankaktualisierung höchstens einmal alle fünf Minuten je Spieler, instanzübergreifend.
- [ ] Fehler der Aktualisierung lassen die eigentliche Anfrage nie scheitern und werden protokolliert.
- [ ] Verhaltenstests über die öffentliche Seam des Mechanismus: erste Anfrage setzt den Zeitstempel, eine weitere innerhalb von fünf Minuten nicht, nach fünf Minuten wieder; ein Fehler lässt die Anfrage gelingen.
- [ ] Postgres-Integrationstest: die bedingte Aktualisierung drosselt bei gleichzeitigen Anfragen.

## Answer

Merged on integration/interne-zusammenarbeit. Column `users.lastActiveAt` (nullable TIMESTAMP); `LastActivityService.record` with SQL-conditional 5-min throttle; global `LastActivityInterceptor`.
