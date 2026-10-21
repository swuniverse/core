# Kolonie-Sandbox: Datenmodell und Kopie der Oberfläche

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU bietet eine Kolonie-Sandbox: Der Spieler legt eine Planungskopie einer Kolonie an und kann darin Gebäude bauen, abreißen und schalten, ohne Ressourcen zu verbrauchen, um Produktion und Energie zu planen. SWU hat nichts davon. Dieses Teilpaket legt Datenmodell, Erzeugung (Kopie der Felder) und eine Sandbox-Liste an; Bau (col-G3b) und Produktionsvorschau (col-G3c) folgen.

## STU-Quellen

- `src/Module/Colony/Action/Sandbox/CreateSandbox/`
- `src/Module/Colony/View/Sandbox/`
- `src/html/colony/sandbox/*.twig`
- `src/Orm/Entity/ColonySandbox.php`, `PlanetFieldHost` (polymorph)

## SWU-Pfade

- `apps/backend/src/modules/colony/entities/` (neue Entities, z. B. `colony-sandbox.entity.ts`, Sandbox-Felder)
- `apps/backend/src/modules/colony/colony.controller.ts`, neuer `colony-sandbox.service.ts`
- `apps/frontend/src/pages/colonies/ColoniesPage.tsx`, `components/ColonyMap.tsx` (Wiederverwendung im Sandbox-Modus)

## Akzeptanzkriterien

- [ ] Ein Spieler kann aus einer eigenen Kolonie eine benannte Sandbox erzeugen (Kopie aller Felder inkl. Gebäude, Aktivstatus, Feldtyp), auflisten, umbenennen und löschen; Höchstzahl je Spieler 3 (konfigurierbar), darüber Ablehnung mit Meldung.
- [ ] Die Sandbox ist in der Kolonieseite über einen Umschalter erreichbar und zeigt die kopierte Karte schreibgeschützt.
- [ ] Sandboxen sind für andere Spieler unsichtbar und beeinflussen weder Tick noch Ranglisten.
- [ ] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a), vollständig (col-G3a bis col-G3c). Höchstzahl Sandboxen je Spieler: Der Product Owner hat keinen Wert genannt; es gilt der Vorschlag aus der Empfehlung, **3**, als Konfigurationswert (änderbar ohne Codeänderung).

## Comments

- 2026-10-21 Product Owner: Option a – Die Kolonie-Sandbox ist gewünscht und wird vollständig umgesetzt (col-G3a bis col-G3c), mit niedriger Priorität.
