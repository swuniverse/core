# Wurmlochpassage: Backend-Kern

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1a

## Ziel

Implementiert den isolierten Backend-Kern für Eintritt/Austritt durch ein aktives Wurmloch: Endpunkt, grundlegende Schiffsvalidierung, Access-Policy-Port und deterministisch testbare Ausgangswahl. Atomare Flottenbewegung und Ankunftsintegration folgen in `tmw-K7a2`; Oberfläche/DTO-Integration folgt in `tmw-K7a3`.

## STU-Quellen

- `src/Module/Spacecraft/Action/EnterWormhole/EnterWormhole.php`
- `src/Module/Spacecraft/View/ShowWormholeControl/*`
- `src/Component/Ship/Wormhole/*`
- `src/Orm/Entity/WormholeEntry.php`

## SWU-Pfade

- `apps/backend/src/modules/starmap/wormhole.service.ts` (`findExitsAt`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts`, `spacecraft.controller.ts`
- `WormholeAccessPolicy` (neuer Port; Default erlaubt alles, spätere Zugangsregeln in `tmw-K7b`)

## Akzeptanzkriterien

- [x] Authentifizierter Endpunkt `POST spacecraft/:id/wormhole/enter` (bei mehreren Ausgängen optional `wormholeId`) löst aktives Wurmloch am aktuellen Galaxiefeld auf und bestimmt die Richtung anhand Ein-/Ausgang.
- [x] Es gelten die vorhandenen Validierungen für Eigentum, Standby, Kampf, Zerstörung, Hyperraumflug und Wurmlochverfügbarkeit; erfolgreiche Passage erfordert einen funktionsfähigen Sublight-/Impulsantrieb. Nur wenn dieser inaktiv ist, wird die zugehörige Aktivierungs-EPS des Schiffs abgezogen.
- [x] Passage kostet weder rumpfabhängige Flug-EPS noch Warpdrive; Austritt benötigt keine Antriebsaktivierung und keine Streckenressource.
- [x] `isBidirectional` erlaubt Eintritt vom Ausgang in Gegenrichtung; `isRandomExit` wählt per injizierbarem RNG ein zufälliges passierbares Feld der Zielebene.
- [x] Eine `WormholeAccessPolicy`-Schnittstelle mit standardmäßig erlaubender Implementierung schützt den Kern; `tmw-K7b` kann sie später ersetzen.
- [x] Backend-Tests decken Richtung, mehrere/fehlende/inaktive Wurmlöcher, zufälligen Ausgang und Ablehnungsfälle ab.

## Entscheidung

Wurmlochpassagen folgen dem aktuellen STU-Ressourcenmodell: beim Eintritt ggf. eigene Aktivierungs-EPS des Sublight-Antriebs, beim Austritt keine Ressource; Passage selbst ohne Flug-EPS und Warpdrive. `isRandomExit` ist eine SWU-Funktion und verwendet injizierbaren RNG. Die Policy erlaubt im Default alle Schiffe.

## Comments

- 2026-11-06: Aus `tmw-K7a` als erster von drei geordneten Teilaufträgen extrahiert. Flottenatomik/Ankunftsfolgen und Frontend sind bewusst separat.
- 2026-11-09: Sicherer Backend-Kern als interner, nicht mutierender Planer vorbereitet. Kein öffentlicher Passage-Endpunkt ist registriert und keine Position, Antriebsaktivierung oder EPS wird persistiert. Endpunktaktivierung und tatsächliche Mutation bleiben bis zur atomaren Flotten-/Ankunftsintegration in `tmw-K7a2` und gemeinsamer Backend-Abnahme offen; alle Kriterien bleiben ungeprüft. Die vorhandene SWU-Impulsaktivierung berechnet aktuell keine EPS; der Planer unterstützt einen je Schiff gelieferten Aktivierungskostenwert, ohne einen neuen Tarif zu erfinden.
- 2026-11-09: Gemeinsame lokale Backend-Abnahme mit der vollständigen atomaren K7a2-Integration abgeschlossen. Der authentifizierte Endpunkt ist jetzt mit realer produktiver AppModule-/TypeORM-/JWT-/ValidationPipe-Verdrahtung registriert. Lokales aktives Wurmloch, optionale positive Ganzzahl-Auswahl, ENTRY/bidirektionales EXIT, komplette passierbare Zufallszielebene, Default-Allow-Policy und injizierbarer RNG sind implementiert. Policy-Prüfungen erhalten abgetrennte tief unveränderliche hydrierte Snapshots; Origin/Ziel werden nach Await erneut geprüft. Jeder ENTRY-Teilnehmer benötigt seinen funktionsfähigen Impulsantrieb und trägt nur seine eigene normale Aktivierung (aktuell 0 EPS); EXIT benötigt keine Aktivierung, Passage keinen Flug-/Warp-Tarif. Reale Service-/HTTP-Tests belegen Erfolg, Authentifizierung, Auswahl-/Richtungs-/Validierungsfälle und atomaren Rollback. Finale Gates: 213 Unit-Suites/1993 Tests sowie 40 PostgreSQL-Suites/398 Tests ohne Skips; erzwungene Spec-Typprüfung/Lint erfolgreich. Build einmal erfolgreich vor zwei begrenzten finalen Korrekturen; kein erneuter Build des korrigierten Stands. Vollständiger Nachweis: `.workmux/tmw-K7a2-resumed-atomic-report-20261109.md`. `resolved` bezeichnet Implementierung und lokale Backend-Abnahme; unabhängiger Review und serielle Integration sind noch ausstehend. Shared-/Frontend-Arbeit bleibt ausschließlich K7a3.
