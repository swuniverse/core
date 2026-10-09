# 12: Gesamtintegration und Abschluss der Etappe

**What to build:** Die Etappe „Interne Zusammenarbeit“ ist über alle Rollen und Lebenszyklusfälle hinweg nachweislich sicher und vollständig: Auflösung entfernt Forum und Allianzchronik vollständig, Kontolöschung hinterlässt lesbare Verläufe ohne Personenreferenz, und kein direkter Request liefert einer unberechtigten Rolle Forum, Chronik oder Mitgliederdaten.

**Blocked by:** 02, 03, 04, 05, 06, 07, 09, 10, 11

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/12-gesamtintegration.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Postgres-Integrationstest: die bestehende Auflösung (durch den Präsidenten und durch Austritt des letzten Mitglieds) entfernt Boards, Themen, Beiträge und Allianzchronik vollständig über Kaskaden in derselben Transaktion; die Diplomatie-Chronik bleibt erhalten.
- [ ] Postgres-Integrationstest: Kontolöschung setzt Autor-, Moderator-, Akteur- und Betroffenenreferenzen auf null; festgehaltene Namen bleiben; die API zeigt „Gelöschter Siedler“ für Beitragsautoren.
- [ ] Postgres-Integrationstest: datenbankseitige Längenprüfungen von Forum und Chronik greifen.
- [ ] Controller-Autorisierungstests mit direkten Requests als Präsident, Vize, Diplomat, Mitglied ohne Amt, allianzloser Spieler und Mitglied einer anderen Allianz für alle Forums-, Chronik- und Mitgliederübersichtsrouten, inklusive manipulierter IDs in Pfad und Body.
- [ ] Der Integrationspunkt „spielereigene Stationen erscheinen in der Klassengruppierung der Mitgliederübersicht“ ist in der Dokumentation der Beziehungswirkungen nachgeführt.
- [ ] Die Etappe ist in `.scratch/alliance-stu-parity/map.md` als umgesetzt vermerkt; offene Punkte für „Lebenszyklus und Restparität“ (Chronikereignisse für Nachfolge und Banner, Nachfolge über die letzte Aktivität mit leeren Werten als älteste Aktivität) sind dort festgehalten.
- [ ] Gesamter Testlauf, Lint und Typecheck von Backend, Frontend und Shared sind grün.

## Answer

Merged on integration/interne-zusammenarbeit. alliance-requests.int-spec.ts (HTTP authorization matrix), alliance-lifecycle.int-spec.ts (cascades, account deletion, length checks, listRecentTopics); docs and map.md updated.
