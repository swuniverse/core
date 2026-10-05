# Mitgliederdaten und Allianzforum

Type: grilling
Status: resolved
Blocked by: 03

## Question

Welche internen Mitgliederdaten dürfen Verantwortliche sehen, und welche Autorisierungs-, Moderations- und Aufbewahrungsregeln gelten für das Allianzforum?

## Answer

Präsident und Vize sehen nur bereits vorhandene operative Daten ihrer Mitglieder: letzte Aktivität, Kolonien samt betrieblichem beziehungsweise Lagerzustand, Schiffe und Stationen nach Klasse und Standort sowie Crew-Auslastung. Private Nachrichten, persönliche Notizen, Zugangsdaten und Admininformationen bleiben ausgeschlossen.

Im Allianzforum dürfen alle aktuellen Mitglieder lesen, Themen anlegen und Beiträge schreiben. Autoren dürfen eigene Beiträge bearbeiten. Präsident und Vize dürfen Boards, Themen und sämtliche Beiträge moderieren. Jede Lese- und Schreibaktion wird serverseitig anhand aktueller Mitgliedschaft und Zuständigkeit autorisiert; bekannte STU-Pfade mit reinem UI-Schutz werden nicht übernommen.

Moderationslöschung ist weich: Autor und Zeit bleiben sichtbar, Moderator und Moderationszeit werden erfasst, der ursprüngliche gelöschte Inhalt wird Mitgliedern nicht mehr ausgeliefert. Leere Themen oder Boards werden nicht automatisch gelöscht. Entfernte Mitglieder verlieren sofort den Zugriff, ihre Beiträge bleiben bestehen. Nach Kontolöschung erscheint der Autor als „Gelöschter Siedler“. Vollständige Allianzauflösung beziehungsweise Reset löscht alle Forumsdaten physisch; ein Export- oder Archivprodukt entsteht nicht.

Grenzen und Darstellung:

- Boardname: 5–80 Unicode-Zeichen nach Trim; höchstens 50 Boards je Allianz.
- Themenname: 1–120 Unicode-Zeichen nach Trim.
- Beitrag: 1–20.000 Unicode-Zeichen nach Trim.
- 20 Beiträge je Seite; Beiträge chronologisch.
- Themen: zuerst sticky, dann letzte Aktivität; drei zuletzt aktive Themen im Dashboard.
- Keine feste Gesamtzahl für Themen oder Beiträge, aber serverseitige Ratenbegrenzung und Pagination.
- Nur der bereits sicher unterstützte BBCode.
