# STU-Sonderfeatures: Star-Wars-Pendants festlegen oder Weglassen begründen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Für die STU-Sonderfeatures ohne direktes Gegenstück legt der Agent nach Leitplanke 2 je Feature ein kanonnahes Star-Wars-Pendant fest oder begründet das Weglassen und dokumentiert es unter „Entscheidungen“ in `map.md`. Für jedes Pendant entsteht ein Issue mit Status `needs-triage`. Saisonale Anomalien (Adventstür, Osterei) liegen in tmw-K10c, Handelslizenz am Schiff in tmw-T2.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- Tholianisches Netz: `Module/Ship/Action/TholianWeb`, `Component/Spacecraft/System/Type/WebEmitterShipSystem.php`
- RPG-Modul unsichtbar: `Module/Spacecraft/Action/SetRpgModuleInvisibility`, `RPGShipSystem.php` (RPG ist im Scope, Leitplanke 3)
- Uplink: `UplinkShipSystem.php`; Beam-Blocker: `BeamBlockerShipSystem.php`
- Falsche Warpsignatur: `Module/Ship/Action/FakeWarpSignature`
- Singularitätsreaktor: `SingularityShipSystem.php`

## SWU-Pfade

- `.scratch/stu-parity/map.md` (Entscheidungen), `.scratch/stu-parity/issues/`
- `game-data/data/modules/special.yaml` (Abgleich vorhandener Spezialmodule)

## Akzeptanzkriterien

- [ ] Je Feature ein Eintrag in `map.md` → Entscheidungen: SW-Pendant mit Kurzbegründung (z. B. Interdiktorfeld für das Netz, Signaturmaskierung für falsche Warpsignatur) oder „entfällt“ mit Begründung.
- [ ] Je Pendant eine Issue-Datei `sc-WP-SPEC-<n>-<slug>.md` mit Status `needs-triage`, STU-Quellen und Abhängigkeiten (z. B. sc-WP-NAV-2a für Signaturmaskierung).
- [ ] Kein Produktcode.

## Comments
