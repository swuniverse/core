# Urlaub exakt wie STU: Wirksamkeit nach 48 h im Tick, Werft läuft weiter

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Urlaub (Kryoschlaf) wirkt in SWU im Tick **sofort ab Aktivierung** statt erst nach 48 h. Der Haupttick baut die Menge der Urlauber aus `user.vacationMode` und überspringt damit Kolonien, setzt `skipRepair` für Schiffe und Stationen und das globale Crewlimit aus. Ionensturm und Subraumellipse verschonen Schiffe ebenfalls sofort. Das zentrale `isVacationEffective` (48 h) nutzt der Tick nicht.

Folgen:
- Ein Spieler kann kurz vor dem Tick Urlaub aktivieren und sich danach wieder einloggen (Login beendet den Urlaub). So setzt er das Crewlimit für einen Tick aus.
- Die Kolonie friert sofort ein, obwohl die UI 48 h Vorlauf verspricht.
- Weil der Haupttick die Kolonien überspringt, werden Schiffsbau, Umrüstung und Werftreparatur der Koloniewerft im Urlaub nicht fertig. STU schließt diese Aufträge im Process-Tick ohne Urlaubsprüfung ab.
- Der UI-Text nennt eine Abklingzeit „nach Deaktivierung“, das Backend zählt (wie STU) ab Aktivierung.

Der Product Owner hat am 2026-11-17 entschieden: **exakt wie STU**. Das ersetzt die bisherige Entscheidung zu sh-AP-04c.

STU-Regeln:
- Wirksam ist der Urlaub erst, wenn `vacationMode` gesetzt ist **und** die Aktivierung länger als 48 h zurückliegt (`isVacationRequestOldEnough`, `VACATION_DELAY_IN_SECONDS`).
- Nur wirksamer Urlaub: Kolonie-Tick übersprungen (`ColonyTickManager`), Crewlimit-Folgen ausgesetzt (`CrewLimitations`), Ionensturm und Subraumellipse verschonen die Schiffe (`Location::getSpacecraftsWithoutVacation`).
- Process-Tick (Schiffsbau, Umrüstung, passive Werft-/Stationsreparatur, Eigenreparatur, Schildregeneration) prüft keinen Urlaub; `RepairActions` mit Urlaubsprüfung ist in STU nicht als Tick-Komponente registriert.
- Sperrfrist: erneute Aktivierung erst, wenn die letzte Aktivierung mehr als 7 Tage zurückliegt (`ActivateVacation`). Bei Sperre die Meldung „Urlaubsmodus ist noch gesperrt. Letzte Aktivierung ist weniger als eine Woche her!“.
- UI-Hinweise (`options.twig`): Account wird eingefroren, andere Spieler können nicht interagieren; Aktivierung erst nach 48 h ohne Login; Info am Namen; danach eine Woche nicht ausführbar.

## STU-Quellen

- `src/Orm/Entity/User.php` (Z. ~299–302, `isVacationRequestOldEnough`)
- `src/Module/PlayerSetting/Lib/UserConstants.php` (Z. 32, `VACATION_DELAY_IN_SECONDS = 2 Tage`)
- `src/Module/PlayerSetting/Action/ActivateVacation/ActivateVacation.php` (Z. ~25–40, Sperre 7 Tage ab `vacationRequestDate`)
- `src/Module/Tick/Colony/ColonyTickManager.php` (Z. 60–61)
- `src/Module/Tick/Spacecraft/ManagerComponent/CrewLimitations.php` (Z. 46–47)
- `src/Module/Tick/Spacecraft/ManagerComponent/RepairActions.php` (Z. 153)
- `src/Orm/Entity/Location.php` (Z. 150–154, `getSpacecraftsWithoutVacation`)
- `src/Module/Tick/Process/FinishShipBuildJobs.php`, `FinishShipRetrofitJobs.php`, `FinishPassiveShipRepairJobs.php` (ohne Urlaubsprüfung)
- `src/html/view/options.twig` (Urlaubsbox, Z. ~180–200)

## SWU-Pfade

- `packages/shared/src/lib/auth/index.ts` (`isVacationEffective`, `VACATION_DELAY_MS`)
- `apps/backend/src/modules/tick/tick.service.ts` (`handleTick`: Urlaubermenge Z. ~154–159, Kolonien Z. ~169–174, `skipRepair` Z. ~240, Crewlimit Z. ~258)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts#processTick` (`skipRepair`), `station-repair.service.ts#processTick` (Z. ~234–235), `spacecraft-repair.service.ts`
- `apps/backend/src/modules/spacecraft/ion-storm-effects.ts` (Z. ~57–66)
- `apps/backend/src/modules/anomaly/subspace-ellipse.handler.ts` (Z. ~75–82)
- `apps/backend/src/modules/colony/colony-tick-processor.service.ts#processTick`, `colony-shipyard.service.ts#processShipBuildQueue`
- `apps/backend/src/modules/settings/settings.service.ts` (`activateVacation`, `VACATION_COOLDOWN_MS`, Z. ~244–270)
- `apps/frontend/src/pages/settings.tsx` (Urlaubsbox Z. ~903–931, Text Z. ~904–907)
- Tests: `apps/backend/src/modules/colony/colony-tick.spec.ts` (Z. ~7056–7061), `settings.service.spec.ts`

## Akzeptanzkriterien

- [x] Der Haupttick bestimmt Urlauber ausschließlich über `isVacationEffective` (lädt dafür `vacationStartedAt` bzw. das Aktivierungsdatum). Urlaub < 48 h zählt im Tick als **nicht** im Urlaub.
- [x] Kolonien und das globale Crewlimit verwenden nur wirksamen Urlaub.
- [x] Reparaturen (passive Werft-/Stationsreparatur und Eigenreparatur) laufen auch bei wirksamem Urlaub weiter wie STU; `skipRepair` für Urlauber entfällt.
- [x] Ionensturm und Subraumellipse verschonen nur Schiffe von Spielern mit wirksamem Urlaub.
- [x] Schiffsbau, Umrüstung und Werftreparatur der Kolonie- und Stationswerft werden auch bei wirksamem Urlaub abgeschlossen, wie im STU-Process-Tick. Bis sh-AUD-07a/b umgesetzt sind, ruft der Haupttick die Werftqueue auch für übersprungene Urlauberkolonien auf; danach übernimmt der minütliche Lauf ohne Urlaubsprüfung.
- [x] Sperrfrist wie STU: Aktivierung abgelehnt, solange die letzte Aktivierung höchstens 7 Tage zurückliegt; deutsche Meldung wie STU.
- [x] `settings.tsx`: Urlaubsbox mit den STU-Hinweisen (Einfrieren, keine Interaktion anderer Spieler, Wirksamkeit erst nach 48 h ohne Login, Kennzeichnung am Namen, danach eine Woche gesperrt). Der falsche Satz „Nach Deaktivierung gilt eine 7-Tage-Abklingzeit“ entfällt.
- [x] Alle übrigen Leser von `vacationMode` sind geprüft: Statistik und Inaktivitätslöschung bleiben bewusst bei `vacationMode` (= STU `isVacationMode`); jede andere Spielregel nutzt `isVacationEffective`.
- [x] `map.md`: Entscheidung „2026-10-21 – sh-AP-04c – Option 1a, 2a“ ersetzt durch „Urlaub exakt wie STU“ mit Verweis auf dieses Ticket.
- [x] Backend-Tests: Urlaub < 48 h ⇒ Kolonie tickt, Crewlimit greift, Ionensturm/Subraumellipse treffen; Urlaub > 48 h ⇒ jeweils ausgesetzt; Reparatur läuft in beiden Fällen; Werftauftrag wird bei wirksamem Urlaub fertig; Sperrfrist-Grenzwerte (6 Tage 23 h abgelehnt, 7 Tage + 1 s erlaubt).
- [x] Frontend-Test: Urlaubsbox zeigt die STU-Hinweise.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B2, Abschnitt D (sh-AP-04c), Abschnitt G (Zeile „Urlaub pausiert Kolonie-Tick …“), Abschnitt H („B1 … Während Urlaub schließt SWU diese Aufträge gar nicht ab“, „B2 Urlaub: Auch Ionensturm und Subraumellipse …“) und Abschnitt N2.
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G1 (Zusatz Urlaub), G2 und „Unsicherheiten – nachgeprüft“ (G2).
- PO-Entscheidung 2026-11-17: Urlaubsregeln exakt nach STU. Ersetzt `map.md`-Entscheidung sh-AP-04c. Das resolved Ticket sh-AP-04c erfüllt sein AK „Urlaub < 48 h zählt als aktiv“ nicht, weil die Implementierung nicht nach „wirksam“ unterscheidet.

## Comments

- 2026-11-17 Ticketerstellung, Hinweis zum STU-Code: `RepairActions.php` enthält die Urlaubsprüfung (Z. 153), ist aber in `src/Module/Tick/services.php` nicht als Tick-Komponente registriert. Aktiv läuft die passive Reparatur über `FinishPassiveShipRepairJobs` und die Eigenreparatur über `RepairTaskJobs`, beide im Process-Tick ohne Urlaubsprüfung. Das AK oben hält `skipRepair` für wirksamen Urlaub (Vorgabe). Bestätigt sich der Befund, die passive Stations-/Werftreparatur wie die übrigen Werftaufträge auch im Urlaub abschließen und das im Ticket vermerken; im Zweifel beim Product Owner nachfragen.

- 2026-11-17 Product Owner: Passive Reparatur läuft im Urlaub weiter wie STU; `skipRepair` für Urlauber entfällt.

### 2026-11-18 – umgesetzt, Prüfung ausstehend

Implementierungscommit (eindeutiger Betreff): `fix(tick): enforce delayed vacation and keep shipyard jobs running (sh-AUD-05)`.
Status bleibt `claimed`; Abschluss erst nach dem separaten Prüfpass.

**Umsetzung und Quellenabgleich**

- Der Haupttick lädt `vacationStartedAt` und bildet den Urlauberbestand über den bestehenden gemeinsamen `isVacationEffective` mit einem Zeitpunkt für den ganzen Lauf. Urlaub gilt erst nach mehr als 48 Stunden; exakt 48 Stunden, fehlendes Datum oder beendeter Urlaub sind unwirksam. Nur dieser Bestand friert die Koloniewirtschaft ein und setzt das globale Crewlimit aus.
- Für wirksame Urlauberkolonien ruft der Haupttick weiterhin `ColonyService.processShipBuildQueue` auf, ohne Wirtschaft/Bevölkerung/Forschungsertrag zu buchen. Diese bestehende Queue verarbeitet Bau, Umrüstung und Werftreparaturen. Nach sh-AUD-07a/b übernimmt der getrennte Process-Lauf diese Aufgaben. Normale Kolonien durchlaufen weiter einmal ihren normalen Tick samt Queue; es gibt keinen doppelten Queue-Aufruf.
- Der Haupttick übergibt keine urlaubsbedingte `skipRepair`-Option mehr. Stations-/Werft- und Eigenreparaturen laufen für alle Urlaubszustände weiter. Der explizite technische Skip-Parameter bleibt für andere Aufrufkontexte bestehen; er ist nicht mehr mit Urlaub gekoppelt. Der frühere Stationsreparatur-Test wurde entsprechend benannt und um echte Reparaturschritte mit beiden Urlaubszuständen ergänzt.
- Ionensturm und Subraumellipse laden das Aktivierungsdatum und verschonen im Haupttick ausschließlich wirksame Urlauber. Vorlauf/fehlendes Datum gewähren keinen Schutz. Bestehende PostgreSQL-Fixtures mit wirksamem Urlaub erhalten ein tatsächlich ausreichend altes Datum.
- Reaktivierung ist gesperrt, solange die letzte Aktivierung höchstens sieben Tage zurückliegt. Die Ablehnung lautet wie in STU: „Urlaubsmodus ist noch gesperrt. Letzte Aktivierung ist weniger als eine Woche her!“. Deaktivierung/Login setzen den Beginn der Sperre nicht neu.
- Die UI erläutert Einfrieren der Koloniewirtschaft, Interaktionsschutz, 48 Stunden ohne Login, Login-Beendigung, Kennzeichnung am Namen, die Sperre ab letzter Aktivierung und weiterlaufende Bau-/Reparaturaufträge. API-Verhalten und Zeitstempelanzeige bleiben erhalten.

STU gelesen: User::isVacationRequestOldEnough (> 48 h), ActivateVacation (> 7 Tage), Location::getSpacecraftsWithoutVacation sowie Tick/services.php. Dort sind FinishShipBuildJobs, FinishShipRetrofitJobs, FinishPassiveShipRepairJobs und RepairTaskJobs als Process-Komponenten registriert. Die spätere PO-Anweisung im Ticket bestätigt ausdrücklich weiterlaufende passive Reparaturen; keine zusätzliche Klärung erforderlich.

**Audit der übrigen Leser**

Spielregeln für Alarmreaktion, Koloniezugriff/Orbitalaktionen, Boarding, Traktor, Übernahme und öffentliche Profil-/Datenbankkennzeichnung nutzen bereits `isVacationEffective`. Statistik und Inaktivitätslöschung behalten absichtlich `vacationMode`, entsprechend STUs Anfrage-/Modusstatus. Aktivieren/Deaktivieren, Login-Beendigung, DTO-/Entity-Speicherung und administrative Modusanzeige müssen ebenfalls das Anfrage-Flag kennen und bleiben so. Die verbliebenen Anomalie-SQL-Vorfilter auf `vacationMode:true` dienen nur der Vorauswahl; die eigentliche Schutzentscheidung prüft jetzt das Datum über den gemeinsamen Helfer. Die alte sh-AP-04c-Entscheidung und ihre Zusammenfassung in der Map sind ersetzt.

**Sofort geprüft**

44 gezielte Backend-Tests erfolgreich:

- `vacation-tick.spec.ts`: 7 Fälle für frisch/47 h/exakt 48 h/48 h + 1 ms/49 h/beendet/fehlendes Datum. Wirtschaft und Crewlimit nur bei wirksamem Urlaub ausgesetzt; Queue für eingefrorene Kolonien und Reparaturaufrufe für Schiff/Station bleiben aktiv.
- `vacation-anomaly.spec.ts`: 8 Fälle für Ionensturm und Subraumellipse beiderseits der strikten 48-h-Grenze, einschließlich tatsächlichen Hüllen-/Schildschadens bei unwirksamem Urlaub.
- `settings.service.spec.ts`, gefiltert auf „vacation cooldown“: 5 Fälle, darunter 6 Tage 23 h, exakt 7 Tage, 7 Tage + 1 s und Deaktivierung ohne neue Sperrfrist.
- `station-repair.service.spec.ts`: 14 Fälle, einschließlich fortgesetzter passiver Reparatur mit 47/49 h Urlaub.
- `spacecraft-repair.service.spec.ts`: 9 bestehende Eigenreparatur-/Abbruchfälle.
- `colony-tick.spec.ts`, gezielter Crewlimit-Fall: 1 Test mit wirksamem Urlaub.

Frontend: 1 gezielter Test in `settings-vacation.spec.tsx` erfolgreich, inklusive aller Hinweise und fehlendem falschen Deaktivierungs-Abklingtext. Kurzer tatsächlicher Diffreview und Whitespace-Prüfung; nur eigene Änderungen aus bereits bearbeiteten Dateien werden committet.

**Separater Prüfpass ausstehend**

1. Abschlussreview aller Kriterien und Urlaubs-Leser, insbesondere Wirksamkeits-/Sperrgrenzen und weiterlaufende Aufträge.
2. PostgreSQL-/API-Fälle für Koloniewirtschaft, Crewlimit, tatsächlich fertige Bau-/Retrofit-/Werftreparaturaufträge sowie Eigen-/Stationsreparatur während wirksamen Urlaubs.
3. `ion-storm-effects.int-spec.ts` und `subspace-ellipse.int-spec.ts` mit korrigierten Fixtures sowie 48-h-Grenzfälle; übrige Urlaubs-/Login-/Interaktionsregressionen im Sammelpass.
4. Backend/Frontend/Shared-Lint, Typechecks und gemeinsamer Build.
5. Browserprüfung der Urlaubsbox, Aktivierung/Logout/Login-Beendigung und deutschen Sperrmeldung.

Modellrouting: Spielregeln und Kurzreview direkt im verfügbaren Sitzungsmodell; begrenzte UI-Arbeit an `ticket-coder` (GPT-6 Luna, high) delegiert. Sol-Umschaltung in der laufenden Sitzung nicht verfügbar, Workflow-Fallback genutzt. Keine messbaren Tokenzahlen verfügbar.
