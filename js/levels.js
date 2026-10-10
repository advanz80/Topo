// Inhoud van het spel: alle plaatsen/gebieden en de levels.
// Nieuw level toevoegen? Zie README.md → "Uitbreiden".

window.TOPO = {
  // Alles wat gevraagd kan worden.
  // type: 'region' (provincie, pad uit map.regions), 'land' (pad uit map.lands),
  //       'city' (stip op lat/lon), 'water' (alleen label, nog niet vraagbaar)
  // label: [lat, lon] waar de naam staat (provincies/landen)
  // dir: kant van het label naast een stip: r (rechts), l, t (boven), b (onder)
  // hint: korte hint die altijd op de kaart staat (zoals op de schoolkaart)
  items: {
    // ── Provincies ──
    groningen:  { name: 'Groningen', type: 'region', ref: 'PV20', label: [53.27, 6.78], capital: 'c_groningen' },
    friesland:  { name: 'Friesland', type: 'region', ref: 'PV21', label: [53.04, 5.78], capital: 'c_leeuwarden', aliases: ['Fryslân'] },
    drenthe:    { name: 'Drenthe', type: 'region', ref: 'PV22', label: [52.84, 6.6], capital: 'c_assen' },
    overijssel: { name: 'Overijssel', type: 'region', ref: 'PV23', label: [52.44, 6.42], capital: 'c_zwolle' },
    flevoland:  { name: 'Flevoland', type: 'region', ref: 'PV24', label: [52.55, 5.62], capital: 'c_lelystad' },
    gelderland: { name: 'Gelderland', type: 'region', ref: 'PV25', label: [52.15, 6.05], capital: 'c_arnhem' },
    utrecht:    { name: 'Utrecht', type: 'region', ref: 'PV26', label: [52.03, 5.32], capital: 'c_utrecht' },
    nholland:   { name: 'Noord-Holland', type: 'region', ref: 'PV27', label: [52.62, 4.88], capital: 'c_haarlem' },
    zholland:   { name: 'Zuid-Holland', type: 'region', ref: 'PV28', label: [51.98, 4.62], capital: 'c_denhaag' },
    zeeland:    { name: 'Zeeland', type: 'region', ref: 'PV29', label: [51.42, 3.95], capital: 'c_middelburg' },
    nbrabant:   { name: 'Noord-Brabant', type: 'region', ref: 'PV30', label: [51.58, 5.05], capital: 'c_denbosch' },
    limburg:    { name: 'Limburg', type: 'region', ref: 'PV31', label: [51.2, 5.92], capital: 'c_maastricht' },

    // ── Hoofdsteden ──
    c_groningen:  { name: 'Groningen', type: 'city', at: [53.219, 6.567], dir: 'l', province: 'groningen' },
    c_leeuwarden: { name: 'Leeuwarden', type: 'city', at: [53.201, 5.799], dir: 't', province: 'friesland' },
    c_assen:      { name: 'Assen', type: 'city', at: [52.993, 6.565], dir: 'r', province: 'drenthe' },
    c_zwolle:     { name: 'Zwolle', type: 'city', at: [52.516, 6.083], dir: 'l', province: 'overijssel' },
    c_lelystad:   { name: 'Lelystad', type: 'city', at: [52.518, 5.471], dir: 'b', province: 'flevoland' },
    c_arnhem:     { name: 'Arnhem', type: 'city', at: [51.985, 5.899], dir: 'r', province: 'gelderland' },
    c_utrecht:    { name: 'Utrecht', type: 'city', at: [52.091, 5.122], dir: 'b', province: 'utrecht' },
    c_haarlem:    { name: 'Haarlem', type: 'city', at: [52.381, 4.637], dir: 'l', province: 'nholland' },
    c_denhaag:    { name: 'Den Haag', type: 'city', at: [52.078, 4.3], dir: 'l', province: 'zholland', aliases: ["'s-Gravenhage", 'Den Haag'] },
    c_middelburg: { name: 'Middelburg', type: 'city', at: [51.499, 3.614], dir: 'b', province: 'zeeland' },
    c_denbosch:   { name: "'s-Hertogenbosch", type: 'city', at: [51.697, 5.304], dir: 't', province: 'nbrabant', aliases: ['Den Bosch', 's Hertogenbosch', 'Hertogenbosch'] },
    c_maastricht: { name: 'Maastricht', type: 'city', at: [50.851, 5.691], dir: 'l', province: 'limburg' },

    // ── Bonus ──
    amsterdam: { name: 'Amsterdam', type: 'city', at: [52.373, 4.893], dir: 'r', hint: 'Am' },
    rotterdam: { name: 'Rotterdam', type: 'city', at: [51.922, 4.479], dir: 'b', hint: 'Ro' },
    enschede:  { name: 'Enschede', type: 'city', at: [52.221, 6.894], dir: 'b', hint: 'En' },
    eindhoven: { name: 'Eindhoven', type: 'city', at: [51.441, 5.478], dir: 'b', hint: 'EH' },
    schiphol:  { name: 'Schiphol', type: 'city', at: [52.31, 4.768], dir: 'b', hint: 'Sc', icon: '✈' },
    duitsland: { name: 'Duitsland', type: 'land', ref: 'DEU', label: [52.0, 7.5], hint: 'Du' },
    belgie:    { name: 'België', type: 'land', ref: 'BEL', label: [50.82, 4.5], hint: 'Be', aliases: ['Belgie', 'Belgium'] },

    // ── Water (decoratie, later misschien vraagbaar) ──
    noordzee:   { name: 'Noordzee', type: 'water', label: [52.75, 3.75] },
    waddenzee:  { name: 'Waddenzee', type: 'water', label: [53.285, 5.22], rotate: -33, size: 15 },
    ijsselmeer: { name: 'IJsselmeer', type: 'water', label: [52.8, 5.3] },
  },

  // Levels op het keuzescherm, per groep.
  // view: optioneel [x, y, breedte, hoogte] in kaarteenheden om in te zoomen (voor latere regio-levels)
  groups: [
    {
      title: 'Heel Nederland',
      levels: [
        { id: 'provincies', title: 'Provincies', emoji: '🗺️', color: '#ff8a3d',
          desc: 'De 12 provincies',
          items: ['groningen', 'friesland', 'drenthe', 'overijssel', 'flevoland', 'gelderland', 'utrecht', 'nholland', 'zholland', 'zeeland', 'nbrabant', 'limburg'] },
        { id: 'hoofdsteden', title: 'Hoofdsteden', emoji: '🏙️', color: '#3d9bff',
          desc: 'De 12 hoofdsteden',
          items: ['c_groningen', 'c_leeuwarden', 'c_assen', 'c_zwolle', 'c_lelystad', 'c_arnhem', 'c_utrecht', 'c_haarlem', 'c_denhaag', 'c_middelburg', 'c_denbosch', 'c_maastricht'] },
        { id: 'bonus', title: 'Bonus', emoji: '⭐', color: '#b05cff',
          desc: 'Amsterdam, Rotterdam, Schiphol en meer',
          items: ['amsterdam', 'rotterdam', 'enschede', 'eindhoven', 'schiphol', 'duitsland', 'belgie'] },
        { id: 'toets', title: 'Grote toets', emoji: '🏆', color: '#ffc21a',
          desc: 'Alles door elkaar!',
          from: ['provincies', 'hoofdsteden', 'bonus'] },
      ],
    },
    {
      title: 'Per provincie — binnenkort',
      levels: [
        'Groningen', 'Friesland', 'Drenthe', 'Overijssel', 'Flevoland', 'Gelderland',
        'Utrecht', 'Noord-Holland', 'Zuid-Holland', 'Zeeland', 'Noord-Brabant', 'Limburg',
      ].map(n => ({ id: 'p_' + n.toLowerCase(), title: n, emoji: '🔒', locked: true, desc: 'Komt later dit jaar' })),
    },
  ],
};
