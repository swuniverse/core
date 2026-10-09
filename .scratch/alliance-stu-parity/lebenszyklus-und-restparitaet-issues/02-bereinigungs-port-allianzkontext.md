# 02: Bereinigungs-Port für den Allianzkontext

**What to build:** Ein schmaler Port, bei dem künftige Depot- und Zugangssysteme Bereinigungen für „Allianz aufgelöst“, „Mitglied entfernt“ und „Reset“ registrieren. Austritt, Rauswurf und Auflösung rufen ihn innerhalb der jeweiligen Transaktion auf. Ohne Verbraucher ist er ein No-Op.

**Blocked by:** 01

**Status:** resolved

- [x] Ein Testverbraucher wird bei Austritt, Rauswurf und Auflösung genau einmal informiert
- [x] Ein Fehler des Verbrauchers rollt die Transaktion zurück (kein Teilzustand)
- [x] Ohne registrierte Verbraucher ändert sich kein Verhalten
- [x] Der Integrationsvertrag ist in der Doku der Allianz-Infrastruktur-Etappe verlinkt
