# STU-Sonderfeatures: Star-Wars-Pendants festlegen oder Weglassen begründen

**Status:** resolved
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

- [x] Je Feature ein Eintrag in `map.md` → Entscheidungen: SW-Pendant mit Kurzbegründung (z. B. Interdiktorfeld für das Netz, Signaturmaskierung für falsche Warpsignatur) oder „entfällt“ mit Begründung.
- [x] Je Pendant eine Issue-Datei `sc-WP-SPEC-<n>-<slug>.md` mit Status `needs-triage`, STU-Quellen und Abhängigkeiten (z. B. sc-WP-NAV-2a für Signaturmaskierung).
- [x] Kein Produktcode.

## Comments

2026-10-28: Sechs Star-Wars-Pendants in `map.md` festgelegt und als `sc-WP-SPEC-1` bis `sc-WP-SPEC-6` mit konkreten STU-Quellen, Abhängigkeiten und Akzeptanzkriterien zur Triage angelegt. Produktcode blieb unverändert.

2026-11-17: Die frühere Zuordnung des Singularitätsreaktors als Hypermaterie-Reservekern ist auf Nutzerwunsch aufgehoben. SPEC-6 ist `wontfix`; die bereits erfolgte Umsetzung wird vollständig zurückgenommen. Keine Ersatzmechanik.
