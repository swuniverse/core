# Forschungsabschluss: Meldung und Echtzeit-Ereignis

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Schließt ein Spieler eine Forschung ab, erfährt er das in SWU nur durch einen Blick in die Forschungsseite. STU schickt eine Nachricht „Forschung 'X' wurde abgeschlossen“ in den Kolonie-Ordner. Das Nachrichtenordner-System aus `.scratch/events-and-message-folders` ist umgesetzt; dieses Issue hängt den Forschungsabschluss daran und ergänzt ein WS-Ereignis für Header und Forschungsseite.

## STU-Quellen

- `src/Module/Research/ResearchState.php::finish` (PM von `USER_NOONE`, Ordner `SPECIAL_COLONY`)

## SWU-Pfade

- `apps/backend/src/modules/research/research.service.ts` (`processTick`, Statuswechsel auf COMPLETED)
- `apps/backend/src/modules/messaging/messaging.service.ts`, `message-folder.ts` (`MessageFolder.COLONY`), `colony-event.service.ts`
- `apps/backend/src/modules/websocket/*`
- `apps/frontend/src/pages/research.tsx`, `apps/frontend/src/components/layout/header.tsx` (Forschungs-Widget)

## Akzeptanzkriterien

- [x] Beim Abschluss einer Forschung entsteht genau eine Nachricht „Forschung '<Name>' wurde abgeschlossen“ im Ordner „Kolonien“ des Spielers.
- [x] Ein WS-Ereignis (z. B. `RESEARCH_COMPLETED` mit Tech-ID und Name) wird an den Spieler gesendet; Forschungsseite und Header-Widget aktualisieren sich ohne Neuladen.
- [x] Startet automatisch die nächste Forschung aus der Queue, bleibt das Verhalten unverändert.
- [x] Backend-Tests: Nachricht und Ereignis bei Abschluss, keine Nachricht ohne Abschluss, keine Doppelmeldung bei wiederholtem Tick.
- [x] Frontend-Test: Ereignis löst Aktualisierung der Forschungsansicht aus.

## Comments

- Forschungsabschlüsse erzeugen jetzt idempotente Nachrichten im Kolonie-Ordner und `RESEARCH_COMPLETED` für Forschungsseite und Header. Queue-Fortsetzung bleibt unverändert; Backend- und Frontend-Tests decken Abschluss, Nicht-Abschluss, Wiederholung und Live-Aktualisierung ab. Keine offenen Folgepunkte.
