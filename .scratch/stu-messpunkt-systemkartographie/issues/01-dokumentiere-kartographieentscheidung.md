# 01: Dokumentiere die Messpunkt-Kartographieentscheidung

**What to build:** Die fachliche Ablösung der Ein-Tick-Astrometrie durch die persönliche, systemgebundene STU-Messpunktkartographie ist dauerhaft dokumentiert. Begriffe, Zustandsmaschine und bewusste SWU-Abweichungen sind für künftige Entwicklung eindeutig.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Eine ADR dokumentiert die Ablösung von `spacecraft_astrometry_jobs` durch `PLANNABLE → PLANNED → MEASURED → FINISHING → DONE`.
- [ ] Die ADR hält fest, dass der Kartographieplan einem Spieler und Sternensystem, nicht einem Schiff, gehört.
- [ ] Sie dokumentiert Astrometrie-Labor, SRS/LRS-/Tarnungsregeln, Messpunktphase, Drei-Tick-Finalisierung und die persönliche Entdeckung erst nach Erfolg.
- [ ] Die bewusste SWU-Abweichung, das Startfeld in allen Auswahlstufen auszuschließen, ist begründet.
- [ ] `CONTEXT.md` definiert Astrometrie-Labor, Kartographieplan, Messpunkt und Finalisierung; die noch fehlende Crew-XP-Belohnung wird als STU-Paritätslücke vermerkt.

## Comments

- Resolved by documentation commit `1c724b5` (`docs: document mapping cartography decision`).
