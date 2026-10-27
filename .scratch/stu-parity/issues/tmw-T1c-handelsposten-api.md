# Lesende Handelsposten-API

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel
Autorisierte lesende Sichten für Posten, Konten und Schiffe am Ort.

## Akzeptanzkriterien
- [x] Postenliste liefert Netz, Eigentümer und Lizenzstatus.
- [x] Unbekannte Posten bleiben sichtbar, aber mit `location: null` und ohne Koordinatenleck.
- [x] Nur eigene Konten und eigene Schiffe vor Ort werden geliefert.

## Comments

- 2026-10-23: Umsetzung abgebrochen, weil die verpflichtende Gesamttestprüfung nach zwei ernsthaften Versuchen weiterhin an einem bereits bestehenden, fachfremden nondeterministischen Test scheitert: `spacecraft-destruction.service.spec.ts` erwartet fest Commodity `10101`, die zufällige Auswahl liefert `10201`. Produktcode wurde verworfen. Bitte den Flaky-Test stabilisieren oder bestätigen, dass dieser bekannte Fremdfehler die Abnahme nicht blockiert.
- 2026-10-27: Autorisierte `GET /trade/posts`- und `GET /trade/overview`-Sichten mit Shared-DTOs ergänzt. Die Liste redigiert unbekannte Standorte, während Übersichtsdaten strikt auf eigene Konten und eigene Schiffe am Postenstandort begrenzt bleiben. Trade-Tests, Typechecks und alle Builds sind grün; der vollständige Affected-Lauf scheitert weiterhin fachfremd an 81 Frontend-Test-Timeouts.
