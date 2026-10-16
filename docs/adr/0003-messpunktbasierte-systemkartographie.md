# Messpunktbasierte persönliche Systemkartographie

## Kontext und Entscheidung

Die frühere SWU-Astrometrie war ein schiffsgebundener Ein-Tick-Auftrag in `spacecraft_astrometry_jobs`. Sie kartographierte das aktuelle Sternensystem sofort nach einem Tick, sperrte Navigation und bildete weder das konkrete **Astrometrie-Labor** noch Messpunkte oder einen spielerbezogenen Fortschritt ab.

Diese Lösung wird vollständig abgelöst. Die persönliche, systemgebundene **Kartographie** folgt der Zustandsmaschine:

```text
PLANNABLE → PLANNED → MEASURED → FINISHING → DONE
```

Ein **Kartographieplan** gehört einem Spieler und einem Sternensystem, niemals einem bestimmten Schiff. Alle eigenen Schiffe dieses Spielers im betreffenden System sehen daher denselben Planstatus. Die nicht produktive Tabelle, Entity und API `spacecraft_astrometry_jobs` sowie ihre binären Kartographie-Endpunkte werden entfernt statt migriert.

## Ablauf

Ein qualifiziertes eigenes Schiff muss das konkrete, installierte, aktive und intakte **Astrometrie-Labor** sowie aktive und intakte Kurz- und Langstreckensensoren besitzen. Das Labor ist kein generischer Spezialslot und wird ausschließlich über die kompakte Informationszeile aktiviert oder deaktiviert. Seine Aktivierung kostet 1 EPS; während es aktiv ist, kostet es je Haupttick 1 EPS, auch ohne Plan oder außerhalb eines Systems. Tarnung sowie Labor- oder Sensorverlust und Brownout deaktivieren es nach der bestehenden Systemlogik.

In einem persönlich noch nicht entdeckten Sternensystem legt ein qualifiziertes Schiff den gemeinsamen Kartographieplan an. Die LRS-Ansicht wechselt dazu auf `CARTOGRAPHY`, ohne Sensoren implizit einzuschalten. Der Plan enthält höchstens fünf verschiedene **Messpunkte**. Ein qualifiziertes eigenes Schiff arbeitet einen verbleibenden Messpunkt ausschließlich beim tatsächlichen Anflug auf dessen Feld ab; die Messpunktphase sperrt Navigation nicht. Jeder Messpunkt bringt atomar 1 Prestige und eine In-Game-Mitteilung.

Nach dem letzten Messpunkt ist der Plan `MEASURED`. Ein qualifiziertes, sonst untätiges eigenes Schiff kann die **Finalisierung** für einmalig 15 EPS starten. Sie dauert drei erfolgreiche Hauptticks. Während `FINISHING` sind nur das finalisierende Schiff für Navigation und Reparaturen gesperrt; andere eigene Schiffe bleiben handlungsfähig und sehen den gemeinsamen Countdown. Flug, Zerstörung, Tarnung, Labor- oder Sensorverlust und Brownout dieses Schiffs setzen den Plan auf `MEASURED` zurück; die Messpunkte bleiben erhalten und die EPS werden nicht erstattet.

Erst die erfolgreiche Finalisierung erzeugt idempotent die persönliche **Systementdeckung** und vergibt 10 Prestige. `DONE` ist dauerhaft: Es sind keine weiteren Pläne, Punkte, Finalisierungen oder Belohnungen möglich. Der bisherige Navigationspfad darf keine Systementdeckung mehr erzeugen. Diese Entscheidung präzisiert ADR-0002: Astrometrie bedeutet nun den Abschluss dieses Kartographieablaufs, nicht den früheren Ein-Tick-Auftrag.

## Bewusste SWU-Abweichung

Die Messpunktauswahl bevorzugt bis zu zwei besiedelte Felder, danach kolonialisierbare und anschließend sichere zufällige Felder. Das aktuelle Startfeld wird in **allen** Auswahlstufen ausgeschlossen, auch bei zufälligen Feldern. Kanonisches STU schließt das Startfeld nicht durchgängig aus.

SWU wählt diese Abweichung bewusst, damit jeder Messpunkt einen tatsächlichen Anflug und damit einen beobachtbaren Kartographieschritt verlangt. Ein bereits besetztes Startfeld würde sonst ohne Bewegung sofort erledigt und den Zweck der Messpunktphase unterlaufen. Weniger als fünf Messpunkte sind zulässig; gibt es keinen Messpunkt, wechselt der Plan unmittelbar zu `MEASURED`.

## Konsequenzen

- Kartographiefortschritt bleibt beim Spieler und Sternensystem, bei Systemwechsel erhalten und bei Rückkehr unverändert sichtbar.
- Nicht-Laborschiffe desselben Spielers sehen im System den gemeinsamen Status schreibgeschützt; außerhalb des Systems sehen sie keinen fremden Systemplan.
- Sensor- oder Laborverlust pausiert die Messpunktphase nur; bereits erreichte Punkte bleiben bestehen.
- Nach einer erfolgreichen Finalisierung bleibt das Astrometrie-Labor aktiv, bis es manuell oder durch die bestehende Energie-/Systemlogik deaktiviert wird.
- Die kanonische STU-Belohnung von Crew-Erfahrung wird nicht umgesetzt, weil SWU keine Crew-XP-Infrastruktur hat. Diese offene STU-Paritätslücke ist in `CONTEXT.md` vermerkt.
