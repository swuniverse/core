# Tutorial: Datenmodell, Fortschritt und API

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

SWU erhält wie STU ein Tutorial mit Schritten je Spielansicht und gespeichertem Fortschritt je Spieler. Dieses Issue liefert Modell, Fortschritt und Endpunkte; Overlay (sh-AP-19b) und Inhalte (sh-AP-19c, sh-AP-19d) bauen darauf auf. Das Tutorial ist laut Leitplanke 3 im Scope.

Vorgabe: Die Schrittdefinitionen sind versionierter Code bzw. eine Datendatei im Backend (keine Admin-Pflege), der Fortschritt liegt in der Datenbank.

## STU-Quellen

- `src/Orm/Entity/TutorialStep.php` (Modul, View, Vorgänger/Nachfolger, Titel, Text, `elementIds`, `innerUpdate`, `fallbackIndex`)
- `src/Orm/Entity/UserTutorial.php` (aktueller Schritt je Spieler und Ansicht)
- `src/Module/Control/Component/TutorialProvider.php`
- `src/Module/Game/Action/SetTutorial`, `FinishTutorial`
- `src/Module/PlayerSetting/Action/CreateTutorials`, `DeleteTutorials`

## SWU-Pfade

- neues Modul `apps/backend/src/modules/tutorial/*` (Definitionsdatei, Entity `user_tutorial_progress`, Service, Controller), Migration
- `packages/shared/src/lib/tutorial/index.ts` (DTOs, Ansichtsschlüssel), Export in `packages/shared/src/index.ts`
- `apps/backend/src/modules/onboarding/*` (Start nach Abschluss des Onboardings)

## Akzeptanzkriterien

- [ ] Definitionsformat: Tutorial je Ansichtsschlüssel (z. B. `maindesk`, `colony`, `research`, `spacecraft`, `starmap`, `messages`, `holonet`), geordnete Schritte mit `id`, `title`, `text`, optional `targets` (Liste stabiler `data-tutorial`-Schlüssel), optional `waitFor` (Ereignisname, der den Schritt automatisch abschließt), optional `fallbackIndex`. Validierung beim Start (eindeutige IDs, gültige Verweise).
- [ ] Fortschritt je Spieler und Ansicht: aktueller Schritt oder abgeschlossen; Tutorials sind global abschaltbar (`tutorial_enabled`).
- [ ] Endpunkte: `GET /tutorial/:view` (Schritte und aktueller Schritt, leer wenn abgeschlossen oder abgeschaltet), `POST /tutorial/:view/step` (Schritt setzen, nur gültige IDs), `POST /tutorial/:view/finish`, `POST /tutorial/reset` (alle Tutorials neu starten), `POST /tutorial/disable`.
- [ ] Nach Abschluss des Onboardings werden die Tutorials für den Spieler aktiviert; Bestandsspieler starten mit abgeschalteten Tutorials (Migration), können sie aber über `reset` starten.
- [ ] Eine minimale Beispieldefinition (z. B. 2 Schritte für `maindesk`) dient den Tests; echte Inhalte folgen in sh-AP-19c/19d.
- [ ] Backend-Tests: Validierung der Definitionen, Fortschritt setzen/abschließen, Reset, Abschalten, Onboarding-Aktivierung, Bestandsspieler-Default.

## Comments
