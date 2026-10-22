# Baupläne härten: Löschsperre, Duplikatprüfung, Namensvalidierung

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Baupläne lassen sich in SWU löschen, auch wenn Schiffe danach gebaut werden oder gerade im Bau sind, und eine identische Modulkonfiguration kann mehrfach als Plan gespeichert werden. STU verhindert beides und validiert den Namen. Das Issue übernimmt diese Regeln.

## STU-Quellen

- `src/Module/Colony/Lib/BuildPlanDeleter.php` (`isDeletable`: keine Schiffe mit dem Plan, kein Auftrag in Kolonie- oder Stationswerft)
- `src/Module/Colony/Action/CreateBuildplan/CreateBuildplan.php` (Z. 175 „Ein Bauplan mit diesem Namen existiert bereits“, Z. 184 „Ein Bauplan mit dieser Konfiguration existiert bereits: %s“)
- `src/Module/Colony/Action/RenameBuildplan/RenameBuildplan.php`, `src/Module/Colony/Action/DeleteBuildPlan/`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (`createValidatedBuildplan`, `renameShipBuildplan`, `deleteShipBuildplan`, `validateBuildplanName`, `assertBuildplanNameAvailable`, `createBuildplanSignature`)
- `apps/backend/src/modules/colony/entities/colony-ship-build-queue.entity.ts` (`buildPlanId`, `buildPlanSignature`)
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts` (Prüfen, ob ein Schiff seinen Bauplan referenziert; sonst Referenz über Signatur ergänzen)
- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (Löschknopf sperren, Meldungen)

## Akzeptanzkriterien

- [x] Löschen wird abgelehnt, solange ein Auftrag (QUEUED/PAUSED) den Plan nutzt oder ein existierendes Schiff aus dem Plan stammt; die UI zeigt den Löschknopf dann deaktiviert mit Tooltip.
- [x] Anlegen eines Plans mit derselben Signatur (Rumpf + Module) wie ein bestehender eigener Plan wird mit „Ein Bauplan mit dieser Konfiguration existiert bereits: <Name>“ abgelehnt.
- [x] Namen werden getrimmt, dürfen höchstens 255 Zeichen lang sein, Unicode-Buchstaben sind erlaubt, Steuerzeichen nicht.
- [x] Backend-Tests: Löschsperre (Queue und Schiff), Duplikatsignatur, Namenslänge/-zeichen, Umbenennen auf vorhandenen Namen.
- [x] Frontend-Test: deaktivierter Löschknopf bei genutztem Plan.

## Comments

- 2026-10-22: Löschsperren, Bauplan-Provenienz, Signaturduplikate und Namensvalidierung umgesetzt und durch betroffene Tests sowie vollständige Builds verifiziert.
