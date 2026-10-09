# 07: Öffentliche Anzeige

**What to build:** Authentifizierte Spieler sehen aktive Beziehungen, Vertragswerk und Chronik von Siedlern; Allianzseiten und Beschreibungsplatzhalter enthalten Spielerpartner.

**Blocked by:** 05

**Status:** resolved

- [x] Öffentliche, paginierte Ansicht je Siedler: aktive Beziehungen, öffentliches Vertragswerk, Chronik (neueste zuerst); Entwürfe und Vorschläge bleiben verborgen
- [x] Allianzseite und `$ALLIANCE_DIPLOMATIC_RELATIONS` zeigen aktive Beziehungen zu Spielern, Namen als Klartext
- [x] Entscheidung dokumentiert: eigene Route oder vorhandenes Spielerprofil
- [x] Frontendtests (Laden, Fehler, Pagination), Service-Tests

## Entscheidung: Route

Die öffentliche Siedleransicht ist Teil des vorhandenen Spielerprofils (`/players/:id`, `PlayerProfilePage`), keine eigene Route. Das Profil ist bereits Ziel jedes Spielerlinks und zeigt die Allianzmitgliedschaft; für Spieler ohne Allianz bindet es `SettlerPublicDiplomacy` ein (aktive Beziehungen, Vertragswerk auf Abruf, paginierte Chronik). Backend: `GET /alliances/settlers/:playerId/diplomacy` (neu), `.../relationships/:id/contract` und `.../diplomacy/chronicle` (bestehend). Spielerpartner auf Allianzseiten verlinken auf das Profil.
