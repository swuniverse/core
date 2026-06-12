# Interface Design System

## Mobile App Shell / Bottom Navigation

- Geschuetzte App-Seiten laufen immer innerhalb von `AppShell`.
- Mobile Bottom-Navigation lebt zentral in `apps/frontend/src/components/layout/bottom-nav.tsx`.
- Bottom-Safe-Area wird global im Shell-`main` reserviert, nicht pro Seite einzeln.
- Standard fuer mobilen Content-Clearance:
  `pb-[calc(56px+env(safe-area-inset-bottom,0px)+8px)] md:pb-2`
- `AppShell`-Außencontainer bekommt kein mobiles Bottom-Padding, damit keine kuenstliche Scrollflaeche entsteht.
- Bottom-Nav Z-Index: `z-[60]`.
- Mobile More-Overlay liegt darueber: `z-[70]`.
- More-Sheet startet oberhalb der Tab-Bar mit:
  `bottom-[calc(56px+env(safe-area-inset-bottom,0px))]`.
- Seiten sollen keine Viewport-Height-Wrapper oder globale Overflow-Muster benutzen, die feste Navigation unten verdecken oder kuenstliche Scrollwege erzeugen.
- Geschuetzte Seiten nutzen kein rohes `min-h-screen`; bevorzugt shell-aware `100svh`-Berechnung oder natuerliche Inhaltshoehe.
- Fuer mobile Viewport-Math `100svh` statt `100vh` bevorzugen.

## Mobile Page Layout

- Mobile-first: Hauptlayouts zuerst `flex-col`, erst ab `md` in Reihen aufteilen.
- Desktop-Breiten wie `w-96`, `w-52`, `grid-cols-3` und feste Row-Layouts nur hinter `md:` oder groesser, wenn mobil nicht sicher.
- Dichte Datenzeilen auf mobil `flex-wrap`, erst ab `md` wieder `flex-nowrap`.
- Tabellen-/Datenkarten mit potentieller Breite bekommen `overflow-x-auto`, damit nie Page-Level-Horizontaloverflow entsteht.
- Feste Navigation hat Vorrang vor dekorativem Full-viewport-Layout.
