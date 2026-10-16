# 08: Entferne Altverträge und sichere Kartographie Ende-zu-Ende

**What to build:** Die Ablösung hinterlässt keine irreführenden Ein-Tick- oder binären Kartographie-Schnittstellen. Sie ist über API, Migration, Tick, Bewegung und UI Ende-zu-Ende abgesichert.

**Blocked by:** 05: Integriere Messpunkte in die Bewegung; 06: Finalisiere Kartographie und entdecke Systeme; 07: Baue die kompakte Kartographieoberfläche.

**Status:** ready-for-agent

- [ ] Nicht mehr gültige `spacecraft/:id/astrometry`-Jobendpunkte sowie binäre `cartography`-/`survey`-Platzhalter werden entfernt oder auf den kanonischen neuen Vertrag umgestellt; keine alte Semantik bleibt erreichbar.
- [ ] Shared DTOs liegen ausschließlich in `packages/shared`; Frontend und Backend verwenden denselben zustandsbasierten Vertrag.
- [ ] API-/Controller-Tests prüfen Besitzergrenzen, Systemkontext und Nichtumgehbarkeit der Entdeckung.
- [ ] Migrationsintegration prüft frische Datenbank, Constraints und Rückbau der alten Jobstruktur.
- [ ] Ein E2E-Szenario deckt Laboraktivierung, Plan, zwei eigene Schiffe, Messpunkte, Prestige, Finalisierung, drei Ticks, Entdeckung und Endstatus ab.
- [ ] Ein E2E-/Integrationsszenario deckt Unterbrechung durch Flug/Tarnung/Sensorverlust/Brownout, Wiederaufnahme sowie Weltänderungs-/Feldverlustregeln ab.
- [ ] Es wird dokumentiert, dass Crew-XP bei Messpunkten noch aussteht, ohne dies Spielern als vorhandene Belohnung anzuzeigen.
