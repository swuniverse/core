# Warenkonto ↔ Schiff (Handelsmenü am Posten)

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T2d

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

- [x] `POST spacecraft/:id/trade/:postId/to-account` und `.../from-account` mit Warenliste `{commodityId, amount}[]` prüfen Anwesenheit per Feld-Kopräsenz (`TradePostPresencePolicy.isAt`, kein Docking), Lizenz, Beambarkeit bzw. Handelbarkeit, Kontoplatz bzw. Frachtraum und Energie (nach `transfer-cost.ts`). Gebucht wird transaktional und gekürzt auf das Mögliche, mit einer Ergebnisliste wie in STU.
- [x] Ohne Lizenz zeigt das Handelsmenü nur „Lizenz kaufen“ aus tmw-T2.
- [x] Im Schiffsdetail erscheint „Handelsmenü“ nur bei erfüllter Kopräsenz. Es zeigt Frachtraum und Konto nebeneinander mit Mengenfeldern und den Knöpfen „ins Konto“ bzw. „aufs Schiff“, im Layout wie `TransferDialog`.
- [x] Nach dem Transfer aktualisieren sich die Warenübersicht (tmw-D1) und die Handelsseite.
- [x] Backend-Tests: alle Ablehnungsfälle, Kürzung auf Platz bzw. Bestand, Energieabzug, Nebenläufigkeit (zwei parallele Transfers überbuchen nicht). Frontend-Tests: Menü sichtbar bzw. unsichtbar, Transfer ruft die API mit den richtigen Mengen auf.

## Entscheidung

Vorgabe: Variante (a), Feld-Kopräsenz wie STU über `TradePostPresencePolicy.isAt` aus tmw-T2 (gleiche `SpaceLocation`, nicht im Flug, nicht getarnt). Kein Docking, keine Abhängigkeit von sc-WP-STAT-3a; gilt für NPC- und Spielerposten gleichermaßen.

## Comments

- 2026-10-21 Product Owner: Option a – Der Kontotransfer verlangt wie in STU nur Feld-Kopräsenz: Das Schiff steht am selben Ort wie der Posten; Docking ist nicht nötig.
- 2026-10-30 Agent: Blockiert durch die bestehende Backend-Testbaseline. Zwei ernsthafte Läufe von `npx nx affected -t lint typecheck test --base=HEAD` enden unabhängig von tmw-T3 mit `spacecraft-fleet.service.spec.ts` (`Not enough EPS for navigation`) und `spacecraft-core-controls.spec.ts` (`this.shipRepo.findOneBy is not a function`); 192 von 194 Suites bestehen. Die fokussierten tmw-T3-Backend- und Frontend-Tests, Typechecks, Lints sowie `npx nx run-many --targets=build` waren grün. Gemäß Abbruchregel wurden sämtliche tmw-T3-Produktcodeänderungen verworfen. Fortsetzung nach Reparatur bzw. Freigabe dieser Testbaseline.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Flotten- und Core-Controls-Testbaseline); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-09: Der Tracking-Split tmw-T2 ersetzt keine Umsetzung: das geforderte Kaufmenü setzt tmw-T2d voraus; Kauf, Gültigkeit und Presence-Policy folgen transitiv.
- 2026-11-12: Umgesetzt.
  - Backend: `TradeAccountTransferService` mit `TradeShipController` (`GET spacecraft/:id/trade/:postId`, `POST …/to-account`, `POST …/from-account`, Body = Warenliste `{ commodityId, amount }[]`). Eine Transaktion mit Sperren auf Posten, Schiff und den beteiligten Fracht- und Kontozeilen; Anwesenheit per `TradePostPresencePolicy` (Feld-Kopräsenz, kein Docking, nicht im Flug, kein aktiver Hyperantrieb, nicht getarnt), gültige Lizenz (`expiresAt > jetzt`). Ganze Anfrage abgelehnt wie STU bei: Konto voll, leerer Frachtraum (ins Konto), voller Frachtraum (aufs Schiff), leere/ungültige Warenliste. Je Zeile `min(Wunsch, Bestand, freier Platz, Energiebudget)` mit Hinweis bei Kürzung oder Ablehnung; ins Konto nur handelbare, aufs Schiff nur beambare Waren. Kontoplatz zählt reservierte Angebotsmengen mit (`TradeStorageService.capacityIn`).
  - Abweichung von STU nach Akzeptanzkriterium: Der Kontotransfer kostet wie andere Transfers Schiffsenergie nach `transfer-cost.ts` (1 EPS je 5 Waren, aufgerundet); die Mengen werden auf das Energiebudget gekürzt. STU verlangt für Kontotransfers keine Energie.
  - Frontend: „Handelsmenü“ im Schiffsdetail (`TradePostEntry`) erscheint nur bei erfüllter Kopräsenz und öffnet `TradeMenuDialog` im Layout von `TransferDialog`: Frachtraum und Warenkonto nebeneinander mit Mengenfeldern und „ins Konto“ bzw. „aufs Schiff“, Ergebnisliste mit Kürzungshinweisen, Fehleranzeige. Ohne Lizenz zeigt der Dialog nur den Lizenzkauf aus `tmw-T2d` und wechselt danach in die Transferansicht. Daneben bleibt der Link „Posteninfo“. Nach einem Transfer lädt das Schiffsdetail Schiff und Lager neu; Handelsseite und Warenübersicht laden ihre Daten beim Öffnen frisch.
  - Prüfungen: `trade-account-transfer.int-spec.ts` (7 Tests: beide Richtungen, Kürzung auf Konto, Frachtraum und Energie, Waren-Filter, alle Ablehnungsfälle ohne Seiteneffekte, Nebenläufigkeit ohne Überbuchung, Lesemodell); Mutationsprobe (Energiekürzung entfernt) lässt den Energietest scheitern. Frontend `TradeMenuDialog.spec.tsx` (Spalten, Transfer mit Mengen, Kürzungshinweis, Fehler, nur Lizenzkauf ohne Lizenz, Ablehnungsgrund) und `TradePostEntry.spec.tsx`. Alle Handels-Integrationssuiten und App-Boot 5/31 grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2028/2028; Frontend 704/704.
