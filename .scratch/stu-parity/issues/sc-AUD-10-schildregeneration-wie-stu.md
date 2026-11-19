# Schildregeneration wie STU

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

SWU regeneriert Schilde nur im Haupttick, unabhängig vom Schildstatus, gegen 2 EPS und mit dem Kampfrundenwert `recharge_rate: 0.1`. Crew, Systemintegrität, Feldeffekte, Anomalien und Treffer spielen keine Rolle. Schiffsliste (`floor(5 %)`) und Schiffskopf (`round(10 %)`) zeigen unterschiedliche Raten.

STU regeneriert so:
- nur abgeschaltete Schilde, alle 15 Minuten, ohne EPS-Kosten;
- nur mit ausreichender Crew (mindestens Bauplan-Crew) und intaktem Schildsystem;
- kein Feld mit Effekt `SHIELD_MALFUNCTION`, keine Subraumellipse, kein Ionensturm;
- Rate `ceil(10 %)`;
- jeder Schildtreffer setzt den Timer zurück.

## STU-Quellen

- `src/Module/Tick/Process/ShieldRegeneration.php` (Z. ~15–60)
- `src/Orm/Repository/SpacecraftRepository.php` (Z. ~159–189, `getSuitableForShieldRegeneration`)
- `src/Module/Spacecraft/Lib/SpacecraftWrapper.php` (Z. ~147–161, `getShieldRegenerationRate`)
- `src/Module/Spacecraft/Lib/Damage/ApplyDamage.php` (Z. ~95, Timer-Reset bei Treffer)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Haupttick-Regeneration Z. ~4967–4973, Listenrate Z. ~1687–1688; parallel in Arbeit, Zeilen auf HEAD)
- `apps/backend/src/modules/tick/tick.service.ts` (minütlicher Cron Z. ~311 als möglicher Träger)
- `apps/backend/src/modules/spacecraft/spacecraft-damage.ts`, `field-effect-consequence.ts` (`SHIELD_MALFUNCTION`)
- `apps/backend/src/modules/anomaly/ion-storm.handler.ts`, `subspace-ellipse.handler.ts`
- `apps/backend/src/modules/combat/combat.engine.ts` (Treffer setzt Timer)
- `apps/frontend/src/components/spacecraft/ShipHeaderTable.tsx` (Z. ~126–129), `apps/frontend/src/pages/spacecraft.tsx`
- `game-data/data/combat/formulas.yaml` (`recharge_rate`)

## Akzeptanzkriterien

- [x] Eigener Regenerationslauf alle 15 Minuten (Timer je Spacecraft, persistent), unabhängig vom Haupttick.
- [x] Regeneriert werden nur Spacecraft mit abgeschaltetem Schildsystem, Schild unter Maximum, intaktem Schildsystem, Crew ≥ benötigter Crew, ohne Ionensturm/Subraumellipse am Ort und ohne Feldeffekt Schildstörung.
- [x] Rate `ceil(10 % von max)`, gekappt auf Maximum; keine EPS-Kosten. Die Haupttick-Regeneration mit 2 EPS entfällt.
- [x] Jeder Schildtreffer (Kampf, Feld, Anomalie) setzt den Timer; Schildkollaps nach sc-AUD-08.
- [x] Liste und Schiffskopf zeigen dieselbe Rate aus einer gemeinsamen Funktion (geteilt in `packages/shared`), nur wenn die Regeneration aktuell greifen würde.
- [x] Backend-Tests je Bedingung (aktive Schilde, Crew, Integrität, Anomalie, Feldeffekt, Timer, Treffer-Reset); Frontend-Tests für einheitliche Anzeige.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte B4, E („Schildregeneration“), H („B4 Schildregeneration“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 8 inkl. „nachgeprüft“.
- PO-Linie „wie STU“ vom 2026-11-17; bisher kein Ticket.

## Comments

### 2026-11-18 – umgesetzt, Prüfung ausstehend

Implementierungscommit (eindeutiger Betreff): `fix(spacecraft): regenerate inactive shields every fifteen minutes (sc-AUD-10)`.
Status bleibt `claimed`; Abschluss erst nach dem separaten Prüfpass.

**Umsetzung und Entscheidungen**

- `SpacecraftShieldRegenerationService` wird im Spacecraft-Modul registriert und hat einen eigenen minütlichen Cron. Der persistierte Timer je Schiff bestimmt den Abstand von 15 Minuten; weder Haupttick noch Bauabschlusslauf sind Träger. Mehrere ausgefallene Intervalle werden wie in STU nicht auf einmal nachgeholt.
- Kandidaten werden nach ausgeschalteten Schilden, fehlender Ladung, Lebenszyklus und fälligem JSONB-Timer gefiltert. Unter einer Schreibsperre mit `SKIP LOCKED` werden Zustand, installierte Systeme, Crewzuweisungen und aktive Anomalien erneut gelesen. Erst danach wird ein einzelner Schritt gutgeschrieben und sein Timer gespeichert. Nur Schildladung/Laufzeitzustand werden aktualisiert; keine EPS-Kosten. Ein wiederholter oder zweiter Prozess kann denselben Zeitraum nicht erneut gutschreiben.
- Gemeinsame Regel `getShieldRegenerationRate` in `packages/shared`: ausgeschaltetes vorhandenes Schildsystem, positive Integrität, Crew ≥ benötigter Crew, Ladung unter Maximum, fälliger Timer, keine Schildstörung und kein Ionensturm/Subraumellipse. Zerstörte, im Bau/Abwracken befindliche und administrativ versteckte RPG-Schiffe werden nicht regeneriert. STU `SpacecraftSystem::isHealthy()` bedeutet Integrität > 0, nicht ausschließlich 100 %; dies ist ausdrücklich abgedeckt. Rate `ceil(max / 10)`, gekappt auf fehlende Ladung.
- Liste und Detail verwenden denselben Backend-Adapter und dieselbe gemeinsame Regel mit dem maßgeblichen Crewbestand, Feldeffekten, Anomalien und Timer. Die Detail-DTO erhält `shieldRegeneration`. Der Schiffskopf verwendet diesen Serverwert statt einer eigenen Formel. Ein Zuschlag erscheint nur bei einem positiven, aktuell möglichen und fälligen Gewinn; Texte erklären kostenlose Regeneration alle 15 Minuten. Listendaten laden nun auch die Feldtyp-Effekte.
- Nach erfolgreicher Gutschrift wird der Eigentümer über `SHIELDS_REGENERATED` informiert. Die Liste aktualisiert sich; die Detailseite aktualisiert ausschließlich das betroffene geöffnete Schiff. Irrelevante Ereignisse werden ignoriert.
- Die bisherige Haupttick-Regeneration (2 EPS, kampfrundenbasierte Rate) entfällt.
- Kampf und gemeinsamer Schadenshelfer nutzen den in sc-AUD-08 eingeführten JSONB-Timer `SHIELDS.regenerationStartedAt`. Direkte Schildverluste durch Schildstörung, Subraumellipse und Ionensturm setzen ihn ebenfalls. Der Schadenshelfer kann dieselbe Uhr wie der Ionensturm verwenden.
- Ein Grenztest deckte auf, dass `initializeSpacecraftRuntimeSystems` zusätzliche Metadaten bei Systemen mit Ladungswerten verworfen hatte. `withDefaults` erhält sie jetzt, während aktuelle Ladung/Maximum weiter aktualisiert werden. Damit bleibt der Regenerationstimer über Reads und andere Systemaktionen erhalten.

STU geprüft: ShieldRegeneration, SpacecraftRepository::getSuitableForShieldRegeneration, SpacecraftWrapper::getShieldRegenerationRate, SpacecraftSystemHealthTrait und SpacecraftSystem::isHealthy. Der bereits bestehende Schaden-/Kollapspfad aus sc-AUD-07a/sc-AUD-08 wird weiterverwendet. Keine Schema-Migration erforderlich, da der Timer in bestehendem JSONB liegt.

**Sofort geprüft**

102 Backend-Tests in acht gezielten Dateien erfolgreich:

- `spacecraft-shield-regeneration.service.spec.ts`: Aufrundung/Kappung, positive Integrität, exakte 15-Minuten-Grenze, kein Nachholen, alle Sperrbedingungen, Autoritätsprüfung nach Kandidatenauswahl, wiederholte Läufe, gespeicherter Timer, unveränderte EPS und Erfolgsmeldung erst nach Persistenz.
- `spacecraft-main-tick-shields.spec.ts`: Haupttick erhöht Schilde nicht und zieht keine 2 EPS dafür ab.
- `spacecraft-core-controls.spec.ts`: Liste/Detail liefern identische Rate und unterdrücken sie bei aktiven Schilden, Anomalie oder noch laufendem Timer; bestehende Detail-/Bedienungsfälle.
- `spacecraft-runtime-state.service.spec.ts`: Timer bleibt beim Laden erhalten; bestehende Systemzustände.
- `field-effect-consequence.spec.ts`, `spacecraft-damage.spec.ts`: Schildverluste/-treffer setzen den Timer; bestehende Schadensfälle.
- `spacecraft-resource-flow.service.spec.ts`: bestehende EPS-/Ladungsberechnungen.
- `app-module-graph.spec.ts`: Modulgraph und ORM-Metadaten ohne Datenbankverbindung.

36 Frontend-Tests in `ShipHeaderTable.spec.tsx`, `spacecraft.spec.tsx` und `spacecraft-detail.spec.tsx` erfolgreich: Serverrate, keine erfundene Rate bei fehlendem Wert, Zuschlag nur bei positiver Rate, Texte, selektive Socket-Aktualisierung und bisherige Seitenfälle. Kurzer tatsächlicher Diffreview und Whitespace-Prüfung durchgeführt.

**Ausstehender separater Prüfpass**

1. Abschlussreview der Regenerationsregeln, Timer- und Metadatenerhaltung, Header-/Listenwerte und Cron-Anbindung.
2. `shield-regeneration.int-spec.ts` mit PostgreSQL ausführen: parallele Läufe/Service-Neustart, persistierte Timer, Grenze/Kappung, aktive Anomalien und tatsächliche Crewzuweisungen. Zusätzlich reale Stationen, gesperrte Zeilen und gleichzeitige Schildtreffer/Systemaktionen prüfen.
3. `ion-storm-effects.int-spec.ts`, `ion-storm.int-spec.ts` und `subspace-ellipse.int-spec.ts` für die erweiterten Timer-Resets; weitere Feld-/Kampf-/Haupttick-Integrationen und RPG-Schutz im Sammelpass.
4. Backend/Frontend/Shared-Lint, Typechecks und gemeinsamer Build.
5. Browserprüfung von Liste/Schiffskopf vor/nach Ablauf, Sperrbedingungen, kostenloser Gutschrift und Live-Aktualisierung.

Modellrouting: Regeln, Datenbank-/Cron-Code und Kurzreview direkt im verfügbaren Sitzungsmodell; begrenzte UI-Arbeit an `ticket-coder` (GPT-6 Luna, high) delegiert. Sol-Umschaltung in der laufenden Sitzung nicht verfügbar, Workflow-Fallback dokumentiert. Eine gezielte UI-Ergänzung für Live-Aktualisierung; keine messbaren Tokenzahlen verfügbar.
- 2026-11-18 – Prüfpass (Opus 5.5): Befund behoben (`3ee68c69`): ein fehlerhaftes Schiff brach den Minutenlauf für alle folgenden ab; jetzt je Schiff isoliert und geloggt, mit Test. `shield-regeneration.int-spec.ts` (Fixture-Kollision behoben) grün. Gesamtlauf auf `bd2ea161`: Backend-Unit 2599/2599, Frontend 917/917, PostgreSQL 902/1041 – die 139 Fehlschläge sind identisch mit dem Stand vor allen acht Prüfpass-Tickets (`26ff9e76~1`; überwiegend globale HTTP-403 und `lastReports`-Konstruktorverschiebung aus sc-WP-UI-4), also keine Regression. Build `backend frontend shared` und Lint 0 Fehler. Offen: Browserprüfung – Liste/Schiffskopf vor/nach Ablauf, Sperrbedingungen, Live-Aktualisierung. Status bleibt `claimed`.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
