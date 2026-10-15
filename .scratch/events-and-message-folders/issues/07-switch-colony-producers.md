# 07: Kolonie-Produzenten und Oberflächen auf Nachrichten umstellen

**What to build:** Tick- und Aktionsereignisse der Kolonie werden künftig als Kolonie-Nachrichten zugestellt. Spielende finden sie im Ordner Kolonien; das bisherige Kolonie-Ereignis-Panel sowie abgelöste APIs und Projektionen werden ohne verwaiste Oberflächen entfernt.

**Blocked by:** 05: Ordnerpostfach und Header-Leiste ausliefern; 06: Kolonieereignisse idempotent in Kolonie-Nachrichten migrieren.

**Status:** resolved

- [ ] Alle bisherigen Tick- und Aktionsauslöser erzeugen genau eine Kolonie-Nachricht statt eines neuen Kolonieereignisses.
- [ ] Kolonie-Nachrichten bewahren ihre Schweregradinformation und ermöglichen den Koloniebezug für Darstellung oder Navigation.
- [ ] Das alte Kolonie-Ereignis-Panel, abgelöste Endpunkte und ungenutzte Detaildaten sind entfernt oder fachlich stillgelegt.
- [ ] Temporäre Echtzeit-Hinweise für Schiffsereignisse bleiben erhalten und werden nicht fälschlich als Kolonie-Nachrichten behandelt.
- [ ] Tests prüfen Tick- und Aktionsauslöser, Informations-/Warn-/kritische Meldungen sowie das Fehlen verwaister Kolonieereignis-Oberflächen.

## Comments

- Resolved on integration/events-and-message-folders.
