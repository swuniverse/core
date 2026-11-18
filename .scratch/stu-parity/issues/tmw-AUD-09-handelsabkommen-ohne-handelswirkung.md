# Handelsabkommen ohne Handelswirkung wie STU

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

In STU hat ein Handelsabkommen (`AllianceRelationTypeEnum::TRADE`) keine Handelswirkung: kein Lizenzrabatt, keine kostenlose Lizenz, kein `tradeModifier`. Es wirkt nur über die Beziehungsrechte; „Als Freund behandeln“ ist bei Handel, Freundschaft, Vasall und Bündnis wählbar. SWU gibt Partnern eines Handelsabkommens am Spielerposten des Eigentümers die Lizenz kostenlos (tmw-T13, `mayTradeFavorably`, `TradeAgreementPolicy`). Das entfällt.

- Lizenzkauf und -verlängerung kosten für alle den Postenpreis; die Zahlart `agreement` entfällt.
- `mayTradeFavorably` wird aus der Beziehungsauflösung entfernt.
- `freeByAgreement` entfällt aus `TradeLicenseMenuDto` und der Oberfläche.
- `tradeModifier` bleibt entfernt.
- Die Freund-Berechtigung (`treatAsFriend`) beim Handelsabkommen bleibt unverändert (entspricht STU `RelationPermissionEnum::FRIENDLY`).

## STU-Quellen

- `src/Component/Alliance/Enum/AllianceRelationTypeEnum.php`
- `src/Component/Alliance/Enum/RelationPermissionEnum.php` (Z. 9–33: `FRIENDLY` bei TRADE/FRIENDS/VASSAL/ALLIED)
- `src/Module/Ship/Action/BuyTradeLicense/BuyTradeLicense.php`, `src/Module/Trade/Action/RenewTradeLicense/` (kein Rabatt)

## SWU-Pfade

- `apps/backend/src/modules/trade/trade-agreement.policy.ts` (entfernen)
- `apps/backend/src/modules/trade/trade-license-purchase.service.ts` (Z. 15–22, 41, 77–79, 128, 151, 280: `agreement`-Zweig)
- `apps/backend/src/modules/trade/trade-license-menu.service.ts` (`freeByAgreement`), `trade.module.ts`
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts` (Z. 43, 350–365, 408–428: `mayTradeFavorably`)
- `apps/backend/src/modules/alliance/alliance.service.ts` (Z. 170–199 `RELATIONSHIP_PERMISSIONS`: unverändert lassen)
- `packages/shared/src/lib/trade/index.ts` (`TradeLicenseMenuDto.freeByAgreement` Z. 86)
- `apps/frontend/src/components/trade/TradeLicensePanel.tsx` (Z. 93–94, 126–139, 203)
- Tests: `apps/backend/src/testing/integration/trade-agreement-license.int-spec.ts` (entfernen bzw. in Negativtest umwandeln), `trade-license-purchase.int-spec.ts`, `trade-license-lifecycle.int-spec.ts`, `trade-license-menu.int-spec.ts`, `player-trade-post*.int-spec.ts`, `relationship-resolver.service.spec.ts`

## Akzeptanzkriterien

- [ ] Kein Code-Pfad vergibt oder verlängert Lizenzen kostenlos; `POST trade/posts/:id/licenses` mit `method: 'agreement'` liefert 400.
- [ ] `mayTradeFavorably`, `TradeAgreementPolicy` und `freeByAgreement` sind entfernt; keine verwaisten Referenzen.
- [ ] „Als Freund behandeln“ beim Handelsabkommen funktioniert weiter.
- [ ] Bereits kostenlos erworbene Lizenzen bleiben bis zum Ablauf gültig (keine Migration); Verlängerung kostet regulär.
- [ ] Backend-Tests: Partner zahlt regulär (Kauf und Verlängerung), `agreement` abgelehnt, Freund-Recht bei Handelsabkommen unverändert. Frontend-Test: kein Hinweis „kostenlos“, Zahlung per Konto/Schiff angeboten.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt L1 „Handelsabkommen (tmw-T13) – PO: wie STU“ und N2 „Handelsabkommen = kostenlose Lizenz → keine Handelswirkung, nur Freund-Recht“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Bewusste/entschiedene Abweichungen“ (Handelsabkommen).
- PO-Entscheidung L1 vom 2026-11-17: wie STU.
- Ersetzt die `map.md`-Entscheidung „2026-10-21 – tmw-T13 – Option 1a, 2b: Handelsabkommen = kostenlose Lizenz am Spielerposten des Partners“ (der Teil 2b „tradeModifier entfernt“ bleibt). Der Eintrag in `map.md` wird bei Umsetzung als ersetzt markiert.

## Comments
