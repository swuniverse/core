# 07: Gesamtintegration und Aktivierungsnachweis

**What to build:** Die Etappe Allianz-Infrastruktur ist end-to-end nachgewiesen und kann über ihre Fähigkeit separat aktiviert werden. Echte Postgres-Tests und direkte Requests über die vollständige Rollenmatrix belegen, dass Sichtbarkeit und Detailstufen ausschließlich serverseitig und dynamisch entschieden werden.

**Blocked by:** 02: Schiffe im geöffneten Systemraster; 04: Verwaltungsdetails für Präsident und Vize; 05: Geteilte Partnerschiffe auf der Sternenkarte

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-issues/07-gesamtintegration-und-aktivierung.md`)
**Spec:** `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`

- [x] Postgres-Integrationstests nach dem Muster der vorhandenen Allianz-Integrationstests prüfen die Kontaktabfrage über Mitgliedschaft, Amt, Beziehung, Freigabe und Kartenebene.
- [x] Die Integrationstests belegen, dass Beitritt, Austritt, Rauswurf, Auflösung, Amtswechsel, Krieg, Beziehungsende und Freigabeentzug ohne Bereinigungsschritt mit der nächsten Anfrage wirken.
- [x] Direkte Requests als Präsident, Vize, Diplomat, Mitglied ohne Amt, allianzloser Spieler und Spieler der anderen Fraktion liefern genau die zulässigen Kontakte und Detailstufen; manipulierte Parameter liefern keine zusätzlichen Kontakte oder Details.
- [x] Mit deaktivierter Fähigkeit verhalten sich Sternenkarte und Diplomatieverwaltung wie vor der Etappe, abgesehen von eigenen Schiffen; mit aktivierter Fähigkeit sind alle Wirkungen sichtbar.
- [x] Falls ein Index nötig wurde, ist die Migration rückwärtskompatibel und vor der Aktivierung ausrollbar.
- [x] Die Antwortzeit der Kontaktroute bleibt bei einer Allianz mit vielen Mitgliedern und Schiffen durch eine gebündelte Haltungsauflösung pro Anfrage begrenzt.
- [x] Die Etappe wird in `map.md` unter den Entscheidungen mit Verweis auf Spezifikation und Tickets nachgetragen.

## Answer

Die Etappe ist gegen echtes Postgres nachgewiesen (`npx nx run backend:test-integration`, 49 Tests grün).

- `apps/backend/src/modules/spacecraft/starmap-visibility.int-spec.ts` prüft die Kontaktabfrage über Mitgliedschaft, Amt, Beziehung, Freigabe und Kartenebene, einschließlich zerstörter Schiffe und Schiffen in Systemen. Beitritt, Austritt, Rauswurf, Auflösung, Amtswechsel und Präsidentschaftsübergabe, Krieg, Beziehungsende und Freigabeentzug laufen über den echten `AllianceService` und wirken jeweils mit der nächsten Anfrage.
- `apps/backend/src/modules/spacecraft/starmap-contacts-requests.int-spec.ts` sendet echte HTTP-Requests mit JWT durch die Controller als Präsident, Vize, Diplomat, Mitglied ohne Amt, allianzloser Spieler, Spieler der anderen Fraktion und Partner. Jede Rolle erhält genau die zulässigen Kontakte und Detailstufen. Zusätzliche Parameter (`viewerId`, `role`, `details`, `allianceId` …) ändern die Antwort nicht, eine doppelte `layerId` wird abgelehnt, und private Schiffsdaten werden nie übertragen. Mit deaktivierter Fähigkeit liefert die Route nur eigene Schiffe, `shared-live-positions` bleibt unverändert, und die Diplomatieverwaltung meldet `starmapDisplayActive: false`. Das Frontend-Verhalten beider Zustände decken die vorhandenen Seitentests ab (`starmap.spec.tsx`, `alliances.spec.tsx`).
- Gefundener Fehler: `resolveMany` löste jeden Spieler einzeln mit vier Abfragen auf, also 403 Abfragen pro Anfrage bei 100 Mitgliedern. Jetzt lädt es Spieler, Mitgliedschaften und die aktiven Beziehungen der Betrachterallianz einmal pro Aufruf (neu: `AllianceStore.findMemberships`). Die Kontaktroute braucht unabhängig von Mitglieder- und Schiffszahl konstant 10 Abfragen; ein Test hält das fest.
- Es war kein Index und keine Migration nötig, weil `spacecraft.userId`, `alliance_memberships.userId`/`allianceId` und die aktiven Beziehungen bereits indiziert sind.
- Die Etappe ist in `map.md` unter „Decisions so far“ nachgetragen.
