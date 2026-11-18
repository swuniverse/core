# Globaler Diplomatie-Graph wie STU

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU hat eine globale Seite „Diplomatische Beziehungen“, verlinkt aus der Allianzliste. Sie zeichnet alle aktiven Beziehungen zwischen Allianzen als Graph: Knoten sind Allianzen (Name, Rahmenfarbe nach Fraktion bzw. Allianzfarbe, Link zur Allianzseite), Kanten sind Beziehungen mit einer Farbe je Typ und einem Tooltip mit dem Typnamen, Hintergrund `#121220`. SWU hat das bewusst weggelassen (Spec-Entscheidung). Nach PO-Nachtrag N4 kommt der Graph wie STU. Beziehungslisten und Diplomatie-Chronik bleiben zusätzlich bestehen.

## STU-Quellen

- `src/Module/Alliance/View/Diplomatic/DiplomaticRelations.php` (aktive Allianzbeziehungen, `RelationRepository::getActive`)
- `src/Component/Alliance/Relations/Renderer/AllianceRelationRenderer.php` (Graphattribute, Kantenfarbe/-tooltip/-breite)
- `src/Component/Alliance/Relations/Renderer/RelationItemVertexBuilder.php`, `AllianceDataToGraphAttributeConverter.php` (Knotenlabel, Rahmen-/Füllfarbe, Link)
- `src/Component/Alliance/Enum/AllianceRelationTypeEnum.php` (`getColor`: Krieg `#810800`, Handel `#a5a200`, Frieden `#004608`, Bündnis `#005183`, Freundschaft `#5cb762`, Vasall `#008392`)
- `src/Component/GrapViz/GraphVizFactory.php`
- `src/html/alliance/alliance_diplomatic_relations.twig`, `src/html/alliance/allianceList.twig` (Link „Diplomatische Beziehungen“)

## SWU-Pfade

- `apps/backend/src/modules/alliance/alliance.controller.ts`, `alliance.service.ts`, `alliance.store.ts` (neuer öffentlicher Endpunkt für aktive Allianz-Allianz-Beziehungen)
- `packages/shared/src/lib/alliance/index.ts` (`AllianceRelationshipType`, neues Graph-DTO)
- `apps/frontend/src/pages/alliances.tsx` (`AllianceListPage` Z. ~288: Link), neue Seite z. B. `/alliances/diplomacy-graph` in `apps/frontend/src/app/app.tsx`
- Clientseitige Darstellung: vorhandene Abhängigkeiten `@xyflow/react` und `elkjs` (bereits in `research-tree.tsx` genutzt)
- `.scratch/alliance-stu-parity/diplomatie-kern-spec.md` (Z. 169)

## Akzeptanzkriterien

- [ ] Öffentlicher Endpunkt liefert alle aktiven Beziehungen zwischen Allianzen (keine Siedler-Abkommen, wie STU `getActive` nur Allianz↔Allianz) mit Typ und den beteiligten Allianzen (ID, Name, Farbe, Fraktion). Keine vertraulichen Daten (kein Vertragswerk, keine Freigaben).
- [ ] Neue Seite „Diplomatische Beziehungen“, verlinkt aus der Allianzliste: Graph mit Allianzknoten (Name, Rahmenfarbe nach Fraktion bzw. Allianzfarbe, Link zur Allianzdetailseite) und Kanten je Beziehung in STU-Typfarbe mit Tooltip des Typnamens; Hintergrund `#121220`; automatisches Layout; Legende der Typfarben.
- [ ] Darstellung clientseitig mit gleicher Information wie STU (GraphViz serverseitig ist nicht nötig); bei keiner Beziehung ein Leerhinweis.
- [ ] Beziehungslisten je Allianz, `$ALLIANCE_DIPLOMATIC_RELATIONS` und Diplomatie-Chronik bleiben unverändert.
- [ ] Backend-Test: Endpunkt liefert nur aktive Allianzbeziehungen. Frontend-Tests: Knoten verlinken auf die Allianz, Kantenfarbe je Typ, Tooltip, Link aus der Allianzliste.
- [ ] Die Ausschlusszeile in `diplomatie-kern-spec.md:169` ist als durch dieses Ticket ersetzt markiert.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt N4 „Diplomatie-Graph“ und N2 (Zeile „Kein globaler Diplomatie-Graph“); [social.md](../audit-2026-11-17/social.md) Seitenabgleich „Allianzliste“ und „Bewusste/entschiedene Abweichungen“ (kein globaler Diplomatie-Graph – jetzt aufgehoben).
- PO-Nachtrag N4 vom 2026-11-17: Diplomatie-Graph wie STU.
- Ersetzt die Spec-Entscheidung `.scratch/alliance-stu-parity/diplomatie-kern-spec.md:169` („A GraphViz diplomacy graph“ out of scope).

## Comments
