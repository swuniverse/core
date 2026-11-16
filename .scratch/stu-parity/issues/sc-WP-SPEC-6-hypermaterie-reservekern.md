# Hypermaterie-Reservekern als Hochkapazitätsreaktor

**Status:** needs-info
**Priority:** P3
**Size:** M
**Blocked by:** col-A2, sc-WP-ENG-5

## Ziel

Ein Hypermaterie-Reservekern bildet den STU-Singularitätsreaktor als alternativen Hochkapazitätsreaktor ab. Er nutzt dieselbe Reaktor-Laufzeit wie bestehende SWU-Reaktoren, besitzt jedoch eine größere Ladungskapazität und eigene Ladekosten; bei Zerstörung fällt ein vorhandener Hyperantrieb aus.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/SingularityShipSystem.php`
- `Component/Spacecraft/System/Data/SingularityCoreSystemData.php`
- `Lib/ModuleRumpWrapper/ModuleRumpWrapperReactor.php`
- Reaktor-Lade- und Ticklogik unter `Module/Spacecraft/Lib/Reactor/`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/tick/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Hypermaterie-Reservekern ist eine alternative, dauerhaft aktive Reaktorart mit datengetriebener Leistung, Kapazität und Laderezeptur.
- [ ] Kapazität und Ladeeinheiten entsprechen funktional dem STU-Singularitätskern; konkrete Star-Wars-Waren werden vor Umsetzung in den Spieldaten festgelegt.
- [ ] Reaktorladung, EPS-Erzeugung, Transfer und Anzeige nutzen die gemeinsamen Reaktorpfade.
- [ ] Zerstörung des Reservekerns deaktiviert den Hyperantrieb; Reparatur startet ihn nicht automatisch ohne erfüllte Startbedingungen.
- [ ] Shared-DTOs und verdichtete Schiff-UI unterscheiden Leistung, Ladung und Kapazität.
- [ ] Service-, Tick- und Integrationstests decken Ladung, Erzeugung, Zerstörung und Reparatur ab.

## Triage und konkrete Entscheidungsgrundlage

Der gemeinsame Ladepfad und die Statistikberechnung nutzen schon `reactor-fuel-profile.ts`, `SpacecraftEngineeringService`, `SpacecraftStatsService` und `SpacecraftResourceFlowService`. Es gibt nur LIGHT_HYPERMATTER und HYPERMATTER; ein Reservekern-Profil/-Modul samt Reaktorausfallkopplung fehlt.

STU `ReactorWrapperInterface` ist eindeutig: Singularitätskernkapazität = theoretische Ausgangsleistung × 20; eine Ladeeinheit erzeugt 85 Ladung aus 2 Dilithium, 3 Antimaterie, 2 Plasma. Standardkern: Kapazität × 15, 30 Ladung aus 1 Dilithium, 2 Antimaterie, 2 Deuterium. Die vorhandene SWU-Warenzuordnung liefert bereits Kyber-Kristalle (8), Antimaterie (6), Plasma (7) und Hypermaterie (5); keine neue Ware nötig.

## Offene Frage

Soll der Reservekern mit der vorhandenen Warenzuordnung und der unveränderten STU-Laderezeptur kommen, und welche Bauwerte bekommt das neue Modul?

**Empfehlung zur Freigabe:** 85 Ladung pro Einheit aus **2 Kyber-Kristallen (8), 3 Antimaterie (6), 2 Plasma (7)**; Kapazität **20 × theoretische Reaktorleistung**, Leistungskalierung wie Standard-Hypermaterie-Reaktor (Basisleistung 20, vorhandene Level-/Rumpfformel). Höhere Kapazität, kein zusätzlicher pauschaler Leistungsbonus. Neues alternatives Modul für beide Fraktionen, maxLevel 10, Forschung Reaktortechnik I; Baukosten wie bestehender Allianz-Hypermaterie-Reaktor: 8.000 Credits, 400 Durastahl, 50 Kyber-Kristalle, 120 Tibanna-Gas, 10 Beskar, 260 kristallines Silizium, 140 Energiemodule, Bauzeit 110, Basiscrew 2. Das ist ein prüfbarer Vorschlag und wird erst nach Entscheidung als Spieldatum übernommen.

## Vorbereiteter Restauftrag nach Freigabe

- [ ] Explizites datengetriebenes Profil statt stiller Namens-/Standardfallbacks; eindeutige Wahl eines aktiven Reaktormoduls. Keine gleichzeitige Summierung alternativer Reaktoren.
- [ ] Laden aus Schiff-/Kolonielager, Tickproduktion, Verteilung, Reaktorladungstransfer, Demontagerecycling und alle Anzeigen nutzen dasselbe Profil. Fremde Ladeprofile erhalten beim Transfer keine neu erfundene Energieumrechnung.
- [ ] Einbau/Ausbau/Retrofit aktualisiert Leistung und Kapazität ohne neue Gratisladung; Überschuss beim Kapazitätswechsel nach vorhandener Modulwechselregel begrenzen und anzeigen.
- [ ] Zerstörung des Kerns schaltet den vorhandenen Hyperantrieb aus; Reparatur startet ihn nicht automatisch. Bestehende Startbedingungen bleiben maßgeblich.
- [ ] Tests: Rezeptur/Bestandslimit, genau 85 Ladung, Kapazitätsgrenze, Leistung/Verteilung, Transfer, Modulwechsel, Recycling, Defekt/Reparatur, Rollback und UI-Unterscheidung.

## Comments

- 2026-11-09: `needs-triage` bleibt: Für die Laderezeptur fehlen die konkreten SWU-Waren und deren Mengen pro Ladeeinheit. Leistung, Kapazität und Rezeptur sollen datengetrieben sein; die grüne technische Baseline legt diese Spieldaten nicht fest. Keine Waren oder Mengen vorwegnehmen.

- 2026-11-16 – Triage: Die bisher abstrakte Rezepturfrage ist mit vorhandenen SWU-Waren und exakten STU-Mengen vorbereitet. Bau-/Leistungswerte ebenfalls vorgeschlagen; noch keine Spieldatenentscheidung, daher needs-info. Siehe [Audit](../triage-2026-11-16.md).
