# 03: Bewerbungen

**What to build:** Allianzlose Spieler bewerben sich bei Allianzen ihrer **Fraktion**. Der **Präsident** nimmt Bewerbungen an oder lehnt sie ab. Wer angenommen wird, ist danach Mitglied ohne **Amt**. Vize-Rechte kommen erst in 05. Alle Beteiligten werden per Systemnachricht informiert. Spezifikation: `.scratch/alliance/spec.md`, User Stories 6, 17–29.

**Blocked by:** 02 (Allianz gründen, Liste und Detailseite)

**Status:** resolved

- [x] Bewerben ist nur möglich, wenn der Spieler allianzlos ist, die Allianz zu seiner Fraktion gehört, sie Bewerbungen annimmt und er dort noch keine offene Bewerbung hat. Bewerbungen bei mehreren Allianzen gleichzeitig sind erlaubt.
- [x] Der Bewerben-Button erscheint nur, wenn der Server die Aktion erlaubt. Bei Allianzen der anderen Fraktion fehlt er.
- [x] Der Bewerber kann seine Bewerbung zurückziehen. Dabei geht keine Nachricht raus.
- [x] Der Präsident sieht die offenen Bewerbungen, die ältesten zuerst, und kann sie annehmen oder ablehnen.
- [x] Bei der Annahme verfallen in einer Transaktion alle anderen Bewerbungen des Bewerbers. Präsident und Vizes der betroffenen Allianzen bekommen eine Nachricht.
- [x] Ist der Bewerber inzwischen anderswo Mitglied, scheitert die Annahme mit einer fachlichen Fehlermeldung.
- [x] Wer eine Allianz gründet, verliert dadurch alle eigenen offenen Bewerbungen.
- [x] Der Präsident kann Bewerbungen ein- und ausschalten. Beim Ausschalten werden alle offenen Bewerbungen abgelehnt, mit Nachricht an die Bewerber.
- [x] Systemnachrichten gehen erst nach dem Commit raus: bei einer Bewerbung an Präsident und Vizes, bei Annahme und Ablehnung an den Bewerber. Texte deutsch, nach den STU-Formulierungen.
- [x] Unit-Tests decken alle Regeln und Nachrichten ab.
- [x] Ein Integrationstest prüft zwei gleichzeitige Annahmen desselben Bewerbers in zwei Allianzen: Genau eine Annahme gelingt.
- [x] Frontend-Tests decken Bewerben, Zurückziehen und die Bewerbungsliste ab.

## Comments

Implemented in commit 13590f6 (feat(alliance): add alliances).
