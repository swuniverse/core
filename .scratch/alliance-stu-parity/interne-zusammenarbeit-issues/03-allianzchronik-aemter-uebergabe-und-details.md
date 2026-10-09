# 03: Allianzchronik – Ämter, Übergabe und Details

**What to build:** Die Allianzchronik hält zusätzlich fest, wer wen zu welchem **Amt** ernannt oder abgesetzt hat, wer die Präsidentschaft manuell übergeben hat und wer welche Allianzdetails geändert hat. Mitglieder können damit Machtverhältnisse und Änderungen nachvollziehen.

**Blocked by:** 02: Allianzchronik – Gründung und Mitgliedschaft

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-issues/03-allianzchronik-aemter-uebergabe-und-details.md`)
**Spec:** `.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`

- [ ] `ROLE_CHANGED` für Ernennung und Absetzung mit altem und neuem Amt in den Metadaten, Akteur und Betroffenem.
- [ ] `PRESIDENCY_TRANSFERRED` mit bisherigem Präsidenten als Akteur und neuem Präsidenten als Betroffenem. Die Übergabe erzeugt genau diesen einen Eintrag und keine zusätzlichen `ROLE_CHANGED`-Einträge; das bisherige Amt des neuen Präsidenten steht in den Metadaten.
- [ ] `DETAILS_CHANGED` mit der Liste der tatsächlich geänderten Felder (Name, Beschreibung, Homepage, Farbe, Amtstitel, Bewerbungsannahme); bei Namensänderung zusätzlich alter und neuer Name. Beschreibung, Homepage-Inhalt und Amtstitel-Texte werden nicht kopiert.
- [ ] Eine Detailänderung ohne tatsächliche Änderung erzeugt keinen Eintrag.
- [ ] Alle Einträge entstehen in der Transaktion der auslösenden Aktion; Verhalten, Rechte und Nachrichten der Aktionen bleiben unverändert.
- [ ] Die Chronikseite stellt die neuen Ereignistypen mit Amtstiteln bzw. geänderten Feldern verständlich dar.
- [ ] `AllianceService`-Verhaltenstests für jeden Ereignistyp, für die No-op-Änderung und für scheiternde Aktionen; Frontend-Seitentests für die Darstellung.

## Answer

Merged on integration/interne-zusammenarbeit. ROLE_CHANGED, PRESIDENCY_TRANSFERRED, DETAILS_CHANGED written in the action transactions; frontend renders them in German.
