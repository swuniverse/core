# Willkommensnachricht der Fraktion

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Nach dem Abschluss des Onboardings (Heimatwelt beansprucht) erhält der Spieler genau einmal eine fraktionsspezifische Willkommensnachricht mit Einstiegshinweisen, wie STU `SendWelcomeMessage`. Die bestehende Willkommens-E-Mail bleibt unverändert.

Vorgabe gemäß Leitplanke 2: Text und Absender wählt der umsetzende Agent als Star-Wars-Äquivalent. Da SWU keine NPC-Konten hat, wird die Nachricht als Systemnachricht (`sendSystem`, idempotent über `deliveryKey`) zugestellt; der Absendername im Betreff/Text ist fraktionsspezifisch (z. B. „Oberkommando der Rebellenallianz“ bzw. „Imperiales Oberkommando“). Die Wahl wird unter „Entscheidungen“ in `map.md` festgehalten.

## STU-Quellen

- `src/Module/Message/Lib/SendWelcomeMessage.php` (fraktionsabhängiger Text, Absender Fraktions-NPC)

## SWU-Pfade

- `apps/backend/src/modules/onboarding/onboarding.service.ts#claimHomeworld`
- `apps/backend/src/modules/messaging/messaging.service.ts#sendSystem`
- `apps/backend/src/modules/faction/faction.service.ts` (Fraktionsnamen)
- `.scratch/stu-parity/map.md` (Abschnitt „Entscheidungen“)

## Akzeptanzkriterien

- [ ] Nach erfolgreichem `claimHomeworld` wird eine Systemnachricht mit `deliveryKey` `welcome:<userId>` zugestellt; wiederholte Aufrufe erzeugen keine zweite Nachricht.
- [ ] Text je Fraktion (Rebellenallianz, Galaktisches Imperium) auf Deutsch mit Hinweisen auf Kolonie, Forschung, HoloNet, Datenbank und Allianzen; Domänenbegriffe gemäß `CONTEXT.md`.
- [ ] Ein Fehler beim Zustellen bricht das Onboarding nicht ab (geloggt).
- [ ] Die Absender-/Textwahl ist als Zeile unter „Entscheidungen“ in `map.md` dokumentiert.
- [ ] Backend-Tests: Nachricht wird für beide Fraktionen erzeugt; Idempotenz; Onboarding bleibt bei Zustellfehler erfolgreich.

## Comments
