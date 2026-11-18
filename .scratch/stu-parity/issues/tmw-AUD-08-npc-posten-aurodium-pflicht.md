# NPC-Posten: Angebot verlangt Aurodium, wenn kein Aurodium angeboten wird

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

An NPC-Handelsposten erlaubt STU beim Erstellen eines Angebots als Gegenware nur Latinum, außer der Spieler bietet selbst Latinum an; dann ist jede handelbare Ware wählbar. In SWU (Latinum = Aurodium, Ware 50) gibt es diese Regel nicht: `getOptions` bietet jede handelbare Ware an, und `validate` prüft nichts dergleichen.

STU erzwingt die Regel nur in der Oberfläche (`newOffer.twig`). SWU setzt sie in Oberfläche **und** Server durch, damit sie nicht über die API umgangen werden kann.

- NPC-Posten = Eigentümer ist ein NPC-Konto (`isNpc`).
- Angebotene Ware ≠ Aurodium → verlangte Ware muss Aurodium sein.
- Angebotene Ware = Aurodium → jede handelbare Ware außer Aurodium selbst.
- Spielerposten und verlassene Posten: unverändert.

## STU-Quellen

- `src/Module/Trade/View/ShowOfferMenuNewOffer/ShowOfferMenuNewOffer.php` (Z. 43–44 `IS_LATINUM`, `IS_NPC_POST`)
- `src/html/trade/newOfferMenu/newOffer.twig` (Z. 2–42: an NPC-Posten ohne Latinum nur `wgid = 50`)
- `src/Module/Trade/Action/CreateOffer/CreateOffer.php`

## SWU-Pfade

- `apps/backend/src/modules/trade/trade-offer.service.ts` (`getOptions` Z. 117, `validate`, `create`)
- `apps/backend/src/modules/trade/basic-trade.service.ts` (`AURODIUM_COMMODITY_ID = 50`)
- `packages/shared/src/lib/trade/index.ts` (`TradeOfferOptionsDto` Z. 212: um `isNpcPost` ergänzen)
- `apps/frontend/src/components/trade/TradeOffersTab.tsx` (`NewOfferDialog`)
- Tests: `apps/backend/src/testing/integration/trade-offer.int-spec.ts`, `apps/frontend/src/components/trade/TradeOffersTab.spec.tsx`

## Akzeptanzkriterien

- [ ] `GET trade/posts/:id/offer-options` liefert `isNpcPost`; der Dialog bietet an NPC-Posten bei Nicht-Aurodium-Angebot nur Aurodium als Gegenware an (fest gesetzt, mit Icon wie STU).
- [ ] `POST trade/posts/:id/offers` lehnt an NPC-Posten ein Angebot ohne Aurodium auf beiden Seiten mit verständlicher deutscher Meldung ab.
- [ ] Spielerposten bleiben unverändert.
- [ ] Bestehende Angebote bleiben gültig (keine Migration).
- [ ] Backend-Tests: NPC-Posten Ware→Ware abgelehnt, Ware→Aurodium erlaubt, Aurodium→Ware erlaubt, Spielerposten Ware→Ware erlaubt. Frontend-Test: Gegenware an NPC-Posten fest auf Aurodium, beim Wechsel der angebotenen Ware auf Aurodium wieder frei.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt B9 „NPC-Posten: STU-Regel ‚Latinum verlangen, wenn kein Latinum angeboten‘ fehlt“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) Seitenabgleich `tradeOfferMenu.twig`/`newOffer.twig` und Kleine Abweichungen „NPC-Posten-Angebotsregel“.
- tmw-T4a ist `resolved` mit „Es gelten alle STU-Regeln“; diese Regel fehlt.
- Serverseitige Durchsetzung ist eine bewusste Härtung gegenüber STU (dort nur UI); sie ändert das Spielergebnis nicht.

## Comments
