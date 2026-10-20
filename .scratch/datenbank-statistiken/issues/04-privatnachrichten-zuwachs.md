# 04: Privatnachrichten-Zuwachs

**What to build:** Beim Senden einer Nachricht im Ordner `PERSONAL` wird der Ereigniszähler hochgezählt. Der Chart zeigt den Zuwachs je **Zeiteinheit** und bleibt stabil, wenn Nachrichten später gelöscht werden.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] Das Senden einer Privatnachricht erhöht den Zähler; andere Ordner zählen nicht
- [x] Das Löschen einer Nachricht verändert den Verlauf nicht (Integrationstest)
- [x] Der Chart zeigt den Zuwachs je Zeiteinheit
