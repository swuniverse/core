# Traktor-Symbol in der NBS-Liste und Aktivierungsmeldungen wie STU

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-TRACT-1c

## Ziel

STU zeigt das Traktor-Symbol in der NBS-Liste nach einer Zielregel und meldet Gründe der Quelle erst beim Klick, z. B. „Antares: System Traktorstrahl konnte nicht aktiviert werden, weil die Schilde aktiviert sind“. SWU blendete das Symbol bei eigenen Schilden, Urlaub, gehaltenen Schiffen und eigenem Hyperantrieb aus; der Spieler sah keinen Grund.

## STU-Quellen

- `src/html/shipmacros.twig` Z. 279 (`nbsItem.isTractorbeamPossible and not SPACECRAFT.isTractoring`)
- `src/Component/Spacecraft/System/Type/TractorBeamShipSystem.php` (`isTractorBeamPossible`: Ziel keine Station, nicht getarnt, nicht geschildet, nicht im Warp; `checkActivationConditions`: Quelle Tarnung, Schilde, angedockt, selbst gehalten)
- `src/Component/Spacecraft/System/Control/SystemActivation.php` Z. 66 (Meldungsformat)
- `src/Module/Spacecraft/Action/ActivateTractorBeam/ActivateTractorBeam.php`

## Akzeptanzkriterien

- [x] NBS-Flag `tractor`: Ziel ist Schiff, nicht getarnt, nicht geschildet, nicht im Hyperraum; Quelle zieht nichts und hat das System.
- [x] Aktivierung meldet Quellgründe im STU-Format `<Schiff>: System Traktorstrahl konnte nicht aktiviert werden, weil …` für Tarnung, Schilde, angedockt, selbst gehalten (neu: Tarnung und angedockt).
- [x] Unit-Tests für die vier Meldungen.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

Commit: `fix(spacecraft): STU tractor icon rule and activation messages (stu-parity sc-WP-TRACT-1d)`

- Abweichung von STU bewusst: Das Symbol erscheint nur, wenn die Quelle das System hat (Shuttles und Workbees haben keins).
- Urlaubs- und Zielmeldungen unverändert.
- Checks: Jest `spacecraft`, `combat`, `alert-reaction` (83 Suites, 927 Tests) ✓; PostgreSQL-Integrationstests mit Traktorbezug (10 Suites, 256 Tests) ✓; `nx typecheck backend` ✓.
- Modell: Claude Opus 5.5 direkt.
- Ausstehend: gesammelter Verifikationslauf.

### 2026-11-23 — Nachtrag: Internal Server Error beim Aktivieren behoben

Commit: `fix(spacecraft): lock only spacecraft rows for tractor actions (stu-parity sc-WP-TRACT-1d)`

- Ursache: `lock()` und der Fluchtversuch luden `modules` und `user` per LEFT JOIN mit `FOR UPDATE`; Postgres meldet „FOR UPDATE cannot be applied to the nullable side of an outer join“ → HTTP 500. Der Fehler bestand seit sc-WP-TRACT-1a, war aber ohne Traktorsystem nie erreichbar; die Unit-Tests mocken die Datenbank.
- Fix: Sperre nur auf `spacecraft` (`tables: ['spacecraft']`), wie in `ship-colony-context.service.ts`.
- Neu: `spacecraft-tractor.int-spec.ts` (PostgreSQL): Erfassen, Fluchtversuch, Schild-Meldung der Quelle. Erfassen und Schild-Meldung vor dem Fix rot reproduziert, danach 3/3 grün; Unit 23/23; `nx typecheck backend` ✓.
- Gleiches Sperrmuster ohne Tabelleneinschränkung noch in `holonet.service.ts`, `spacecraft-boarding.service.ts`, `spacecraft-takeover.service.ts` — nicht geprüft, separat klären.

### 2026-11-23 — Nachtrag: Mitschleppen im Galaxie-Flug

Commit: `fix(spacecraft): tow tractored ship on galaxy flight (stu-parity sc-WP-TRACT-1d)`

- Ursache: Das Mitschleppen (sc-WP-TRACT-1a) war nur in `navigate` (Systemflug) umgesetzt. Im freien Raum ruft die UI `/fly` → `flyGalaxy` auf; dort fehlte es, das gezogene Schiff blieb stehen.
- Fix: Vorbereitung (Ziel laden, Abriss bei EPS-Mangel, Flugkosten inkl. Ziel) in `prepareTowing` ausgelagert und in `navigate` und `flyGalaxy` genutzt; `flyGalaxy` setzt das gezogene Schiff bei jedem Feld mit und beendet dessen Orbitbefehl wie `navigate`.
- Test: neuer Unit-Test in `spacecraft-movement-resources.spec.ts`, ohne Fix rot, mit Fix grün (20/20). Jest `spacecraft`, `combat`, `alert-reaction` 928/928; PostgreSQL Traktor, Bewegung, Navicomputer, Wurmloch, Anomalie 128/128; `nx typecheck backend` ✓.
- Offen, nicht geprüft: (1) `prepareTowing` lädt das Ziel mit `findOne(id, userId)` – fremde gezogene Schiffe (sc-WP-TRACT-1b) würden den Flug mit „nicht gefunden“ abbrechen; (2) Systemein- und -austritt sowie Wurmlochpassage nehmen das gezogene Schiff vermutlich nicht mit.
