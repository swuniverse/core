# Allianzen: bewusste Abweichungen von STU

Stand: 2026-11-24 (Punkt 1 neu gefasst nach PO-Entscheidung M1 vom 2026-11-17, soc-AUD-09a)

Das Allianzsystem folgt dem Vorbild STU und wird in Etappen gebaut, jede Etappe originalgetreu. Drei Punkte weichen bewusst davon ab oder schränken STU ein.

Erstens hat eine Allianz **Rollen wie STU**: frei konfigurierbare Rollen mit Titel, Sortierung und einer Menge der 14 STU-Rechte; ein Mitglied kann mehrere Rollen halten. FOUNDER erfüllt jedes Recht, ein Oberrecht (SUCCESSOR, DIPLOMATIC) seine Unterrechte. Jede Allianz startet mit den Standardrollen **Präsident** (FOUNDER), **Vize-Präsident** (SUCCESSOR mit allen Unterrechten) und **Diplomat** (DIPLOMATIC mit Unterrechten). Abweichend von STU gilt eine **Schutzregel** gegen Rechteausweitung, serverseitig erzwungen:

- Die Präsidentenrolle (FOUNDER) ist fest, nicht änderbar oder löschbar und hat genau einen Inhaber (DB-Constraint). Niemand vergibt oder entzieht FOUNDER über den Rollenmechanismus; die Präsidentschaft wechselt nur durch Übergabe oder automatische Nachfolge.
- Wer Rollen anlegt, ändert, löscht oder zuweist, darf dabei nur Rechte vergeben, die er selbst hat.
- Niemand ändert Rollen eines Mitglieds oder wirft es hinaus, wenn es Rechte hält, die er selbst nicht hat.
- Niemand ändert seine eigenen Rollen.

Auflösen und Übergeben darf nur der Präsident. Der Präsident muss übergeben, bevor er austritt.

Zweitens müssen alle Mitglieder einer Allianz derselben **Fraktion** angehören. In STU ist die Fraktionsbindung optional.

Drittens sind Spieler der jeweils anderen Fraktion grundsätzlich **Feinde**, unabhängig von jeder Diplomatie. In STU entsteht Feindschaft nur durch Diplomatie.

Die Schutzregel schließt die Rechteausweitung aus STU aus (dort kann sich ein Vize Präsidentenrechte geben), und der feste Präsident verhindert Allianzen ohne Präsidenten. Die Pflicht-Fraktion und die feste Feindschaft folgen aus dem Star-Wars-Setting mit zwei verfeindeten Seiten.

## Considered Options

- **Drei feste Ämter (Präsident, Vize, Diplomat)**: bis 2026-11 umgesetzt, mit PO-Entscheidung M1 verworfen. Die Spieler sollen Allianzen wie in STU organisieren können.
- **Rollen wie STU ohne Einschränkung**: verworfen. Übernimmt die Rechteausweitung (STU-Bugs §11.1, §11.5 der Recherche).
- **Optionale Fraktionsbindung wie STU**: verworfen. Allianzen aus beiden Fraktionen würden den Grundkonflikt aufheben.

## Consequences

- Diplomatie zwischen Parteien (Allianzen und allianzlose Spieler) gibt es nur innerhalb einer Fraktion. Krieg und Frieden über die Fraktionsgrenze hinweg werden nicht verhandelt.
- Rechte werden ausschließlich über `hasPermission` (STU `AllianceJobManager::hasUserPermission`) geprüft. Forumsmoderation hängt an EDIT_ALLIANCE, die interne Chronik an VIEW_ALLIANCE_HISTORY.
- Weitere STU-Bugs und Sicherheitslücken übernehmen wir nicht. Das Verhalten folgt sonst STU.
