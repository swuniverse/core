# Transferberechtigung aus Sicht des Zielbesitzers wie STU

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Beim Transfer an fremde Schiffe fragt SWU die Beziehung aus Sicht des **Absenders** ab (`relationshipResolver.resolve(sourceShip.userId, targetShip.userId)`). Wer einen beliebigen Siedler seiner Fraktion einseitig als Freund einträgt, darf damit an dessen Schiffe transferieren, auch an geschützte (Schilde aktiv). In STU entscheidet der **Zielbesitzer**: `isFriend($target->getUser(), $source->getUser())`, also sein Kontakt bzw. eine Abkommensfreigabe, die dem Absender gewährt wurde. Das ist eine Sicherheitslücke (unerwünschtes Beladen, Sperren von Laderaum) und muss wie STU funktionieren.

## STU-Quellen

- `src/Lib/Transfer/TransferInformationFactory.php` (Z. 31: `isFriend($target->getUser(), $source->getUser())`)
- `src/Lib/Transfer/TransferInformation.php` (`isFriend`, eigener Besitz zählt als Freund)
- `src/Module/Game/Action/Transfer/Transfer.php` (Z. ~114, Kolonie-Abholung)
- `src/Component/Player/Relation/FriendDeterminator.php` (Z. 34–41: Kontakt des ersten Arguments, Abkommensrecht `FRIENDLY`)
- `src/html/transfer/transferTypeSelection.twig` (Torpedotransfer nur bei Freund)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/transfer.service.ts` (`shipTransferBlockReason` Z. ~719, `shipTransferCapabilities` Z. ~780–793)
- `apps/backend/src/modules/spacecraft/interaction-context.service.ts` (`stanceAllowed`, Z. ~81–83 und ~123; genutzt von `InteractionRule.STANCE`)
- `apps/backend/src/modules/spacecraft/eps-transfer.service.ts` (`FOREIGN_RULES` mit `InteractionRule.STANCE`)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts` (`resolve`, `mayTransferSafely`/`mayProvisionProtectedShip` Z. ~423)
- `apps/backend/src/modules/contacts/contact.service.ts` (Kontaktrichtung)
- `apps/backend/src/modules/spacecraft/transfer.service.spec.ts`, `apps/backend/src/modules/spacecraft/eps-transfer.service.spec.ts` (falls vorhanden)

## Akzeptanzkriterien

- [x] `shipTransferCapabilities` bestimmt die Berechtigung aus Sicht des Zielbesitzers: `resolve(targetShip.userId, sourceShip.userId)`. Eigene Schiffe bleiben immer erlaubt.
- [x] Gleiche Richtung für `stanceAllowed` in `InteractionContextService` (EPS-Transfer und alle anderen Nutzer von `InteractionRule.STANCE`); jeder Aufrufer ist geprüft und im Kommentar begründet.
- [x] Einseitig eingetragener Freund (nur Absender führt Ziel als Freund) → Transfer an fremdes Schiff abgelehnt, auch an geschützte Ziele („Transfer nur zwischen Freunden erlaubt“).
- [x] Zielbesitzer führt Absender als Freund (oder Abkommen mit Freund-Recht für den Absender, oder gleiche Allianz) → erlaubt.
- [x] Alarmreaktion (`alert-reaction.service.ts`) und Handelsabkommen (`trade-agreement.policy.ts`) bleiben unverändert (fragen bereits in STU-Richtung).
- [x] Backend-Tests für beide Richtungen (einseitig Absender, einseitig Ziel, beidseitig, Allianz, Abkommen) für Waren-, Crew-, Torpedo- und EPS-Transfer.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H „Neue große Abweichungen – Transfer über einseitige Freundschaft“; [social.md](../audit-2026-11-17/social.md) Große Abweichung 5 und Unsicherheit 2.
- Kein bisheriges Ticket. `soc-B3-kontaktfreigaben-einseitig.md` (resolved) hat die Freigaben eingeführt, aber die Richtung beim Transfer nicht geprüft.

## Comments

- 2026-11-17 Hinweis: Ein anderer Agent ändert `apps/backend/src/modules/spacecraft/transfer.service.ts` gerade uncommittet (siehe auch Hinweis in README H). Vor der Umsetzung auf den dann aktuellen Stand rebasen und Zeilenangaben neu prüfen.
- 2026-11-18 – umgesetzt, Prüfung ausstehend (Opus 5.5 direkt, keine Delegation, da Autorisierung). Commit „fix(transfer): decide transfer friendship from the target owner (soc-AUD-05)“.
  - `TransferService.shipTransferCapabilities` und `InteractionContextService` (`stanceAllowed`) fragen `resolve(targetOwner, sourceOwner)`. Geprüfte Aufrufer: `InteractionRule.STANCE` nutzt nur `EpsTransferService` (FOREIGN_RULES); `nearby-interaction.ts` setzt `stanceAllowed: true` im eigenen Kontext und fragt keine Beziehung; Waren-, Crew- und Torpedotransfer laufen alle über `shipTransferBlockReason`. Alarmreaktion und Handelsabkommen unverändert.
  - Nur persönliche Kontakte sind gerichtet; Allianzmitgliedschaft und Abkommen (`treatAsFriend`) sind symmetrisch und bleiben erlaubt.
  - Tests mit echtem `RelationshipResolverService` + `InMemoryAllianceStore` und gerichtetem Kontaktport: einseitig Absender (abgelehnt), einseitig Ziel, beidseitig, gleiche Allianz, Abkommen mit Freund-Recht (erlaubt) – Waren an ungeschütztes Ziel sowie Waren/Crew/Torpedo an geschütztes Ziel (Quote + Crew-Aktion). EPS: dieselbe Fünfermatrix über `InteractionContextService.load(…, ['stanceAllowed'])`. Gegenprobe: alter Stand → 10 neue Tests rot.
  - Gelaufen: `jest src/modules/spacecraft src/modules/alliance/relationship-resolver src/modules/alert-reaction src/modules/trade` → 864/867 grün; die 3 Fehlschläge (`spacecraft-tachyon-scan.spec.ts`, `navicomputer-jump.spec.ts`) treten identisch auf unverändertem HEAD 5555d6a9 auf. ESLint ohne Fehler (3 vorbestehende `any`-Warnungen), Backend-`tsc --noEmit` sauber.
  - Offen für den Prüfpass: Abschlussreview des Diffs, PostgreSQL-/API-Regression der Transferpfade, gemeinsamer Build.
- 2026-11-18 – Prüfpass bestanden, resolved (Opus 5.5). Diff-Review ohne Befund: nur die zwei Argumentvertauschungen; NBS-Aktionsbuttons fragen weiterhin keine Beziehung ab (vorbestehend, Server lehnt beim Transfer ab). PostgreSQL: `settler-relationship-effects`, `cargo-dispose`, `foreign-crew`, `starmap-contacts-requests` grün; `rpg-transponder` 1 Fehler (`nearby/:id/scan` 403 statt 404) identisch auf 5555d6a9, also unabhängig. Gemeinsamer Build `nx run-many -t build -p backend frontend shared` erfolgreich; `nx lint backend frontend` 0 Fehler (124 vorbestehende Warnungen).
