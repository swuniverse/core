# Allianz – Etappe 6: Siedler-Abkommen und Parteiwechsel

Status: ready-for-agent

Tracker: local Markdown issue tracker (`.scratch/alliance-stu-parity/siedler-abkommen-spec.md`)
Triage label: ready-for-agent

## Problem Statement

Diplomatie existiert in SWU bisher nur zwischen zwei Allianzen. Allianzlose Spieler – Siedler – können keinen Krieg erklären, keinen Frieden schließen und keine Freundschaft, kein Bündnis, kein Handelsabkommen und keine Vasallenschaft eingehen, weder untereinander noch mit einer Allianz. Wer allein spielt, hat damit nur die Fraktionsfeindschaft und die Mitgliedschaft in einer Allianz als Mittel, Verbündete zu haben. Die zentrale Freund-/Feind-Auflösung kennt allianzlose Spieler als Partei bereits im Prinzip, kann aber mangels Beziehungen nie etwas anderes als Neutral liefern.

Zugleich ist ungeklärt, was mit persönlichen Beziehungen geschieht, sobald ein Siedler eine Allianz gründet oder in sie aufgenommen wird: Ein Allianzmitglied vertritt ausschließlich seine Allianz und darf keine parallelen persönlichen Beziehungen führen.

## Solution

Dasselbe Beziehungsmodell – sechs **Beziehungstypen**, dieselbe Zustandsmaschine, **Beziehungsvorschläge**, **Beziehungsfreigaben**, **Vertragswerke**, **Diplomatie-Chronik** – gilt künftig für drei Parteienpaare derselben **Fraktion**:

- Allianz ↔ Allianz (bereits vorhanden),
- Allianz ↔ allianzloser Spieler,
- allianzloser Spieler ↔ allianzloser Spieler.

Ein allianzloser Spieler vertritt sich selbst und besitzt alle Diplomatierechte für seine Partei. Ein Allianzmitglied vertritt ausschließlich seine Allianz gemäß **Amt** und führt keine persönlichen Beziehungen. Ein Siedler-Bereich zeigt dem Siedler seine Beziehungen, Vorschläge und zulässigen Aktionen und erlaubt, andere Parteien seiner Fraktion zu wählen.

Gründet ein Siedler eine Allianz oder wird er aufgenommen, enden in derselben Datenbanktransaktion alle seine persönlichen aktiven Beziehungen, Vorschläge und ausstehenden Änderungen. Die Gegenparteien werden nach dem Commit informiert, die Diplomatie-Chronik bewahrt das Ende. Ein späterer Austritt stellt nichts wieder her. Die zentrale Auflösung wertet die neuen Beziehungen dynamisch aus, sodass Krieg, „Als Freund behandeln“ und „Live-Kartenpositionen teilen“ auch für Siedler an den bereits vorhandenen Spielpfaden wirksam werden.

Dieser Umfang schafft kein allgemeines Produkt für Kontaktlisten, Notizen oder Blocklisten.

## User Stories

1. As an alliance-less player, I want to open a settlers' diplomacy area, so that I can manage my own relationships.
2. As an alliance-less player, I want to see my active relationships with players and alliances, so that I understand my diplomatic position.
3. As an alliance-less player, I want to see proposals I sent and received separately, so that I know which actions are available.
4. As an alliance-less player, I want to search for other alliance-less players of my faction by name, so that I can pick a counterparty.
5. As an alliance-less player, I want to pick an alliance of my faction as a counterparty, so that I can negotiate with a group.
6. As an alliance-less player, I want players and alliances of the opposing faction to be unavailable as counterparties, so that the permanent faction hostility stays non-negotiable.
7. As an alliance-less player, I want to be unable to target myself, so that a relationship always has two distinct parties.
8. As an alliance-less player, I want the player search to expose only name and identity of other alliance-less players, so that no private data leaks through the picker.
9. As an alliance-less player, I want to declare war on another alliance-less player of my faction, so that war becomes active immediately without consent.
10. As an alliance-less player, I want to declare war on an alliance of my faction, so that I can be at war with a group.
11. As the president or diplomat of an alliance, I want to declare war on an alliance-less player of my faction, so that my alliance can act against a lone settler.
12. As the vice or an ordinary member of an alliance, I want no power to bind my alliance towards a player, so that the office matrix stays unchanged.
13. As a player, I want a war declaration to replace every active relationship, proposal and pending change of the pair, so that no stale state survives.
14. As an alliance-less player, I want to propose peace only while war is active, so that peace stays a transition out of war.
15. As an alliance-less player, I want to propose friendship, alliance, trade agreement and vassalage to a player or an alliance, so that all relationship types are available to me.
16. As a recipient, I want to accept, decline or withdraw proposals exactly as between alliances, so that there is one state machine.
17. As an alliance-less player, I want vassalage to show the proposer as lord and the recipient as vassal, so that direction is preserved for players as well.
18. As an alliance-less player, I want at most one active relationship and at most one pending proposal per pair, so that every pair has one unambiguous state.
19. As an alliance-less player, I want to end a non-war relationship, so that I am not trapped in an agreement.
20. As an alliance-less player, I want to be unable to end war directly, so that war only ends through accepted peace.
21. As an alliance-less player, I want to negotiate “Als Freund behandeln” and, for an alliance relationship, “Live-Kartenpositionen teilen”, so that settler agreements can have gameplay effects.
22. As an alliance-less player, I want permission and contract changes to require the other party's consent, so that nothing changes unilaterally.
23. As an alliance-less player, I want to attach a Vertragswerk of up to 20,000 characters to non-war proposals, so that terms are documented.
24. As an unrelated player, I want pending proposals and draft Vertragswerke of a settler to stay hidden even with a known identifier, so that negotiations remain confidential.
25. As any authenticated player, I want to see the active relationships of an alliance-less player and the contract of an active relationship, so that diplomacy stays public.
26. As any authenticated player, I want relationships between an alliance and a player to appear on the alliance's public page, so that its diplomatic position is complete.
27. As an alliance administrator, I want `$ALLIANCE_DIPLOMATIC_RELATIONS` to include player partners, so that the description reflects all active relationships.
28. As any authenticated player, I want the Diplomatie-Chronik of a settler and of an alliance to include events with player parties, so that history stays traceable.
29. As a player, I want chronicle entries with players to retain player name at event time, so that they stay intelligible after renames or account deletion.
30. As an alliance-less player who founds an alliance, I want all my personal relationships, proposals and pending changes to end in the same transaction, so that I never represent two parties.
31. As an alliance-less player whose application is accepted, I want the same atomic ending, so that joining has the identical effect.
32. As a player joining an alliance, I want a failure of the ending to abort the founding or acceptance, so that no half-joined state exists.
33. As a counterparty of a joining player, I want a system message after commit stating that the relationship ended because the player joined or founded an alliance, so that I understand why.
34. As a counterparty, I want a pending proposal with a joining player to disappear with a matching notice, so that I am not left waiting.
35. As a player, I want the chronicle to record relationship type, names at the event time, timestamp and end reason but not the Vertragswerk, so that no mutable content is duplicated.
36. As a former settler, I want leaving an alliance not to restore earlier personal relationships, so that history stays consistent.
37. As a member of an alliance, I want to see no personal-diplomacy actions for myself, so that only my alliance is represented.
38. As a member of an alliance, I want direct personal-diplomacy requests to be refused by the server, so that hidden buttons are not the security boundary.
39. As a player, I want a concurrent “join alliance” and “accept proposal” to end in one valid state, so that no personal relationship survives a committed membership.
40. As a player, I want a concurrent proposal creation against a player who is joining an alliance to either fail cleanly or be ended with the join, so that no orphaned proposal remains.
41. As a player, I want a dissolved alliance's members to start with no personal relationships, so that dissolution leaves no hidden state.
42. As a player, I want a war between two settlers to make them Enemies through the central resolution, so that existing alarm and combat consumers react.
43. As a player, I want “Als Freund behandeln” between two settlers to make them Friends, so that transfers and supply rights apply.
44. As a player, I want an alliance–player war to make the player an Enemy of every member of that alliance, so that war has a group-wide effect.
45. As a player, I want an alliance–player “Als Freund behandeln” relationship to make the player a Friend of every member, so that settlers can be integrated into an alliance's circle.
46. As a player, I want live positions to be shared with a settler only for an active, negotiated alliance relationship, so that the map effect keeps its agreed boundary.
47. As a settler, I want the shared live positions to disappear immediately when the relationship ends, so that rights do not outlive the agreement.
48. As a player, I want historical colony scans to stay limited to the current alliance, so that settler agreements do not leak scan data.
49. As a player, I want a relationship between Rebels and Empire players to be impossible, so that ADR 0001 stays binding.
50. As a player, I want the resolution to fail closed to Neutral on errors, so that a failure never grants friendship.
51. As a player, I want deleting an account to remove its party and relationships while chronicle entries remain, so that referential integrity holds.
52. As a player, I want settlers' diplomacy mutations to be rate limited, so that war and proposal creation cannot be spammed.
53. As a player, I want system messages only after the transaction committed and retryable without repeating the mutation, so that messaging and state cannot diverge.
54. As a player, I want lists and chronicles to be paginated, so that large histories stay usable.
55. As a developer, I want the personal-contact seam of the resolver to remain a no-op, so that contact lists stay a named future integration point.

## Implementation Decisions

- **Parteienmodell.** Die Party-Entität trägt bereits Allianz- oder Spielerverweis (genau eines von beiden). Allianzlose Spieler erhalten eine Spielerpartei, die bei der ersten Beziehung oder dem ersten Vorschlag angelegt wird; sie wird mit dem Konto gelöscht. Beziehungen, Vorschläge und Änderungsvorschläge referenzieren Parteien und brauchen keinen Umbau ihrer Struktur. Spielerparteien tragen keine Mitgliedschaft; Allianzparteien verschwinden mit der Allianz wie bisher.
- **Gemeinsame Zustandsmaschine.** Die vorhandene Diplomatie-Logik wird von Allianz-IDs auf Parteien verallgemeinert, nicht verdoppelt. Kanonische Paarbildung, Sperren des Paars in einer Transaktion, höchstens eine aktive Beziehung und ein ausstehender Vorschlag, Krieg ersetzt sofort alles, Frieden nur aus Krieg, Vasallenschaft gerichtet, Freigabengültigkeit („Als Freund behandeln“ außer Krieg/Frieden, „Live-Kartenpositionen teilen“ nur Bündnis), Vertragswerk 0–20.000 Zeichen nach Trim – alles gilt unverändert für alle drei Parteienpaare. Datenbankconstraints (Paar-Eindeutigkeit, Selbstbeziehung, Vasallen-Konsistenz) müssen für gemischte Parteitypen gelten und in einer rückwärtskompatiblen Migration angepasst werden, falls sie bisher Allianz-spezifisch formuliert sind.
- **Fraktionsregel.** Beide Parteien müssen derselben Fraktion angehören; eine Spielerpartei hat die Fraktion des Spielers. Es entstehen nie Zeilen für verschiedene Fraktionen.
- **Vertretung und Rechte.** Wer für eine Partei handelt, wird serverseitig aus dem Anfragenden abgeleitet: Allianzmitglied → seine Allianz, nur mit Präsident- oder Diplomatenrecht der bestehenden Matrix; allianzloser Spieler → seine Spielerpartei mit allen Diplomatierechten. Ein Allianzmitglied kann die Spielerpartei nicht ansprechen, auch nicht über manipulierte IDs. Vorschlagssender, Empfänger, Annahme, Ablehnung, Rückzug, Beenden prüfen die jeweils vertretene Partei.
- **Sichtbarkeit.** Aktive Beziehungen und ihr Vertragswerk sind für authentifizierte Spieler öffentlich; ausstehende Vorschläge, Änderungsentwürfe und deren Texte nur für die Vertreter der beiden beteiligten Parteien (bei Allianzen Präsident und Diplomat, bei Spielern der Spieler selbst). Allianzseiten und `$ALLIANCE_DIPLOMATIC_RELATIONS` zeigen aktive Beziehungen zu Spielerparteien; der Platzhalter rendert Spielernamen als reinen Text.
- **Gegenparteien-Auswahl.** Ein neuer, paginierter und serverseitig begrenzter Suchpfad liefert allianzlose Spieler der eigenen Fraktion (nur Kennung und Anzeigename, ohne die eigene Person, ohne Allianzmitglieder). Bestehende Allianzauswahl bleibt gültig. Die Rückgabe enthält nur, was für die Auswahl nötig ist.
- **Parteiwechsel.** Gründung und Annahme einer Bewerbung beenden in derselben Transaktion: aktive persönliche Beziehungen (einschließlich Krieg), Beziehungsvorschläge in beiden Richtungen und ausstehende Änderungen der Spielerpartei. Danach wird die Spielerpartei entfernt oder bleibt ohne Beziehungen leer. Scheitert eines davon, scheitert Gründung bzw. Annahme. Konkurrenz mit gleichzeitiger Annahme/Kriegserklärung wird über dieselbe Paar- bzw. Parteisperre serialisiert; keine persönliche Beziehung überlebt eine committete Mitgliedschaft. Der Austritt oder die Auflösung stellt nichts wieder her.
- **Chronik.** Die Diplomatie-Chronik wird so verallgemeinert, dass jede Seite eine Allianz oder ein Spieler sein kann. Ereignisse behalten Typ, Akteur, beide Parteien mit Namen zum Ereigniszeitpunkt, Beziehungstyp, Vasallenrichtung und – neu – den Endgrund „Partei ist einer Allianz beigetreten“. Das Vertragswerk wird nicht kopiert. Einträge bleiben unveränderlich (der vorhandene Unveränderlichkeits-Trigger gilt weiter), auch nach Konto- oder Allianzlöschung. Öffentlich lesbar je Partei (Allianz oder Siedler), paginiert, neueste zuerst. Der Endeintrag beim Parteiwechsel gilt als beendete aktive Beziehung; abgelehnte/zurückgezogene/implizit entfallene Vorschläge erscheinen weiterhin nicht.
- **Benachrichtigungen.** Wie bisher als Absicht in derselben Transaktion, Zustellung erst nach Commit über den wiederholbaren Pfad. Adressaten sind bei Allianzparteien alle Mitglieder, bei Spielerparteien der Spieler. Beim Parteiwechsel werden nur die Gegenparteien informiert. Texte nennen Akteur, Gegenpartei und Ausgang, nie vertrauliche Entwürfe. Der Empfängerverweis zerfällt bei Kontolöschung wie bisher per Cascade.
- **Zentrale Auflösung.** Die Partei eines Spielers ist seine Allianz, sofern er Mitglied ist, sonst seine Spielerpartei. Die Prioritätsreihenfolge bleibt: andere Fraktion → Feind; dieselbe Allianz → Freund (endgültig); aktiver Krieg zwischen den Parteien → Feind; aktive Beziehung mit „Als Freund behandeln“ → Freund; persönlicher Kontaktstatus (bleibt No-Op); sonst Neutral. Die Auflösung muss Beziehungen jeder Parteikombination laden (Siedler↔Siedler, Siedler↔Allianz, Allianz↔Siedler), beim Einlesen der Beziehungen des Betrachters beide Fälle abdecken, Mitgliedschaftsänderungen bei jeder Anfrage neu berücksichtigen und bei Fehlern geschlossen auf Neutral fallen. „Live-Kartenpositionen teilen“ wirkt nur in aktiven Bündnissen und für alle Mitglieder einer beteiligten Allianzpartei bzw. den beteiligten Siedler; der Kandidatenpfad der Sternenkarte liefert Mitglieder der Allianzpartner und Siedlerpartner. Historische Koloniescans bleiben allein an die aktuelle Allianz gebunden.
- **Schnittstellen.** Gemeinsame Request-/Response-DTOs liegen in `packages/shared` bei den vorhandenen Allianz-DTOs und werden um den Parteityp (Allianz oder Spieler) erweitert, nicht dupliziert. Die Fähigkeits- und Aktionsflags der Verwaltung werden serverseitig geliefert; das Frontend leitet keine Berechtigung aus der Rolle ab. Controller bleiben dünne, authentifizierte Adapter mit numerischen IDs und Validierung. Der Siedler-Bereich nutzt dieselben Aktionsendpunkte wie die Allianzverwaltung oder eine schmale Hülle darüber, jedoch mit der aus dem Anfragenden abgeleiteten Partei, nie mit einer vom Client frei wählbaren Absenderpartei.
- **Frontend.** Siedler-Diplomatie-Bereich (nur für Allianzlose sichtbar, wenn der Server die Fähigkeit meldet), Gegenparteiauswahl mit Spielersuche, dieselben Vorschlags-, Freigabe- und Vertragswerk-Dialoge wie in der Allianzdiplomatie; öffentliche Anzeige aktiver Beziehungen auf Allianzseiten und für Siedler; Chronik mit Spielerparteien. Aktionen deaktivieren sich während Requests und laden autoritativen Zustand nach.
- **Ratenbegrenzung.** Dieselbe serverseitige Begrenzung wie für Allianzdiplomatie gilt je handelndem Spieler und Partei; kein Cooldown, kein Ablauf.
- **Auslieferung.** Migrationen sind rückwärtskompatibel und vor Aktivierung ausgerollt; es gibt keinen Fähigkeitsschalter (Nutzerentscheidung vom 2026-10-09). Kein Frontend bietet eine Freigabe an, deren Serverwirkung fehlt.
- **Begriffe.** Es gelten die Begriffe aus `CONTEXT.md` (Beziehung, Beziehungstyp, Beziehungsvorschlag, Vertragswerk, Beziehungsfreigabe, Diplomatie-Chronik, Haltung). „Siedler“ wird in der UI für allianzlose Spieler verwendet und ist im Glossar zu ergänzen.

## Testing Decisions

- Ein guter Test prüft beobachtbares Verhalten: DTOs und serverberechnete Aktionen, Domänenfehler, committeten Zustand von Beziehung/Vorschlag/Chronik und ausgelöste Nachrichten. Keine Aufrufreihenfolgen, privaten Hilfsfunktionen oder ORM-Details.
- **Höchster und primärer Seam:** der Allianzdienst gegen die In-Memory-Ablage, wie in den früheren Etappen. Szenarien: alle drei Parteienpaare × alle Beziehungstypen, Vertretung je Amt und für Siedler, Fraktionsgrenze, Sichtbarkeit von Entwürfen, Gegenparteisuche, Parteiwechsel (Gründung und Annahme einer Bewerbung) mit Beziehungen, Vorschlägen, Änderungen, Chronik und Benachrichtigungen, Rollback bei Fehler.
- **Zweiter Seam:** der Beziehungsauflöser (vorhandene Tests) für die Prioritätsmatrix mit Spielerparteien, Mitgliedschaftswechsel bei jeder Anfrage, Fehlschließen und Live-Positions-Kandidaten.
- **Postgres-Integration:** Migration, gemischte Parteitypen, Paar-Eindeutigkeit, Cascade bei Kontolöschung, Chronik-Unveränderlichkeit und Konkurrenz: Beitritt gegen Annahme, Beitritt gegen Kriegserklärung, Beitritt gegen Vorschlag, zwei gleichzeitige Vorschläge Siedler↔Siedler; jeweils ein gültiger Endzustand ohne rohen Datenbankfehler.
- **Autorisierung:** jede Mutation direkt als Allianzmitglied (alle Ämter), als fremder Siedler und als Spieler der Gegenfraktion; fremde Entwürfe über bekannte IDs.
- **Frontend:** Komponententests mit der vorhandenen gemockten API für Sichtbarkeit nach Fähigkeit, Gegenparteisuche, Aktionsflags, Anzeige gemischter Beziehungen und Chronik, Laden/Fehler/Reload.
- **Ende-zu-Ende-Wirkung:** ein Fall pro vorhandenem Verbraucher (Transfers, Versorgung, Live-Positionen), dass ein Siedler-Krieg bzw. eine Siedler-Freundschaft dort ankommt und nach Parteiwechsel verschwindet.
- Prior Art: bestehende Alliance-Service-, Resolver-, Postgres-Integrations- und Frontend-Seitentests der Etappen 2–5.
- *Hinweis:* Die Seams entsprechen denen der Vorgängeretappen und wurden nicht neu eingeführt; eine ausdrückliche Rückfrage war in dieser Sitzung nicht möglich.

## Out of Scope

- Allgemeine Kontaktliste, persönliche Freund-/Feind-Markierungen, Notizen und Blockliste; der Resolver-Port für persönlichen Kontaktstatus bleibt ein No-Op.
- Persönliche Beziehungen von Allianzmitgliedern parallel zur Allianz.
- Wiederherstellung persönlicher Beziehungen nach Austritt oder Auflösung.
- Beziehungen zwischen Spielern oder Allianzen verschiedener Fraktionen.
- Neue Spielwirkungen jenseits der bereits angebundenen Verbraucher; Alarm-, Docking-, Wurmloch- und Handelspostenpfade bleiben benannte Integrationspunkte.
- Teilen historischer Scans mit Siedlerpartnern.
- Ausführung der Kontolöschung (Integrationspunkt `AllianceService.removeAccount`), Spielreset-Aufrufer.
- GraphViz-Diagramm, Websocket-Updates, Cooldowns, Ablauf, Mindestdauern.
- Bekannte STU-Bugs, `[translate]`-Blöcke, BBCode in Namen.

## Further Notes

- Letzte der sechs Etappen der Wayfinder-Map „Allianz – vollständige STU-Parität“; baut auf Diplomatie-Kern, Beziehungswirkungen, Allianz-Infrastruktur und Lebenszyklus auf (Entscheidungen: Ticket 12 und 13 der Map).
- Der Parteiwechsel ist die einzige Stelle, an der Mitgliedschafts- und Diplomatiedomäne in einer Transaktion zusammenlaufen; sie ist der Schwerpunkt der Konkurrenztests.
- Offene Prüfpunkte für die Umsetzung (technische Details, keine Produktentscheidung): ob bestehende Constraints und Chronik-Spalten Allianz-spezifisch formuliert sind und eine Migration brauchen, und ob der Öffentlichkeitsort „Siedlerseite“ eine eigene Route oder Teil eines vorhandenen Spielerprofils ist.
