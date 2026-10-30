# Lesende Handelsseite und Warenübersicht-Integration

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** tmw-T1c, tmw-D1

## Ziel
`/trade` zeigt Warenkonten, Handelsposten und Posteninfo ohne spätere Aktionen.

## Akzeptanzkriterien
- [ ] Tabs „Warenkonten“ und „Handelsposten“, Posteninfo und Navigation.
- [ ] Unbekannte Posten sichtbar ohne Ortslink.
- [ ] Kontobestände als Warenortquelle; Frontendtests für beide Tabs.

## Comments
- 2026-10-27: Implementierung und fokussierte Tests waren grün, ebenso `nx run-many --targets=build`. Der vorgeschriebene vollständige Check scheitert nach zwei ernsthaften Versuchen reproduzierbar ausschließlich am bestehenden, isoliert grünen Frontendtest `research.spec.tsx:648` (`getByRole('button', { name: /eine von/ })`). Produktcode gemäß Abbruchregel verworfen; bitte den flakigen/konkurrenzabhängigen Forschungstest stabilisieren oder bestätigen, dass ein isoliert grüner Wiederholungslauf für diesen Durchlauf genügt.
- 2026-10-30: Product-Owner-Entscheidung: Option 1. Die Implementierung wird gegen den aktuellen Repository-Stand erneut versucht; der historische Fehler in `research.spec.tsx:648` gilt nicht automatisch als fortbestehender Blocker. Das Issue ist wieder `ready-for-agent`. Die vorgeschriebenen Prüfungen bleiben unverändert und aktuelle Fehler sind nach der bestehenden Abbruchregel zu behandeln.
