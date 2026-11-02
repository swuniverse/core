# Bojen setzen, analysieren und aufnehmen

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Wie in STU setzt ein Schiff eine Boje mit Text auf seinem Feld, andere lesen sie per Analyse, der Eigentümer nimmt sie wieder auf. Der Sektor-Scan füllt `buoys`.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/{DropBuoy,TakeBuoy}`, `Module/Spacecraft/View/ShowAnalyseBuoy`, `Module/Ship/View/ShowBuoyList`
- `Orm/Entity/Buoy.php`, `html/ship/analysebuoy.twig`

## SWU-Pfade

- neue Entity `apps/backend/src/modules/spacecraft/entities/buoy.entity.ts`, Migration
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (`buoys: []`), `spacecraft.controller.ts`
- `apps/frontend/src/components/spacecraft/SensorOperationsPanel.tsx`, `FieldContextPanel.tsx`

## Akzeptanzkriterien

- [ ] Boje setzen erfordert eine gesunde Torpedorampe, deaktivierte Tarnung/Schilde, keinen Warpzustand, 1 EPS und eine Ware ID 88 `Sondenboje`; maximal 16 aktive Bojen pro Spieler, Text nicht leer und höchstens 60 Zeichen. Eine Liste zeigt die eigenen Bojen.
- [ ] Forschung 500400 schaltet ein normales Fertigungsrezept für Ware 88 frei; dessen Kosten folgen der etablierten niedrigstufigen Fertigungsökonomie und werden als Spieldaten statt als Servicekonstante modelliert.
- [ ] Bojen am Feld erscheinen im Sektor-Scan und im Feldkontext; Analyse zeigt Text, Eigentümer und SWU-Erstellungsdatum.
- [ ] Jedes gleichzeitig am Feld befindliche eigene oder fremde Schiff darf eine Boje für 1 EPS aufnehmen, erhält eine Ware ID 88 zurück und löscht die Boje atomar. Bei Fremdaufnahme erhält der Eigentümer eine Schiffsordnernachricht mit Text, aufnehmendem Schiff und Sektor.
- [ ] Backend-Tests decken Setzbedingungen, Waren-/EPS-Verbrauch, Limit/Textgrenzen, Lesen, eigene und fremde Aufnahme, Warenrückgabe und Eigentümerbenachrichtigung ab; Frontend-Test deckt Anzeige und Aktionen ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

SWU übernimmt die vollständige STU-Laufzeitregel mit der bereits vorhandenen Ware ID 88 `Sondenboje` und Forschung 500400. Setzen und Aufnehmen kosten jeweils 1 EPS; Setzen verbraucht und Aufnehmen erstattet genau eine Sondenboje. Fremde Schiffe dürfen Bojen am selben Feld aufnehmen und lösen eine Eigentümerbenachrichtigung aus. Forschung 500400 schaltet ein datengetriebenes normales Fertigungsrezept frei. Das SWU-Erstellungsdatum ist eine bewusste kleine Erweiterung gegenüber der untersuchten STU-Entity.

## Comments

- 2026-10-29: Blockiert durch fehlende Produktentscheidung: STU setzt Bojen nur mit gesunder Torpedorampe, 1 EPS und einer Ware „Boje“, erlaubt höchstens 16 eigene Bojen und begrenzt den Text auf 60 Zeichen. In SWU existieren weder eine kanonische Bojen-Waren-ID noch eine festgelegte Kosten-/Rückgabe-Regel. Soll eine neue Ware „Boje“ eingeführt werden (bitte ID und Herstellungs-/Bezugsweg festlegen), oder sollen Bojen vorerst nur 1 EPS ohne Warenverbrauch kosten? Zusätzlich widerspricht das Akzeptanzkriterium „Nur der Eigentümer nimmt die Boje auf“ dem STU-Verhalten, das auch Fremdaufnahme mit Eigentümerbenachrichtigung erlaubt; bitte bestätigen, dass SWU bewusst eigentümerexklusiv bleiben soll.
- 2026-10-30 Product Owner: Option 1. Vollständige STU-Regel mit der bereits in SWU vorhandenen Ware ID 88 `Sondenboje` und Forschung 500400. Gesunde Torpedorampe, kein Tarn-/Warpzustand und keine aktiven Schilde, 1 EPS plus eine Ware beim Setzen, maximal 16 aktive Bojen und 1–60 Zeichen. Jedes Schiff am Feld darf für 1 EPS aufnehmen, erhält die Ware zurück und bei Fremdaufnahme wird der Eigentümer benachrichtigt. Forschung 500400 schaltet ein normales datengetriebenes Fertigungsrezept frei.
