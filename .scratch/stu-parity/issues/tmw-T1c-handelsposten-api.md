# Lesende Handelsposten-API

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel
Autorisierte lesende Sichten für Posten, Konten und Schiffe am Ort.

## Akzeptanzkriterien
- [ ] Postenliste liefert Netz, Eigentümer und Lizenzstatus.
- [ ] Unbekannte Posten bleiben sichtbar, aber mit `location: null` und ohne Koordinatenleck.
- [ ] Nur eigene Konten und eigene Schiffe vor Ort werden geliefert.

## Comments

- 2026-10-23: Umsetzung abgebrochen, weil die verpflichtende Gesamttestprüfung nach zwei ernsthaften Versuchen weiterhin an einem bereits bestehenden, fachfremden nondeterministischen Test scheitert: `spacecraft-destruction.service.spec.ts` erwartet fest Commodity `10101`, die zufällige Auswahl liefert `10201`. Produktcode wurde verworfen. Bitte den Flaky-Test stabilisieren oder bestätigen, dass dieser bekannte Fremdfehler die Abnahme nicht blockiert.
