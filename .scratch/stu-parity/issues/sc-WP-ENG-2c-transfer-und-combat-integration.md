# Policy in Transfer und Kampf integrieren

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** sc-WP-ENG-2a, sc-WP-ENG-2b, sh-AP-23

## Ziel

Transfer und Angriff nutzen Loader und Policy ohne Verhaltens- oder Meldungsverlust.

## Akzeptanzkriterien

- [x] Einzelprüfungen zentral auswerten.
- [x] Urlaubsschutz und deutsche Meldungen regressionsgetestet.

## Comments

- 2026-10-23: Blockiert durch `sc-WP-ENG-2b`: Das Issue steht auf `needs-info`, und der geforderte NestJS-Kontextloader ist nach einem fehlgeschlagenen Gesamttest nicht im Produktcode vorhanden. Transfer und Kampf können daher nicht wie spezifiziert auf Loader und Policy umgestellt werden. Bitte zuerst `sc-WP-ENG-2b` wieder freigeben und abschließen.
- 2026-10-30: Product-Owner-Entscheidung: Option 1. Der inzwischen mit Commit `ad26530` umgesetzte und als `resolved` markierte Kontextloader `sc-WP-ENG-2b` beseitigt den einzigen dokumentierten Blocker. Das Issue ist wieder `ready-for-agent`; eine weitere STU- oder Datenbankentscheidung ist für diese SWU-Policy-Integration nicht erforderlich.
- 2026-10-30: Abgebrochen. Umsetzung (TransferService und CombatService.attack nutzen `InteractionContextService` + `checkInteraction` mit `TARGET_VACATION`, inkl. Regressionstests für Urlaubsmeldung, Anpassung der Konstruktoren in Specs) war lint-, typecheck- und build-grün, Transfer-/Combat-Tests grün. `nx test backend` scheitert aber reproduzierbar an 2 Tests in `database-settler-scans.service.spec.ts` (`profileVisitorService` undefined in `DatabaseService.registerVisit`), auch ohne meine Änderungen (per `git stash` verifiziert). Produktcode verworfen. Frage: Soll dieser bestehende Fehler zuerst separat behoben werden (neues Issue), danach das Issue erneut freigeben? Hinweis: Einzelprüfungen Transfer (Hyperraum/Schilde/Haltung) laufen weiterhin über `shipTransferBlockReason`, weil dort die Schilde-Ausnahme für Versorgung geschützter Freunde gilt, die die Policy nicht abbildet; nur die Urlaubsprüfung ist bisher als Policy-Regel integrierbar.
- 2026-10-30 Product Owner: Option 1. Der fachfremde Backend-Gesamttestfehler wird zuerst im separaten P1/S-Issue `sh-AP-23` behoben. Betroffene manuelle `DatabaseService`-Testkonstruktionen erhalten einen expliziten `ProfileVisitorService`-Mock mit `registerVisit`; produktive Profilbesuchersemantik wird nicht optionalisiert. `sc-WP-ENG-2c` bleibt bis zur Auflösung dieses neuen Blockers `needs-info` und wird danach ohne Backend-Baseline-Ausnahme wieder `ready-for-agent`. Fachlich bleibt festgelegt: Transfer und Kampf integrieren den zentralen Urlaubsschutz, während transferspezifische Haltung-, Schild- und Versorgungsausnahmen in `shipTransferBlockReason` erhalten bleiben.
- 2026-10-30 Verifikation: `sh-AP-23` ist im aktuellen Arbeitsstand erfüllt und `resolved`. Fokussierter Database-Test 2/2, vollständige Backend-Suite 165/165 Suites und 1629/1629 Tests, Backend-Typecheck und Backend-Build sind grün. Damit ist der beschlossene Baseline-Blocker beseitigt und `sc-WP-ENG-2c` ohne Ausnahme wieder `ready-for-agent`.
- 2026-10-30: Umgesetzt. `TransferService.shipTransferBlockReason` und `CombatService.attack` laden den Urlaubsschutz über `InteractionContextService` (Feld `targetOnVacation`) und werten ihn zentral via `checkInteraction`/`TARGET_VACATION` aus (deutsche Meldung unverändert aus der Policy). Transferspezifische Haltung-, Schild- und Versorgungsausnahmen bleiben bewusst in `shipTransferBlockReason`. Regressionstests in `transfer.service.spec.ts` und `combat.service.spec.ts`. Lint/Typecheck/Test (165 Suites, 1631 Tests) und Build grün. Kein Urlaubsschutz bei Transfer zwischen eigenen Schiffen und bei `attackColony` (nicht Teil dieses Issues).
