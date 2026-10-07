# Beziehungswirkungen

Status: ready-for-agent

Tracker: local Markdown issue tracker (`.scratch/alliance-stu-parity/spec.md`)
Triage label: ready-for-agent

## Problem Statement

Nach dem Diplomatie-Kern können Allianzen derselben Fraktion Beziehungen, Beziehungstypen, Beziehungsvorschläge, Beziehungsfreigaben und Vertragswerke verwalten. Diese Zustände wirken jedoch noch nicht auf das eigentliche Spiel. **Freund**, **Feind** und **Neutral** werden weiterhin von einzelnen Spielsystemen unabhängig bestimmt; Beziehungsfreigaben wie „Als Freund behandeln“ und „Live-Kartenpositionen teilen“ bleiben folgenlos.

Dadurch können Spieler trotz einer aktiven Beziehung weiterhin als Feinde behandelt werden, Alarm- und Kampfreaktionen können von der Diplomatie abweichen, und vereinbarte Sichtbarkeit oder Zugangsrechte sind nicht wirksam. Die bestehende Diplomatie ist damit zwar sichtbar, aber noch nicht spielwirksam.

## Solution

SWU erhält eine zentrale, serverseitige Beziehungsauflösung. Jeder vorhandene Spielpfad, der Freund, Feind oder Neutral benötigt, fragt dieselbe Domänenschnittstelle ab und rekonstruiert die Beziehung nicht selbst.

Die Auflösung erfolgt parteienorientiert: Ein Spieler wird zunächst durch seine Allianz vertreten, sofern er Mitglied ist; allianzlose Spieler bleiben eigene Parteien. Ein aktiver Krieg gilt nur zwischen zwei verschiedenen Allianzen. Mitglieder derselben Allianz bleiben deshalb Freunde; ein Krieg zwischen zwei anderen Allianzen kann diesen Zustand nicht überschreiben.

Die Priorität für zwei verschiedene Parteien lautet:

1. Spieler aus verschiedenen Fraktionen sind **Feinde**.
2. Dieselbe Allianz → **Freunde**; dieser Zustand ist für ihre Mitglieder endgültig.
3. Ein aktiver Allianzkrieg zwischen den beiden verschiedenen Allianzparteien → **Feinde**.
4. Eine aktive Beziehung mit der Beziehungsfreigabe „Als Freund behandeln“ → **Freunde**.
5. Ein persönlicher Kontaktstatus kann greifen, sofern keine höherrangige Regel gilt.
6. Andernfalls sind die Parteien **Neutral**.

Die zentrale Auflösung wird auf alle in SWU vorhandenen entsprechenden Spielwirkungen angewandt. Feinde lösen die bestehenden Alarm- und Kampfreaktionen aus; Freunde erhalten die bereits vorgesehenen Schutz-, Transfer- und Versorgungsrechte. Direkte Angriffe bleiben den bestehenden Kampfregeln unterworfen. Beziehungsfreigaben werden nur dort wirksam, wo der jeweilige Spielpfad bereits existiert.

Nicht vorhandene eigenständige Spielsysteme werden nicht nur für diese Etappe neu gebaut. Für sie werden lediglich benannte Integrationspunkte und erwartete spätere Verbraucher festgehalten.

## User Stories

1. Als Spieler möchte ich, dass die Beziehung zwischen zwei Spielern oder Parteien zentral und konsistent aufgelöst wird, damit alle Spielsysteme dieselbe Antwort verwenden.
2. Als Spieler möchte ich, dass Spieler verschiedener Fraktionen immer als Feinde gelten, damit die grundlegende Fraktionsfeindschaft nicht durch Diplomatie aufgehoben wird.
3. Als Spieler möchte ich, dass Mitglieder derselben Allianz als Freunde gelten, damit die Allianzzugehörigkeit in den Spielwirkungen berücksichtigt wird.
4. Als Spieler möchte ich, dass ein aktiver Krieg zwischen zwei Allianzen sie als Feinde behandelt, damit Krieg unmittelbar spielwirksam ist.
5. Als Präsident oder Diplomat möchte ich, dass die Freigabe „Als Freund behandeln“ einer aktiven Beziehung beide beteiligten Parteien als Freunde behandelt, damit die ausgehandelte Wirkung nicht nur angezeigt wird.
6. Als Spieler möchte ich, dass ein persönlicher Kontaktstatus nur greift, wenn keine höherrangige Fraktions-, Allianz- oder Diplomatieregel entgegensteht, damit persönliche Markierungen keine grundlegenden Regeln überschreiben.
7. Als Spieler möchte ich, dass nicht durch eine höherrangige Regel bestimmte Parteien als Neutral behandelt werden, damit Neutral der eindeutige Standardzustand bleibt.
8. Als Spieler möchte ich, dass die Freund-Feind-Auflösung für Spieler und Allianzen funktioniert, damit Aktionen je nach vertretenem Parteityp dieselbe Domänenregel verwenden.
9. Als Spieler möchte ich, dass die Beziehung bei Änderungen der Allianzmitgliedschaft dynamisch neu aufgelöst wird, damit veraltete Mitgliedschaften keine Spielwirkungen hinterlassen.
10. Als Spieler möchte ich, dass die Beziehung bei Annahme, Beendigung oder Änderung eines Abkommens dynamisch neu aufgelöst wird, damit die neue aktive Diplomatie ohne manuellen Reset gilt.
11. Als Spieler möchte ich, dass ein Krieg alle niedrigerrangigen Freundschaftsfreigaben überstimmt, damit ein aktiver Krieg nicht gleichzeitig als Freundschaft behandelt wird.
12. Als Spieler möchte ich, dass eine gegnerische Fraktion auch bei bestehender persönlicher Freundschaft Feind bleibt, damit die Fraktionsgrenze sicher durchgesetzt wird.
13. Als Spieler möchte ich, dass die zentrale Auflösung serverseitig ausgeführt wird, damit direkte Requests keine abweichenden Freund- oder Feindwerte erzwingen können.
14. Als Spieler möchte ich, dass Alarm Gelb auf Feinde reagiert, damit feindliche Kontakte als Bedrohung erkannt werden.
15. Als Spieler möchte ich, dass Alarm Rot auf alle Nicht-Freunde reagiert, damit neutrale Kontakte nicht fälschlich als sicher gelten.
16. Als Spieler möchte ich, dass Freunde keine automatische Gegenreaktion auslösen, damit verbündete oder ausdrücklich befreundete Parteien nicht wie Angreifer behandelt werden.
17. Als Spieler möchte ich, dass bestehende Kampfreaktionen die zentrale Beziehungsauflösung nutzen, damit aktive Kriege und Freundschaftsfreigaben im Kampf berücksichtigt werden.
18. Als Spieler möchte ich, dass direkte Angriffe weiterhin den bestehenden Kampfregeln unterliegen, damit die neue Beziehungsschicht keine ausdrücklich erlaubten Kampfaktionen entfernt.
19. Als Spieler möchte ich, dass sensible Transfers nur an Freunde erlaubt werden, damit neutrale oder feindliche Parteien keine geschützten Transferpfade missbrauchen.
20. Als Spieler möchte ich, dass die Versorgung geschützter fremder Schiffe nur für Freunde möglich ist, damit die bestehende Sicherheitsgrenze erhalten bleibt.
21. Als Spieler möchte ich, dass jeder betroffene Transferpfad dieselbe Freundprüfung verwendet, damit einzelne Transferarten nicht versehentlich abweichende Regeln besitzen.
22. Als Spieler möchte ich, dass jeder betroffene Versorgungspfad dieselbe Freundprüfung verwendet, damit die Schutzregel überall gleich gilt.
23. Als Spieler möchte ich, dass die Beziehungsfreigabe „Live-Kartenpositionen teilen“ an den vorhandenen Sichtbarkeitspfad angebunden wird, damit eine vereinbarte Positionsteilung wirksam werden kann.
24. Als Spieler möchte ich, dass nur aktive und gültige Freigaben Live-Positionen sichtbar machen, damit ausstehende oder ungültige Vorschläge keinen Zugriff geben.
25. Als Spieler möchte ich, dass eine widerrufene oder beendete Beziehung Live-Positionen sofort nicht mehr teilt, damit Zugriffsrechte nicht über den Vertrag hinaus bestehen.
26. Als Spieler möchte ich, dass Allianzobjekte und Spielerpositionen nur nach den vorhandenen Sichtbarkeitsregeln angezeigt werden, damit Diplomatie nicht allgemeine Sichtbarkeit freischaltet.
27. Als Spieler möchte ich, dass gemeinsame Scans nur über den vorhandenen Scanpfad integriert werden, damit kein neuer Scanmechanismus für Allianzregeln entsteht.
28. Als Spieler möchte ich, dass die Freigabe für Live-Kartenpositionen nicht automatisch die gemeinsame Scanfreigabe bedeutet, damit beide Wirkungen getrennt verhandelbar bleiben.
29. Als Spieler möchte ich, dass Freund- und Feindwerte in betroffenen Zugriffskontrollen serverseitig geprüft werden, damit UI-Anzeigen nicht als Sicherheitsgrenze dienen.
30. Als Spieler möchte ich, dass Dockrechte nur gemäß den bestehenden Docking-Regeln und expliziten Privilegien wirken, damit eine Beziehung nicht ungefragt jeden Zugang freischaltet.
31. Als Spieler möchte ich, dass die spätere Anbindung von Wurmlochrechten dieselbe zentrale Beziehungsauflösung verwenden kann, damit kein zweites Freund-Feind-Modell entsteht.
32. Als Spieler möchte ich, dass die spätere Anbindung von Handelsposten-Zugängen dieselbe zentrale Beziehungsauflösung verwenden kann, damit Zugangsregeln konsistent erweiterbar bleiben.
33. Als Spieler möchte ich, dass ein neutraler Kontakt nicht wie ein Freund behandelt wird, sofern keine gültige Beziehungsfreigabe vorliegt, damit Schutzrechte nicht zu weit greifen.
34. Als Spieler möchte ich, dass ein Feind niemals durch einen persönlichen Kontaktmarker zum Freund wird, damit persönliche Daten keine Sicherheits- oder Fraktionsregeln umgehen.
35. Als Spieler möchte ich, dass die Auflösung auch bei allianzlosen Spielern deterministisch ist, damit die Siedler-Abkommen später dieselbe Schnittstelle verwenden können.
36. Als Spieler möchte ich, dass fehlende Parteien, gelöschte Beziehungen und ungültige Freigaben sicher als Neutral oder gemäß einer höheren Regel behandelt werden, damit keine offenen Zugriffsrechte entstehen.
37. Als Spieler möchte ich, dass Auflösungsfehler nicht zu einer privilegierten Freundbehandlung führen, damit ein Fehler sicher ausfällt.
38. Als Entwickler möchte ich eine einzige fachliche Auflösungsstelle haben, damit neue Spielsysteme nicht eigene Freund-, Feind- und Neutralregeln erfinden.
39. Als Entwickler möchte ich, dass Verbraucher eine kleine, stabile Fähigkeitsschnittstelle verwenden, damit spätere Integrationen ohne Umbau des Beziehungsmodells möglich sind.
40. Als Entwickler möchte ich, dass nicht vorhandene Spielsysteme als künftige Integrationspunkte dokumentiert werden, damit keine Allianzregel ein vollständiges fremdes System erzwingt.
41. Als Spieler möchte ich, dass bestehende Alarm-, Kampf-, Transfer- und Versorgungspfade nach der Aktivierung weiterhin funktionieren, damit die Etappe keine unbeabsichtigten Regressionen erzeugt.
42. Als Spieler möchte ich, dass Nachrichten, Fehler und sichtbare Zustände die Begriffe Freund, Feind und Neutral gemäß der Domäne verwenden, damit die Spielwirkung verständlich bleibt.

## Implementation Decisions

- Die zentrale Domänenschnittstelle löst eine Beziehung zwischen zwei Parteien auf und liefert genau einen Zustand: Freund, Feind oder Neutral. Ein Mitglied wird für Allianzbeziehungen durch seine Allianz vertreten; zwei Mitglieder derselben Allianz werden vor jeder externen Beziehung als Freunde erkannt. Verbraucher kennen keine Prioritätslogik.
- Die Priorität ist unveränderlich und folgt ADR 0001: andere Fraktion, gleiche Allianz, aktiver Krieg zwischen verschiedenen Allianzparteien, Freundfreigabe, persönlicher Kontakt, Neutral. Ein Krieg kann den Freundstatus von Mitgliedern derselben Allianz nicht überschreiben.
- Die Auflösung arbeitet dynamisch auf dem aktuellen Zustand. Es werden keine dauerhaft gespeicherten Freund- oder Feindwerte an Spieler, Allianzen oder Schiffe geschrieben.
- Die Parteiabstraktion bleibt mit dem Diplomatie-Kern kompatibel: Eine Partei ist ein Spieler oder eine Allianz. Für Allianzparteien wird die Mitgliedschaft des handelnden oder betroffenen Spielers berücksichtigt.
- Diplomatie bleibt auf Allianzen derselben Fraktion beschränkt. Cross-Faction-Feindschaft wird nicht als Beziehung gespeichert und kann nicht durch eine Beziehungsfreigabe überschrieben werden.
- Eine aktive Beziehung zählt für die Auflösung. Ausstehende Beziehungsvorschläge, Vertragswerkänderungen und ausstehende Beziehungsfreigaben erzeugen keine Spielwirkung.
- Die Freigabe „Als Freund behandeln“ wird nur aus dem aktiven Zustand gelesen. Ihre zulässigen Beziehungstypen bleiben die im Diplomatie-Kern festgelegten Typen.
- Die Freigabe „Live-Kartenpositionen teilen“ wird an den vorhandenen Sichtbarkeitspfad angebunden. Sie wird nicht als allgemeine Freundfreigabe interpretiert.
- Alarm Gelb prüft den zentralen Zustand auf Feind. Alarm Rot prüft den zentralen Zustand auf Nicht-Freund. Freunde lösen keine automatische Gegenreaktion aus.
- Kampfpfade verwenden die zentrale Auflösung für automatische Reaktionen und Schutzlogik. Bewusste direkte Angriffe bleiben durch ihre bisherigen Regeln und Berechtigungen bestimmt.
- Sensible Transfers und die Versorgung geschützter fremder Schiffe verlangen Freund gemäß der zentralen Auflösung. Ein neutraler oder feindlicher Zustand reicht nicht.
- Bestehende Docking-, Wurmloch-, Handelsposten- und Scanpfade werden nur angebunden, wenn sie im SWU-Code bereits existieren. Fehlende eigenständige Systeme werden nicht neu gebaut.
- Alle Autorisierungs- und Wirkungsprüfungen finden auf dem Server statt. Frontend-Gating ist rein darstellend und wird nicht als Sicherheitsgrenze verwendet.
- Die Schnittstelle liefert neben dem Zustand nur die für vorhandene Verbraucher notwendigen Fähigkeiten, beispielsweise `isFriend`, `isEnemy`, `mayReactAutomatically`, `mayTransferSafely`, `mayProvisionProtectedShip` und `mayShareLivePosition`. Verbraucher fragen Fähigkeiten ab, statt Beziehungstypen zu interpretieren.
- Fähigkeiten fallen bei fehlenden oder inkonsistenten Daten sicher aus. Ein Auflösungsfehler darf keinen Freundzugriff oder eine Sichtbarkeitsfreigabe eröffnen.
- Die zentrale Auflösung wird als höchste gemeinsame Seam getestet. Einzelne Verbraucher erhalten nur Verhaltenstests für ihre öffentlich beobachtbare Wirkung; interne Aufrufdetails werden nicht getestet.
- Die Integration darf keine neue persistente Beziehungstabelle oder redundante Freund-/Feindspalten einführen. Der Diplomatie-Kern bleibt die Quelle für aktive Beziehungen und Beziehungsfreigaben.
- Die späteren Siedler-Abkommen können dieselbe Auflösungsstelle erweitern, ohne die Verbraucher umzubauen. Persönliche Kontaktmarker bleiben dabei die niedrigste Priorität.

## Testing Decisions

- Gute Tests prüfen ausschließlich beobachtbares Verhalten: den aufgelösten Zustand, erlaubte oder verweigerte Aktionen, sichtbare Positionen, Alarmverhalten, Kampfreaktionen, Transfers und Versorgung. Sie prüfen keine privaten Resolver-Methoden, Repository-Aufrufreihenfolgen oder konkreten ORM-Abfragen.
- Die höchste Test-Seam ist die zentrale Beziehungsauflösung mit einem kleinen In-Memory-Domänenmodell. Sie deckt die vollständige Prioritätsmatrix ab: andere Fraktion, gleiche Allianz, Krieg, Freundfreigabe, persönlicher Kontakt und Neutral.
- Der Resolver wird mit allianzlosen Spielern, Mitgliedern derselben Allianz, Mitgliedern verschiedener Allianzen derselben Fraktion und Allianzen verschiedener Fraktionen getestet.
- Der Resolver wird mit aktiven, ausstehenden, beendeten und ungültigen Beziehungen getestet. Ausstehende Vorschläge und Änderungen dürfen keine Wirkung haben.
- Konflikttests prüfen, dass jede höhere Regel niedrigere Regeln überstimmt, insbesondere Cross-Faction-Feindschaft vor Freundfreigabe, Allianzzugehörigkeit vor Kontaktstatus und Krieg zwischen verschiedenen Allianzparteien vor Freundfreigabe. Ein expliziter Gegenfall prüft, dass Mitglieder derselben Allianz trotz eines Kriegs zwischen ihrer Allianz und einer dritten Allianz Freunde bleiben und dass kein Krieg zwischen derselben Partei auflösbar ist.
- Bestehende Alarmtests werden erweitert, um Alarm Gelb für Feinde, Alarm Rot für Nicht-Freunde und keine automatische Gegenreaktion für Freunde zu prüfen.
- Bestehende Kampftests werden an der vorhandenen Kampf-Seam erweitert. Sie prüfen automatische Reaktion und Schutzverhalten, nicht die interne Herkunft des Beziehungswerts.
- Bestehende Transfer- und Versorgungstests werden erweitert, um Freund, Neutral und Feind an der jeweils höchsten vorhandenen Aktion-Seam zu prüfen.
- Der vorhandene Sichtbarkeitspfad erhält Tests für aktive Freigabe „Live-Kartenpositionen teilen“, fehlende Freigabe, ausstehende Freigabe, beendete Beziehung und Cross-Faction-Parteien.
- Falls ein eigenständiger Scan-, Docking-, Wurmloch- oder Handelspostenpfad im aktuellen Code vorhanden ist, wird er an seiner bestehenden Service-Seam getestet. Falls er fehlt, wird nur der künftige Integrationspunkt dokumentiert und nicht durch einen neuen Testträger simuliert.
- Autorisierungstests senden direkte Requests als Präsident, Diplomat, Vize, Mitglied ohne Amt, allianzloser Spieler und Spieler der anderen Fraktion. Ein ausgeblendeter Button gilt nie als ausreichender Test.
- Datenbank-Integrationstests sind nur nötig, wenn die Integration neue Constraints oder Abfragen einführt. Für die reine Wirkungsschicht genügt die bestehende Service- und Integrationsabdeckung.
- Regressionstests müssen bestätigen, dass aktive Beziehungen weiterhin öffentlich angezeigt werden, Vertragswerke unverändert bleiben und eine Beziehungsänderung erst nach Annahme Wirkung entfaltet.
- Ein sicherer Fehlerfall wird getestet: fehlende Partei, inkonsistenter Beziehungseintrag oder Resolver-Fehler darf keinen Transfer, keine Versorgung und keine Live-Positionsfreigabe ermöglichen.

## Out of Scope

- Neue Beziehungstypen oder Änderungen an der Zustandsmaschine des Diplomatie-Kerns.
- Neue Beziehungsfreigaben oder eine Änderung der Berechtigungsgrenzen bestehender Freigaben.
- Diplomatie zwischen einer Allianz und einem allianzlosen Spieler; die gemeinsame Resolver-Seam wird dafür vorbereitet, die Abkommen selbst gehören zur Etappe Siedler-Abkommen.
- Das vollständige Bauen eines fehlenden Kampf-, Scan-, Wurmloch-, Docking-, Handelsposten- oder Versorgungssystems.
- Allianzforum, Banner, Allianzchronik und Verwaltungsansichten ohne Bezug zu Beziehungswirkungen.
- Graphdarstellungen, neue Live-Websocket-Infrastruktur oder neue Benachrichtigungstypen.
- Das Überschreiben bestehender Regeln für bewusst erlaubte direkte Angriffe.
- Bekannte STU-Bugs, Sicherheitslücken und unserverseitige Rechteprüfungen.
- Das dauerhafte Cachen von Freund-, Feind- oder Neutralwerten.

## Further Notes

- Status: ready-for-agent
- Die höchste Test-Seam wurde am 2026-10-07 erneut mit dem Nutzer bestätigt: Eine zentrale serverseitige Beziehungsauflösung vertritt Allianzmitglieder durch ihre Allianz, liefert Freund, Feind oder Neutral sowie abgeleitete Fähigkeiten; bestehende Verbraucher werden dort angebunden und mit Verhaltenstests geprüft.
- Diese Spezifikation ist die Etappe „Beziehungswirkungen“ aus `.scratch/alliance-stu-parity/map.md` und baut auf dem Diplomatie-Kern auf.
- ADR 0001 ist bindend: Die Rebellenallianz und das Galaktische Imperium bleiben grundsätzlich verfeindet; „Allianz“ bezeichnet ausschließlich einen Spielerzusammenschluss.
- Die zentrale Auflösung ist absichtlich die einzige neue fachliche Seam. Verbraucher sollen keine lokale Ersatzlogik erhalten.
- Die bestätigte Parteiensemantik verhindert den widersprüchlichen Zustand „Mitglieder derselben Allianz sind durch einen Allianzkrieg Feinde“: Krieg wird ausschließlich zwischen zwei verschiedenen Allianzparteien geprüft.
- Die Wirkungsschicht aktiviert nur vorhandene Spielpfade. Fehlende Systeme werden als spätere Integrationspunkte vermerkt, nicht als versteckte Zusatzanforderungen.
