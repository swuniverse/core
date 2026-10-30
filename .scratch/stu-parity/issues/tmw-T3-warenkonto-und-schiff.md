# Warenkonto ↔ Schiff (Handelsmenü am Posten)

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T2

## Ziel

Steht ein eigenes Schiff an einem Handelsposten und hat der Spieler dort eine Lizenz, kann er im Handelsmenü Waren vom Frachtraum ins Warenkonto übertragen und zurück. Dabei gelten Kontolimit, Beambarkeit und Transferregeln. Offen ist, ob dafür das Feld genügt (Kopräsenz) oder ob das Schiff angedockt sein muss.

## STU-Quellen

- `src/Module/Spacecraft/Action/TransferToAccount/*`: Posten am selben Ort (`checkPosition`), nicht getarnt, nicht im Warp, Lizenz nötig, Konto nicht voll, nicht beambare Ware abgelehnt, Menge = min(Wunsch, Bestand, freier Platz).
- `src/Module/Spacecraft/Action/TransferFromAccount/*`
- `src/Module/Spacecraft/View/ShowTradeMenu/*`, `ShowTradeMenuTransfer/*`, `src/html/spacecraft/trademenu*.twig`
- In STU genügt der gleiche Ort, ein Andocken ist für den Kontotransfer nicht nötig.

## SWU-Pfade

- `TradePostStorageService`, `TradePostPresencePolicy` aus tmw-T1/T2
- `apps/backend/src/modules/spacecraft/transfer.service.ts`, `transfer-cost.ts` (Transferenergie), `entities/cargo-item.entity.ts`
- Waren-Flags (`isBeamable`/`isTradeable`): col-F2, falls vorhanden, sonst `isTradeOnly` aus `game-data.service.ts`
- Frontend: `apps/frontend/src/pages/spacecraft-detail.tsx`, `apps/frontend/src/components/spacecraft/TransferDialog.tsx`, `CargoPanel.tsx`, `ship-action-registry.ts`

## Akzeptanzkriterien

- [ ] `POST spacecraft/:id/trade/:postId/to-account` und `.../from-account` mit Warenliste `{commodityId, amount}[]` prüfen Anwesenheit per Feld-Kopräsenz (`TradePostPresencePolicy.isAt`, kein Docking), Lizenz, Beambarkeit bzw. Handelbarkeit, Kontoplatz bzw. Frachtraum und Energie (nach `transfer-cost.ts`). Gebucht wird transaktional und gekürzt auf das Mögliche, mit einer Ergebnisliste wie in STU.
- [ ] Ohne Lizenz zeigt das Handelsmenü nur „Lizenz kaufen“ aus tmw-T2.
- [ ] Im Schiffsdetail erscheint „Handelsmenü“ nur bei erfüllter Kopräsenz. Es zeigt Frachtraum und Konto nebeneinander mit Mengenfeldern und den Knöpfen „ins Konto“ bzw. „aufs Schiff“, im Layout wie `TransferDialog`.
- [ ] Nach dem Transfer aktualisieren sich die Warenübersicht (tmw-D1) und die Handelsseite.
- [ ] Backend-Tests: alle Ablehnungsfälle, Kürzung auf Platz bzw. Bestand, Energieabzug, Nebenläufigkeit (zwei parallele Transfers überbuchen nicht). Frontend-Tests: Menü sichtbar bzw. unsichtbar, Transfer ruft die API mit den richtigen Mengen auf.

## Entscheidung

Vorgabe: Variante (a), Feld-Kopräsenz wie STU über `TradePostPresencePolicy.isAt` aus tmw-T2 (gleiche `SpaceLocation`, nicht im Flug, nicht getarnt). Kein Docking, keine Abhängigkeit von sc-WP-STAT-3a; gilt für NPC- und Spielerposten gleichermaßen.

## Comments

- 2026-10-21 Product Owner: Option a – Der Kontotransfer verlangt wie in STU nur Feld-Kopräsenz: Das Schiff steht am selben Ort wie der Posten; Docking ist nicht nötig.
