# Policy in Kommunikation und Bergung integrieren

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** sc-WP-ENG-2a, sc-WP-ENG-2b

## Ziel

Kommunikation und Wrackbergung nutzen Loader und Policy ohne Verhaltensverlust.

## Offene Frage

Soll sc-WP-ENG-2e erst wieder freigegeben werden, nachdem der blockierende Kontext-Loader sc-WP-ENG-2b implementiert und als resolved markiert wurde?

## Akzeptanzkriterien

- [x] Strukturierte Ergebnisse und bestehende Meldungen verwenden.
- [x] Traktor-Hook dokumentiert; Integrationstests vorhanden.

## Comments

- 2026-10-23: Beim Verstehen festgestellt, dass der deklarierte Blocker sc-WP-ENG-2b weiterhin `needs-info` ist und sein Produktcode gemäß Abbruchregel verworfen wurde; im Repository existiert daher kein Interaktionskontext-Loader, den Kommunikation und Wrackbergung integrieren könnten. Umsetzung bis zur Auflösung von sc-WP-ENG-2b blockiert.
- 2026-10-30: Product-Owner-Entscheidung: Option 1. Die Interaction Policy (`0746c5b`) und der Kontextloader (`ad26530`) sind inzwischen umgesetzt und als `resolved` markiert. Die ausdrücklich genannte Freigabebedingung ist erfüllt; das Issue ist wieder `ready-for-agent`. Eine weitere STU- oder Datenbankentscheidung ist für diese SWU-Policy-Integration nicht erforderlich.
- 2026-10-30: Umgesetzt. `NearbyInteraction` um `MESSAGE` und `SALVAGE` erweitert (`nearby-interaction.ts`); `SpacecraftCommunicationService.sendNearbyMessage` und `TransferService.recoverWreckCargo` entscheiden über `decideNearbyInteraction` und behalten ihre bisherigen Meldungen. Der Traktor-Hook ist im Kommentar von `NEARBY_INTERACTION_RULES` dokumentiert (`INTERACTION_HOOKS`, noch leer); Tests in `nearby-interaction.spec.ts` und den bestehenden Service-Specs. Folgepunkt: Wrack-Ziel nutzt neutrale Systeme (kein Warp/Schild), kein Kontextloader nötig, da beide Entitäten bereits geladen sind.
