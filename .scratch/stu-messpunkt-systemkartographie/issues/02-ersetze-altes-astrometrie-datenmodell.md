# 02: Ersetze das alte Astrometrie-Datenmodell

**What to build:** Der nicht produktive Ein-Tick-Auftrag wird vollständig durch einen persönlichen, systemgebundenen Kartographieplan ersetzt. Das Datenmodell sichert Zustände, Restpunkte und die exklusive Finalisierung robust gegen Wiederholung und Parallelität ab.

**Blocked by:** 01: Dokumentiere die Messpunkt-Kartographieentscheidung.

**Status:** resolved

- [ ] `spacecraft_astrometry_jobs`, seine Entity, Migration, DTOs und nicht mehr passende APIs werden vollständig zurückgebaut.
- [ ] Eine neue persistierte Entität enthält mindestens Spieler, Sternensystem, Zustand, verbleibende Messpunktfeld-IDs, Finalisierungsstart-/Tickdaten und das aktuell finalisierende Schiff.
- [ ] Pro Spieler und Sternensystem kann höchstens ein offener bzw. dauerhafter Kartographieeintrag bestehen; pro Eintrag kann höchstens eine Finalisierung gleichzeitig laufen.
- [ ] Die Migration ist auf einer frischen Datenbank vollständig und enthält die nötigen Fremdschlüssel/Indizes/Constraints.
- [ ] Bereits vorhandene nicht produktive Altaufträge werden nicht fachlich migriert; nach der Migration gibt es nur das neue Modell.
- [ ] Migrations- und Entity-/Service-Tests prüfen Schema, Idempotenz und Parallelitätsinvarianten.

**Closure:** Resolved by implementation commit `05772407f06a0b5a3f541aa7c3987c1fe01f5947` (`feat(cartography): replace astrometry persistence model`).
