# Schiffsliste mit Flottengruppen und Einzelschiffen

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** sc-WP-UI-1a, sc-WP-FLEET-1a

## Ziel

Die Schiffsliste gliedert sich wie in STU in je einen Block pro Flotte (Kopfzeile mit Name, Leader, Schiffsanzahl und Flottenaktionen) und einen Block „Einzelschiffe“. Darunter steht ein Formular zum Anlegen einer Flotte aus der Liste.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/View/ShowShiplistFleet`, `Module/Ship/View/ShowShiplistSingles`
- `html/view/shiplist.twig`, `html/shiplistFleetform.twig`, `html/shiplistmacros.twig`

## SWU-Pfade

- `apps/frontend/src/pages/spacecraft.tsx`, `apps/frontend/src/pages/spacecraft.spec.tsx`
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`findAllByUser`, `getUserFleets`)
- `packages/shared/src/lib/spacecraft/index.ts`

## Akzeptanzkriterien

- [ ] Je Flotte eine Box mit Kopf (Name, Leader, Anzahl, Aktionen umbenennen/auflösen) und der Schiffstabelle aus sc-WP-UI-1a; der Leader steht oben und ist markiert.
- [ ] Block „Einzelschiffe“ enthält alle flottenlosen Schiffe.
- [ ] Formular „Neue Flotte“: Name und Leader-Auswahl aus flottenlosen Schiffen.
- [ ] Die Liste lädt mit einem Aufruf (keine N+1-Anfragen je Flotte); Backend-Test für die Gruppierungsdaten falls ein neuer Endpunkt entsteht.
- [ ] Frontend-Test: zwei Flotten und Einzelschiffe werden korrekt gruppiert, Formular legt Flotte an.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
