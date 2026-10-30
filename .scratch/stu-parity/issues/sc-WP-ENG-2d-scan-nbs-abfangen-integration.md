# Policy in Scan, NBS und Abfangen integrieren

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** sc-WP-ENG-2a, sc-WP-ENG-2b

## Ziel

Scan, Abfangen und NBS beziehen Erlaubnis und Grund aus derselben Policy.

## Akzeptanzkriterien

- [ ] Scan, Abfangen und `getNearby` nutzen das strukturierte Ergebnis.
- [ ] Hooks für Tarnung und Ionensturm dokumentiert.

## Comments

- 2026-10-23: Abbruch vor der Umsetzung: Der verpflichtende Blocker `sc-WP-ENG-2b` steht auf `needs-info`, nicht auf `resolved` oder `wontfix`; damit war dieses Issue entgegen der Auswahlannahme nicht arbeitsbereit. Bitte zuerst den Interaktionskontext-Loader entsperren und abschließen, danach dieses Issue erneut auf `ready-for-agent` setzen.
- 2026-10-30: Product-Owner-Entscheidung: Option 1. Die Interaction Policy (`0746c5b`) und der Kontextloader (`ad26530`) sind inzwischen umgesetzt und als `resolved` markiert. Der einzige dokumentierte Blocker ist beseitigt; das Issue ist wieder `ready-for-agent`. Eine weitere STU- oder Datenbankentscheidung ist für diese SWU-Policy-Integration nicht erforderlich.
