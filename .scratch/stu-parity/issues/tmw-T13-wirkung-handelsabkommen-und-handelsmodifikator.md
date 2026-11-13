# Wirkung des Handelsabkommens und des Fraktions-Handelsmodifikators

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T2b, tmw-T7a

## Ziel

Der Beziehungstyp „Handelsabkommen“ (`TRADE_AGREEMENT`) und der Fraktionswert `tradeModifier` existieren in SWU, werden aber nirgends gelesen. Dieses Issue gibt ihnen eine Wirkung im Handel, über eine neue Fähigkeit der zentralen Beziehungsauflösung, statt den Beziehungstyp direkt auszuwerten. STU bindet Handelsabkommen nicht an Handelsregeln, die Wirkung wäre also eine SWU-Erweiterung.

## STU-Quellen

- STU-Allianzbeziehungen (`src/Component/Alliance/Enum/AllianceRelationTypeEnum.php`): Der Handelsvertrag hat keine Handelswirkung (nicht vollständig verifiziert).
- `src/Module/Trade/Action/*` (Lizenzpreise, Basishandel) als Ansatzpunkte

## SWU-Pfade

- `apps/backend/src/modules/alliance/relationship-resolver.service.ts` (`ResolvedStance`, Capabilities), `packages/shared/src/lib/alliance/index.ts` (`TRADE_AGREEMENT`), `docs/alliance-relationship-effects.md`, `.scratch/alliance-stu-parity/beziehungswirkungen-spec.md`
- `apps/backend/src/modules/faction/faction.service.ts` (`tradeModifier: 1` für beide Fraktionen), `entities/faction-modifier.entity.ts`
- Lizenzkauf (tmw-T2), Basishandel (tmw-T7a)

## Akzeptanzkriterien

- [x] Die Auflösung liefert eine neue Fähigkeit (z. B. `mayTradeFavorably`), dokumentiert in `docs/alliance-relationship-effects.md`.
- [x] Am Spielerposten erhält ein Partner mit aktivem Handelsabkommen die Lizenz kostenlos; die Wirkung greift nur bei aktiver Beziehung. Fehler der Auflösung führen geschlossen zu keiner Vergünstigung. NPC-Posten sind nicht betroffen.
- [x] `tradeModifier` wird aus Entity, Seed (`DEFAULT_FACTIONS`), DTOs und Admin-Oberfläche entfernt (Migration); `docs/faction-modifiers.md` vermerkt die Entfernung.
- [x] Backend-Tests: mit und ohne Abkommen, Fehlerfall der Auflösung, Modifikator entfernt.

## Entscheidung

Vorgabe:
1. Handelsabkommen (a): Partner (Allianzmitglieder bzw. Siedler mit aktivem Handelsabkommen) erhalten am Spielerposten des Eigentümers die Lizenz kostenlos (Empfehlung übernommen: kostenlos statt Rabatt). Keine Wirkung auf Shoutbox oder netzübergreifende Transfers.
2. `tradeModifier` (b): Das Feld wird entfernt. Diese spezielle Entscheidung geht der allgemeinen Option 2a in tmw-FA1b vor.

## Comments

- 2026-10-21 Product Owner: Option 1a, 2b – Handelsabkommen-Partner erhalten am Spielerposten des Eigentümers die Lizenz kostenlos (1a); `tradeModifier` wird entfernt (2b).
- 2026-11-09: Die Vergünstigung erweitert den transaktionalen Lizenzkauf tmw-T2b; kein Frontend-Split als Voraussetzung erfunden.
- 2026-11-13: Umgesetzt.
  - Beziehungsauflösung: neue Fähigkeit `mayTradeFavorably`, genau bei aktivem `TRADE_AGREEMENT` zwischen den Parteien beider Spieler (Allianz oder Siedler), auch bei Freund-Behandlung; Mitglieder derselben Allianz, andere Beziehungstypen, Krieg und persönlicher Feindkontakt erhalten sie nicht; Fehler ergeben wie bisher Neutral ohne Fähigkeit. Dokumentiert in `docs/alliance-relationship-effects.md`.
  - Handel: `TradeAgreementPolicy` wertet die Fähigkeit für Lizenzen aus (nie am eigenen oder an NPC-Posten, Fehler → regulärer Preis). Lizenzkauf und -verlängerung (`tmw-T2b`/`T2c`) buchen für Partner weder Zahlung noch Gutschrift; neue Zahlart `agreement` für Partner ohne Zahlquelle, Verlängerung ohne Warenkonto; Eigentümer erhält „über das Handelsabkommen … erhalten“. Lizenzmenü meldet `freeByAgreement`; das Lizenzpanel zeigt „Für dich kostenlos“ und Knöpfe „Lizenz kostenlos erhalten/verlängern“. Basishandel, Shoutbox und netzübergreifende Transfers unverändert.
  - `tradeModifier` per Migration `20261113110000-drop-faction-trade-modifier` aus `faction_modifiers` entfernt, ebenso aus Entity, Migrations-Entity, `DEFAULT_FACTIONS` und der Registrierungsseite (eine eigene Admin-Oberfläche oder Shared-DTO dafür gab es nicht); Vermerk in `docs/faction-modifiers.md`.
  - Tests: `relationship-resolver.service.spec.ts` (Abkommen beidseitig und für Allianzmitglieder, Freund-Behandlung, andere Typen, Feindkontakt, Fehlerfall); `trade-agreement-license.int-spec.ts` (kostenlos mit Abkommen, Zahlart `agreement` ohne Zahlquelle, ohne Abkommen regulär und `agreement` abgelehnt, beendetes Abkommen, Auflösungsfehler, NPC-Posten, kostenlose Verlängerung, Spalte entfernt); Frontend `trade.spec.tsx`. Mutationsprobe (Fähigkeit an FRIENDSHIP statt TRADE_AGREEMENT) lässt 4 Integrationstests scheitern.
