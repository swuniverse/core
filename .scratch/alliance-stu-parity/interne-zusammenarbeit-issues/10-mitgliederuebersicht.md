# 10: Mitgliederübersicht

**What to build:** Präsident und Vize öffnen von der Allianzseite aus eine Übersicht aller aktuellen Mitglieder. Sie sehen je Mitglied letzte Aktivität, Crew-Auslastung, Kolonien mit Standort, Energie, Lagerauslastung und Bevölkerung sowie Schiffe nach Klasse gruppiert mit Standort, und können Profil und Nachricht öffnen. Diplomat, Mitglied ohne Amt und Außenstehende haben keinen Zugriff, auch nicht per direktem Request. Private Daten bleiben ausgeschlossen.

**Blocked by:** 08: Letzte Aktivität erfassen

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/10-mitgliederuebersicht.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Neuer Mitgliederübersichtsdienst im Allianz-Modul; die Rechtematrix erhält `viewMemberOperations` für Präsident und Vize.
- [ ] Ein einziger schmaler Lese-Port liefert operative Mitgliederdaten für eine Menge von Spieler-IDs gebündelt; die Implementierung liest vorhandene Kolonie-, Schiffs- und Crewdaten und nutzt für das globale Crewlimit die vorhandene Berechnung des Kolonie-Moduls.
- [ ] Je Mitglied: Spieler-ID, Name, Fraktion, Amt mit Titel, letzte Aktivität („unbekannt“ ohne Wert), eingesetzte Crew und globales Crewlimit, Kolonien (ID, Name, System und Position, Energie/Max, Lagerbelegung/Kapazität, Bevölkerung/Max), Schiffe nach Klasse gruppiert (ID, Name, aufgelöster Standort).
- [ ] Zerstörte Schiffe und aufgegebene Kolonien fehlen; Nachrichten, Notizen, Zugangsdaten, E-Mail, Admininformationen, Fracht, Module, Logbücher, Scans, Forschung, Kolonieoberflächen und Schiffsstatusdetails sind nicht Teil der Antwort.
- [ ] Authentifizierte Route unter der Allianz-ID, nur mit `viewMemberOperations` in genau dieser Allianz; Nichtmitglieder und Mitglieder anderer Allianzen erhalten Not Found, Diplomat und Mitglied ohne Amt der eigenen Allianz Forbidden. Die Übersicht wird bei jeder Anfrage aus der aktuellen Mitgliedschaft abgeleitet.
- [ ] DTOs in `packages/shared`.
- [ ] Die Betrachteraktionen der Detailansicht erhalten „Mitgliederübersicht öffnen“; die Detailseite verlinkt die neue Seite nur dann. Die Seite zeigt je Mitglied eine aufklappbare Zeile mit Kolonien, Schiffsgruppen, Crew-Auslastung sowie Profil- und Nachrichtenlink.
- [ ] Verhaltenstests mit Testimplementierung des Lese-Ports: Präsident und Vize erhalten die Übersicht, Diplomat, Mitglied ohne Amt, Nichtmitglied und Mitglied einer anderen Allianz nicht; nur aktuelle Mitglieder; ausgeschlossene Daten fehlen; zerstörte Schiffe und aufgegebene Kolonien fehlen.
- [ ] Postgres-Integrationstest der Lese-Port-Implementierung für mehrere Spieler gebündelt.
- [ ] Frontend-Seitentests für Übersicht, Aufklappen, Link nur bei Fähigkeit und „unbekannt“.
