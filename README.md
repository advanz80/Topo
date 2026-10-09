# Topo Race 🏁

Topografiespel van Nederland voor kinderen, gemaakt voor de iPad. Er zijn geen accounts en er wordt niets gebouwd: het zijn alleen statische bestanden.

**Levels:** Provincies · Hoofdsteden · Bonus (Amsterdam, Rotterdam, Enschede, Eindhoven, Schiphol, Duitsland, België) · Grote toets (alles door elkaar)
**Spelvormen:** 📖 Leren · 👆 Aanwijzen · 🔤 Kiezen · ⌨️ Typen. Je speelt tegen de klok: elke fout kost +5 sec. Je record wordt per level en spelvorm op het apparaat bewaard.

## Online zetten (GitHub Pages)
1. Ga naar **Settings → Pages** in de repo.
2. Kies bij *Source* "Deploy from a branch", met branch `main` en map `/ (root)`.
3. Na ongeveer een minuut staat het spel op `https://advanz80.github.io/Topo/`.
4. Op de iPad open je die link in Safari en kies je **Deel → Zet op beginscherm**. Dan start het spel schermvullend, net als een app, en werkt het ook offline.

## Uitbreiden
Alles wat in het spel zit, staat in `js/levels.js`.

- **Nieuwe stad:** voeg een item toe met `type: 'city'`, `at: [lat, lon]`, en eventueel `hint: 'Xx'` (dan staan de letters altijd op de kaart).
- **Nieuw level:** voeg een object toe aan `groups[].levels` met `id`, `title`, `emoji`, `color`, `desc` en `items` (een lijst met id's). Met `from: [levelIds]` combineer je bestaande levels.
- **Inzoomen op een provincie:** geef een level `view: [x, y, breedte, hoogte]` mee, in kaarteenheden. De hele kaart is 903×981.
- **Locked kaartjes** (`locked: true`) zijn de plaatshouders voor de levels per provincie.
- Nieuwe gebieden (bijvoorbeeld rivieren of gemeenten) hebben eigen vormen nodig. Die maak je met `tools/build_map.py`; de bronnen staan bovenin dat script.

Lokaal testen: `python3 -m http.server` en dan naar http://localhost:8000 gaan.
