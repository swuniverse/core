# 02: Allianzchronik – Gründung und Mitgliedschaft (Tracer Bullet)

**What to build:** Aktuelle Allianzmitglieder öffnen von der Allianzseite aus die interne **Allianzchronik** und sehen – neueste zuerst, seitenweise nachladbar – Gründung, Beitritte, Austritte und Rauswürfe ihrer Allianz mit Akteur, Betroffenem und Zeitpunkt. Nichtmitglieder und ehemalige Mitglieder können sie weder sehen noch abrufen. Die öffentliche Diplomatie-Chronik bleibt davon getrennt.

**Blocked by:** None (can start immediately)

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/02-allianzchronik-gruendung-und-mitgliedschaft.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] Rückwärtskompatible Migration mit Migrationstest für die Allianzchronik: Allianzreferenz mit Kaskade bei Auflösung, Ereignistyp, Akteur- und Betroffenen-ID (bei Kontolöschung null) samt Namen zum Ereigniszeitpunkt, Zeitpunkt, kleine JSON-Metadaten; Index für Allianz, Zeitpunkt absteigend, ID.
- [ ] Ereignistypen `FOUNDED` (Akteur = Gründer), `MEMBER_JOINED` (Akteur = annehmender Verantwortlicher, Betroffener = neues Mitglied), `MEMBER_LEFT` (Akteur = Betroffener), `MEMBER_KICKED` (Akteur = Verantwortlicher, Betroffener = Entfernter); das Typenset ist für spätere Etappen erweiterbar.
- [ ] Gründung, Bewerbungsannahme, Austritt und Rauswurf schreiben ihren Eintrag in ihrer bestehenden Transaktion; scheitert der Eintrag, scheitert die Aktion. Verhalten, Rechte und Systemnachrichten dieser Aktionen bleiben unverändert.
- [ ] Bewerbungen und abgelehnte Bewerbungen erzeugen keine Einträge; Diplomatieereignisse erscheinen nicht in der Allianzchronik und umgekehrt.
- [ ] Authentifizierte Leseroute unter der Allianz-ID, Cursor-Paginierung neueste zuerst mit der Seitengröße der Diplomatie-Chronik; nur aktuelle Mitglieder, alle anderen erhalten Not Found. Es gibt keine Änderungs- oder Löschroute.
- [ ] DTOs und Ereignistypen in `packages/shared`, getrennt von den Typen der Diplomatie-Chronik.
- [ ] Die Betrachteraktionen der Allianzdetailansicht erhalten „Chronik lesen“; die Detailseite verlinkt die neue Chronikseite nur bei gesetzter Fähigkeit.
- [ ] Die Chronikseite zeigt Einträge mit verständlichen deutschen Texten und lädt ältere Einträge nach.
- [ ] `AllianceService`-Verhaltenstests (In-Memory-Store): genau ein erwarteter Eintrag je Aktion mit Namen zum Ereigniszeitpunkt; keine Einträge bei scheiternden Aktionen; Zugriff nur für aktuelle Mitglieder, Verlust nach Austritt und Rauswurf; Paginierung.
- [ ] Frontend-Seitentests mit gemockter API: Einträge, Nachladen, Link nur bei Fähigkeit.

## Answer

Merged on integration/interne-zusammenarbeit. `alliance_chronicle_entries` table, `AllianceService.appendAllianceChronicle(tx, ...)`, `GET /alliances/:id/chronicle`, frontend `AllianceChroniclePage`.
