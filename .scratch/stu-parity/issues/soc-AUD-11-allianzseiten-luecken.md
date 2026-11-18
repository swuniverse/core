# Allianzseiten: fehlende Angaben in Diplomatie, Detail und Forum

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

Mehrere Allianzseiten zeigen weniger als STU:

- **Diplomatieverwaltung:** Es fehlen die Spalten „Zeitpunkt“ und „Rechte“; die Freigaben sind nur als vorbelegte Checkboxen im Änderungsformular sichtbar und ohne Änderungsrecht gar nicht. Allianznamen sind nicht verlinkt. Ausstehende Vorschläge zeigen keine Gegenpartei (das DTO enthält nur IDs).
- **Allianzdetail:** Je Mitglied fehlt das Fraktionsicon (der PM-Link je Mitglied kommt mit soc-AUD-07c).
- **Forenbeitrag:** Avatar, Online-/Offline-Status und Siedler-ID des Autors fehlen.

## STU-Quellen

- `src/html/alliance/alliancerelations.twig` (Z. 42–166: Spalten Allianz-Link, Abkommen, Zeitpunkt, Rechte, Aktionen, Vertragswerk; Vorschlag in der Zeile der Gegenpartei)
- `src/Module/Alliance/View/Relations/Relations.php`
- `src/html/view/alliance.twig` (Mitgliederliste mit Fraktionsicon)
- `src/html/alliance/allianceboardtopic.twig` (Z. 12–48: Avatar, Online-Status, Siedler-ID)
- `src/html/macros.twig` (`userAvatar`, `userInfo`)

## SWU-Pfade

- `apps/frontend/src/pages/alliances.tsx` (`DiplomacyRelationships` Z. ~769–1031, Namen Z. ~801–803; `DiplomacyProposals` Z. ~1034–1113; `AllianceDetailPage` Mitgliederliste Z. ~468–528)
- `packages/shared/src/lib/alliance/index.ts` (`startedAt` Z. ~132, Vorschlags-DTO Z. ~144–156)
- `apps/backend/src/modules/alliance/alliance.service.ts`, `alliance.controller.ts` (`:id/diplomacy`, `:id/diplomacy/proposals`, `:id`)
- `apps/frontend/src/pages/alliance-forum.tsx` (Beitrag Z. ~58–76, ~680–700), `apps/backend/src/modules/alliance/forum.service.ts`, `typeorm-forum.store.ts`
- `apps/frontend/src/pages/alliances.spec.tsx`, `alliance-forum.spec.tsx` (falls vorhanden)

## Akzeptanzkriterien

- [ ] Diplomatieverwaltung: Spalte „Zeitpunkt“ (`startedAt`) und Spalte „Rechte“ (aktuelle Freigaben als lesbare Liste, auch ohne Änderungsrecht sichtbar); Allianz- bzw. Siedlernamen verlinken auf Allianzdetail bzw. Profil.
- [ ] Ausstehende Vorschläge zeigen die Gegenpartei (Name mit Link); das Vorschlags-DTO liefert Name und Typ der Gegenpartei (Allianz oder Siedler).
- [ ] Allianzdetail: Fraktionsicon je Mitglied.
- [ ] Forenbeitrag: Autor-Avatar mit Profillink, Online-/Offline-Anzeige (unter Beachtung von `show_online_status`) und Siedler-ID; Fraktion und Amt/Rolle bleiben.
- [ ] Backend-Tests: Vorschlags-DTO mit Gegenpartei, Forum-DTO mit Avatar/Online-Status (Opt-out respektiert). Frontend-Tests für jede neue Angabe.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („Allianz-Diplomatieverwaltung: Die Spalten Zeitpunkt und Rechte fehlen …“); [social.md](../audit-2026-11-17/social.md) Seitenabgleich „Allianzdetail“, „Forum“, „Diplomatie“, Kleine Abweichungen „Allianz-Diplomatieverwaltung, Feldvergleich“, „Allianzdetail“, „Allianzforum“, Unsicherheit 7.
- Die Bewertung „Diplomatie gleich (ADR)“ wurde im Audit am 2026-11-17 auf „kleine Abweichung“ korrigiert. Das Vertragswerk nur mit Zustimmung bleibt bewusst (`diplomatie-kern-spec.md:17`).

## Comments
