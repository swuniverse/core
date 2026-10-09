# 11: Mitgliederübersicht – Lagerbestand einer Kolonie

**What to build:** Präsident und Vize klappen in der Mitgliederübersicht eine Kolonie auf und sehen deren Lagerbestand mit Warenarten und Mengen, um Lieferungen innerhalb der Allianz zu planen. Kolonien außerhalb der Allianz bleiben auch über geratene IDs unzugänglich.

**Blocked by:** 10: Mitgliederübersicht

**Status:** ready-for-agent

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/11-mitgliederuebersicht-koloniebestand.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Der Lese-Port liefert den Lagerbestand einer Kolonie (Warenart, Name, Menge).
- [ ] Authentifizierte Route unter der Allianz-ID mit Kolonie-ID, nur mit `viewMemberOperations`; die Kolonie muss einem aktuellen Mitglied dieser Allianz gehören und darf nicht aufgegeben sein, sonst Not Found.
- [ ] DTO in `packages/shared`.
- [ ] Die Mitgliederübersicht lädt den Bestand erst beim Aufklappen einer Kolonie und zeigt Lade- und Fehlerzustand.
- [ ] Verhaltenstests: Bestand für Kolonien eigener Mitglieder; Not Found für Kolonien Allianzfremder, ehemaliger Mitglieder, aufgegebene und nicht existierende Kolonien; Forbidden für Diplomat und Mitglied ohne Amt der eigenen Allianz.
- [ ] Frontend-Seitentest für das Nachladen beim Aufklappen.
