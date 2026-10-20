# 03: Ereigniszähler + geflogene Felder

**What to build:** Eine Stundenzähler-Tabelle (Kennzahl, Stunde, Anzahl) samt Migration und eine Zählung bei jeder erfolgreichen Schiffsbewegung. Der **Snapshot** „Geflogene Felder letzte 24 h“ ist die Summe der letzten 24 Stundenzeilen und erscheint als Chart.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Jede Schiffsbewegung erhöht den Zähler der aktuellen Stunde um die zurückgelegten Felder
- [ ] Der Snapshot nach einem Haupttick entspricht der Summe der letzten 24 Stunden (Integrationstest)
- [ ] Fehlgeschlagene Bewegungen werden nicht gezählt
- [ ] Der Chart erscheint auf der Statistikseite
