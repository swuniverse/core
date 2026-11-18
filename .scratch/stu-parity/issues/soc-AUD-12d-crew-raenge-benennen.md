# Eigene Crew-Rangnamen in den Einstellungen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU erlaubt in den Einstellungen eigene Namen für jeden Crew-Rang („Crew-Ränge“, `ChangeCrewRankNames`). Leere Felder verwenden den Standardnamen der Fraktion; eigene Namen erscheinen bei der eigenen Crew. SWU hat feste Rangnamen (`crew-expertise.ts`) ohne Anpassung und kein Ticket dafür.

## STU-Quellen

- `src/html/view/options.twig` (Z. ~107–137, Formular „Crew-Ränge“)
- `src/Module/PlayerSetting/Action/ChangeCrewRankNames/ChangeCrewRankNames.php` (Validierung: Buchstaben, einzelne Leerzeichen, Apostrophe, Akzente; max. 64; leer = löschen)
- `src/Orm/Entity/UserCrewRank.php`, `src/Orm/Repository/UserCrewRankRepository.php`
- `src/Component/Player/Deletion/Handler/UserCrewRankDeletionHandler.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/crew-rank.ts`, `crew-expertise.ts` (`crewRankDefinition`, Labels Z. ~32–41)
- `apps/backend/src/modules/spacecraft/spacecraft-crew.service.ts` (`rankLabel` Z. ~101, Beförderungslabel)
- `apps/backend/src/modules/settings/settings.controller.ts`, `settings.service.ts`, neue Entity + Migration
- `apps/frontend/src/pages/settings.tsx` (Tab Gameplay), `apps/frontend/src/components/spacecraft/ShipOperationsPanel.tsx` (Rangansicht)
- Kontolöschung: vorhandener Lösch-Handler-Mechanismus

## Akzeptanzkriterien

- [ ] Neue Tabelle für eigene Rangnamen je Spieler und Rang (max. 64 Zeichen, gleiche Zeichenregel wie STU).
- [ ] Einstellungen zeigen alle zehn Ränge mit Standardnamen und Eingabefeld; Speichern setzt bzw. löscht (leer) eigene Namen; deutsche Fehlermeldung bei ungültigen Zeichen, dann wird nichts gespeichert.
- [ ] Alle Ausgaben von Rangnamen für die eigene Crew (Crewliste, Beförderung, Rettungskapseln) nutzen den eigenen Namen, sonst den Standard; fremde Crew zeigt die Standardnamen bzw. die des Besitzers – Entscheidung im Kommentar dokumentiert (STU: Besitzer).
- [ ] Kontolöschung entfernt die Einträge.
- [ ] Backend-Tests: Validierung, Löschen bei leerem Feld, Anzeige in der Crewliste. Frontend-Test für das Formular.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt E („Crew-Ränge/-Rassen in Einstellungen“); [social.md](../audit-2026-11-17/social.md) Seitenabgleich „Einstellungen“, Kleine Abweichungen „Einstellungen“.
- Kein bisheriges Ticket. Crew-Rassen: soc-AUD-12e.

## Comments
