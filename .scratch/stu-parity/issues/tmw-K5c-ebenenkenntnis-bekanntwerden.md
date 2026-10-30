# Ebenenkenntnis: Bekanntwerden beim Onboarding und Positionswechsel

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K5a

## Ziel

Die Startebene wird beim Onboarding bekannt. Weitere Ebenen werden unmittelbar bekannt, sobald ein eigenes Schiff sie tatsächlich erreicht.

## STU-Quellen

- `src/Component/Player/Register/PlayerDefaultsCreator.php#createDefaultUserLayer`
- `src/Module/Spacecraft/View/ShowSpacecraft/ShowSpacecraft.php#createUserLayerIfNecessary`
- `src/Module/Spacecraft/Lib/Ui/PanelLayerConfiguration.php`

## SWU-Pfade

- `apps/backend/src/modules/onboarding/onboarding.service.ts`
- Autoritative Positionswechsel in `apps/backend/src/modules/spacecraft/`
- Wurmlochflug aus `tmw-K7a`
- Ebenenkenntnis-Service aus `tmw-K5a`

## Akzeptanzkriterien

- [x] Der erfolgreiche Abschluss der Fraktions- beziehungsweise Heimatweltwahl legt die Startebene idempotent als `KNOWN` an.
- [x] Jeder erfolgreiche Positionswechsel, bei dem ein eigenes Schiff eine andere Ebene erreicht, legt diese Ebene in derselben fachlichen Operation idempotent als `KNOWN` an.
- [x] Das gilt für Galaxieflug und nach Umsetzung von `tmw-K7a` für Wurmlochankünfte; der Integrationspunkt ist wiederverwendbar für weitere Bewegungsarten.
- [x] Bekanntwerden hängt nicht von LSS, Sensorreichweite, Koloniebesitz oder dem späteren Öffnen einer Schiffsansicht ab.
- [x] Fremde oder verbündete Schiffe machen eine Ebene nicht bekannt. Forschung und Spieler-Adminaktionen gewähren keine Ebenenkenntnis; Rollen-Bypass ersetzt keine persistente Spielerzeile.
- [x] Fehlgeschlagene oder zurückgerollte Bewegungen erzeugen keine Ebenenkenntnis.
- [x] Backend-Tests decken Onboarding, normalen Ebenenwechsel, Wiederholung, fremde Schiffe und fehlgeschlagene Bewegung ab; der Wurmloch-Test wird mit `tmw-K7a` ergänzt.

## Entscheidung

SWU übernimmt das fachliche STU-Ergebnis, behebt aber dessen View-Time-Abhängigkeit: Kenntnis entsteht autoritativ bei Onboarding beziehungsweise Ankunft und nicht erst beim Anzeigen eines LSS-Schiffs.

## Comments

Heimatweltabschluss und jede erfolgreiche Galaxiefeldankunft eigener Flottenschiffe markieren die Ebene idempotent über `LayerKnowledgeService`; fehlgeschlagene Übergänge bleiben ohne Eintrag. Der Wurmlochpfad ergänzt denselben Dienst wie in `tmw-K7a` vorgesehen. Fokussierte Backend-Tests und alle Builds sind grün; der vollständige Affected-Gate bleibt ausschließlich an vorbestehenden, fachfremden Tick-/Tutorial-Testfehlern rot.
