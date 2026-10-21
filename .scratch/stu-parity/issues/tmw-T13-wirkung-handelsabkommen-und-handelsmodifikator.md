# Wirkung des Handelsabkommens und des Fraktions-Handelsmodifikators

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T2, tmw-T7a

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

- [ ] Die Auflösung liefert eine neue Fähigkeit (z. B. `mayTradeFavorably`), dokumentiert in `docs/alliance-relationship-effects.md`.
- [ ] Am Spielerposten erhält ein Partner mit aktivem Handelsabkommen die Lizenz kostenlos; die Wirkung greift nur bei aktiver Beziehung. Fehler der Auflösung führen geschlossen zu keiner Vergünstigung. NPC-Posten sind nicht betroffen.
- [ ] `tradeModifier` wird aus Entity, Seed (`DEFAULT_FACTIONS`), DTOs und Admin-Oberfläche entfernt (Migration); `docs/faction-modifiers.md` vermerkt die Entfernung.
- [ ] Backend-Tests: mit und ohne Abkommen, Fehlerfall der Auflösung, Modifikator entfernt.

## Entscheidung

Vorgabe:
1. Handelsabkommen (a): Partner (Allianzmitglieder bzw. Siedler mit aktivem Handelsabkommen) erhalten am Spielerposten des Eigentümers die Lizenz kostenlos (Empfehlung übernommen: kostenlos statt Rabatt). Keine Wirkung auf Shoutbox oder netzübergreifende Transfers.
2. `tradeModifier` (b): Das Feld wird entfernt. Diese spezielle Entscheidung geht der allgemeinen Option 2a in tmw-FA1b vor.

## Comments

- 2026-10-21 Product Owner: Option 1a, 2b – Handelsabkommen-Partner erhalten am Spielerposten des Eigentümers die Lizenz kostenlos (1a); `tradeModifier` wird entfernt (2b).
