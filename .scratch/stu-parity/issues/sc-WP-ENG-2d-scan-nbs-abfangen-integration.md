# Policy in Scan, NBS und Abfangen integrieren

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** sc-WP-ENG-2a, sc-WP-ENG-2b

## Ziel

Scan, Abfangen und NBS beziehen Erlaubnis und Grund aus derselben Policy.

## Akzeptanzkriterien

- [x] Scan, Abfangen und `getNearby` nutzen das strukturierte Ergebnis.
- [x] Hooks für Tarnung und Ionensturm dokumentiert.

## Comments

- 2026-10-23: Abbruch vor der Umsetzung: Der verpflichtende Blocker `sc-WP-ENG-2b` steht auf `needs-info`, nicht auf `resolved` oder `wontfix`; damit war dieses Issue entgegen der Auswahlannahme nicht arbeitsbereit. Bitte zuerst den Interaktionskontext-Loader entsperren und abschließen, danach dieses Issue erneut auf `ready-for-agent` setzen.
- 2026-10-30: Product-Owner-Entscheidung: Option 1. Die Interaction Policy (`0746c5b`) und der Kontextloader (`ad26530`) sind inzwischen umgesetzt und als `resolved` markiert. Der einzige dokumentierte Blocker ist beseitigt; das Issue ist wieder `ready-for-agent`. Eine weitere STU- oder Datenbankentscheidung ist für diese SWU-Policy-Integration nicht erforderlich.
- 2026-10-30: `nearby-interaction.ts` ergänzt (Regelsätze je Interaktion, `decideNearbyInteraction`, `INTERACTION_HOOKS`; Tarnung/Ionensturm im Kommentar dokumentiert). `scanNearbyTarget`, `getNearby` (Aktionsflags) und `HyperdriveDisruptionService.intercept` nutzen die Policy-Entscheidung; Meldungen bleiben erhalten. Zusätzlich Fixture in `database-settler-scans.service.spec.ts` repariert (fehlender `profileVisitorService`-Mock, vorbestehender Fehler). Offen: Hooks sind leer, bis Tarnung/Ionensturm existieren; der Kontext nutzt für Besatzungs-/Urlaubs-/Blockadefelder neutrale Werte, da diese Interaktionen sie nicht prüfen. Der `InteractionContextService`-Loader wird hier nicht genutzt, weil die Schiffe bereits geladen sind.
