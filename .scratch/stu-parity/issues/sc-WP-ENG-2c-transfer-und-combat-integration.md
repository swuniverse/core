# Policy in Transfer und Kampf integrieren

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** sc-WP-ENG-2a, sc-WP-ENG-2b

## Ziel

Transfer und Angriff nutzen Loader und Policy ohne Verhaltens- oder Meldungsverlust.

## Akzeptanzkriterien

- [ ] Einzelprüfungen zentral auswerten.
- [ ] Urlaubsschutz und deutsche Meldungen regressionsgetestet.

## Comments

- 2026-10-23: Blockiert durch `sc-WP-ENG-2b`: Das Issue steht auf `needs-info`, und der geforderte NestJS-Kontextloader ist nach einem fehlgeschlagenen Gesamttest nicht im Produktcode vorhanden. Transfer und Kampf können daher nicht wie spezifiziert auf Loader und Policy umgestellt werden. Bitte zuerst `sc-WP-ENG-2b` wieder freigeben und abschließen.
- 2026-10-30: Product-Owner-Entscheidung: Option 1. Der inzwischen mit Commit `ad26530` umgesetzte und als `resolved` markierte Kontextloader `sc-WP-ENG-2b` beseitigt den einzigen dokumentierten Blocker. Das Issue ist wieder `ready-for-agent`; eine weitere STU- oder Datenbankentscheidung ist für diese SWU-Policy-Integration nicht erforderlich.
