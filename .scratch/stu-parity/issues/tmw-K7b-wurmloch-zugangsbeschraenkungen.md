# Wurmloch-Zugangsbeschränkungen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K7a, sc-WP-STAT-2

## Ziel

Wurmlöcher können für Spieler, Allianzen, Fraktionen oder einzelne Schiffe freigegeben oder gesperrt werden. Ein Verbot geht vor einer Erlaubnis, und geprüft wird über die zentrale Beziehungsauflösung (Integrationspunkt laut `alliance-stu-parity/map.md`). Offen ist, wer diese Regeln in SWU verwaltet.

## STU-Quellen

- `src/Module/Spacecraft/Action/AddWormholeRestriction/*`, `DeleteWormholeRestriction/*`, `View/ShowWormholeRestrictions/*`
- `src/Orm/Entity/WormholeRestriction.php`, `src/Component/Ship/Wormhole/WormholeEntryTypeEnum.php` (USER/ALLIANCE/FACTION/SHIP), `WormholeEntryModeEnum.php` (Erlauben/Verbieten)
- `src/Component/Ship/Wormhole/WormholeEntryPrivilegeUtility.php`
- In STU sind Wurmlocheingänge an Systemfelder gebunden. Die Verwaltung erfolgt über die Schiffsansicht am Eingang, zuständig ist der Betreiber der Station am Eingang.

## SWU-Pfade

- `WormholeAccessPolicy` aus tmw-K7a
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`, `.scratch/alliance-stu-parity/beziehungswirkungen-spec.md`
- `apps/backend/src/modules/starmap/entities/wormhole.entity.ts`, `starmap.controller.ts` (Admin-Endpunkte)
- Stationen: sc-WP-STAT-0 … sc-WP-STAT-3b

## Akzeptanzkriterien

- [ ] Eine Entität „Wurmlochregel“ (Wurmloch, Zieltyp USER/ALLIANCE/FACTION/SHIP, Ziel-ID, Modus ALLOW/DENY) ist per Migration angelegt.
- [ ] Die Policy-Implementierung gilt: Ohne Regeln ist alles erlaubt. Gibt es Regeln, gewinnt DENY vor ALLOW. Allianz und Fraktion werden über die zentrale Auflösung bzw. Mitgliedschaft geprüft, und Fehler führen zu einer geschlossenen Ablehnung.
- [ ] Verwaltungs-UI und -API in der Stationsansicht (sc-WP-STAT-2): Nur der Betreiber einer Station auf dem Eingangsfeld darf Regeln listen, anlegen und löschen; andere Spieler erhalten 403.
- [ ] Ein abgelehnter Einflug meldet „Du hast keine Berechtigung, in das Wurmloch einzufliegen“.
- [ ] Backend-Tests für alle Zieltypen, die DENY-Priorität und die Betreiberrechte (Betreiber, Fremder, keine Station). Frontend-Test der Regelliste.

## Entscheidung

Vorgabe: Variante (b), wie STU. Der Betreiber einer Station auf dem Wurmloch-Eingangsfeld verwaltet die Regeln (über die Stationsansicht aus sc-WP-STAT-2). Keine Admin-Pflege als Spielelement; ohne Station am Eingang gibt es keine Regeln (alles erlaubt).

## Comments

- 2026-10-21 Product Owner: Option b – Wurmloch-Zugangsregeln verwaltet wie in STU der Betreiber einer Station auf dem Eingangsfeld; das Issue ist deshalb zusätzlich durch sc-WP-STAT-2 blockiert.
