(() => {
  'use strict';

  const MAP = window.MAP_NL;
  const { items: ITEMS, groups: GROUPS } = window.TOPO;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const PENALTY = 5; // seconden straftijd per fout
  const MODES = [
    { id: 'leren', title: 'Leren', emoji: '📖', desc: 'Bekijk de kaart met alle namen. Geen tijd!' },
    { id: 'aanwijzen', title: 'Aanwijzen', emoji: '👆', desc: 'Tik de juiste plek aan op de kaart.' },
    { id: 'kiezen', title: 'Kiezen', emoji: '🔤', desc: 'Kies de goede naam uit 4.' },
    { id: 'typen', title: 'Typen', emoji: '⌨️', desc: 'Typ de naam zelf. Net als bij de toets!' },
  ];
  const REGION_COLORS = {
    PV20: '#f6c37a', PV21: '#9fd8a4', PV22: '#c9a7e8', PV23: '#f4a6a6', PV24: '#f9e27d', PV25: '#b8e08a',
    PV26: '#f7b267', PV27: '#e8a3c9', PV28: '#9ed9cf', PV29: '#f9e27d', PV30: '#d4b8f0', PV31: '#f6c37a',
  };
  const EXTRA_LANDS = ['Frankrijk', 'Engeland', 'Luxemburg', 'Denemarken'];

  // ── Opslag (records) ──
  const store = {
    key: 'toporace.v1',
    load() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; } },
    save(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch { /* privémodus */ } },
  };
  let saved = store.load();
  saved.records = saved.records || {};

  // ── Hulpjes ──
  const $ = s => document.querySelector(s);
  const el = (tag, attrs = {}, parent) => {
    const n = tag.startsWith('svg:') ? document.createElementNS(SVGNS, tag.slice(4)) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    if (parent) parent.appendChild(n);
    return n;
  };
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const proj = ([lat, lon]) => {
    const p = MAP.proj;
    return [(lon - p.lon0) * p.cos * p.k, (p.lat1 - lat) * p.k];
  };
  const fmt = s => {
    const m = Math.floor(s / 60), r = s - m * 60;
    return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
  };
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const lev = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  const levelById = id => GROUPS.flatMap(g => g.levels).find(l => l.id === id);
  const levelItems = lvl => lvl.items || lvl.from.flatMap(id => levelItems(levelById(id)));
  const describe = id => {
    const it = ITEMS[id];
    if (it.type === 'region' && it.capital) return `Hoofdstad: <b>${ITEMS[it.capital].name}</b>`;
    if (it.type === 'city' && it.province) return `Hoofdstad van <b>${ITEMS[it.province].name}</b>`;
    if (it.type === 'land') return 'Buurland van Nederland';
    if (it.type === 'city') return 'Belangrijke plaats';
    return '';
  };

  // ── Geluid ──
  let soundOn = saved.sound !== false;
  let actx;
  const beep = (notes) => {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      let t = actx.currentTime;
      for (const [f, d, type = 'sine'] of notes) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d);
        t += d * 0.8;
      }
    } catch { /* geen audio */ }
  };
  const sfx = {
    good: () => beep([[660, 0.09], [990, 0.14]]),
    bad: () => beep([[220, 0.22, 'square']]),
    win: () => beep([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.3]]),
  };
  const updateSoundBtn = () => { $('#soundBtn').textContent = soundOn ? '🔊' : '🔇'; };
  $('#soundBtn').addEventListener('click', () => {
    soundOn = !soundOn; saved.sound = soundOn; store.save(saved); updateSoundBtn();
  });
  updateSoundBtn();

  // ── Schermen ──
  const show = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    if (id === 'home') renderHome();
    if (id === 'modes') renderModes();
  };
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { stopGame(); show(go.dataset.go); }
  });

  let curLevel = null;

  function bestFor(levelId, modeId) { return saved.records[`${levelId}:${modeId}`]; }

  function renderHome() {
    const root = $('#groups');
    root.innerHTML = '';
    for (const g of GROUPS) {
      el('h3', { class: 'group-title', text: g.title }, root);
      const grid = el('div', { class: 'level-grid' }, root);
      for (const lvl of g.levels) {
        const card = el('button', { class: 'level-card' + (lvl.locked ? ' locked' : ''), style: lvl.color ? `--c:${lvl.color}` : '' }, grid);
        el('div', { class: 'lc-emoji', text: lvl.emoji }, card);
        el('div', { class: 'lc-title', text: lvl.title }, card);
        el('div', { class: 'lc-desc', text: lvl.desc }, card);
        if (!lvl.locked) {
          const recs = MODES.slice(1).map(m => bestFor(lvl.id, m.id)).filter(Boolean);
          if (recs.length) el('div', { class: 'lc-rec', text: `🏅 ${recs.length}/3 records` }, card);
          card.addEventListener('click', () => { curLevel = lvl; show('modes'); });
        } else {
          card.disabled = true;
        }
      }
    }
  }

  function renderModes() {
    if (!curLevel) return show('home');
    $('#modesTitle').textContent = `${curLevel.emoji} ${curLevel.title}`;
    const list = $('#modeList');
    list.innerHTML = '';
    for (const m of MODES) {
      const b = el('button', { class: 'mode-card', onclick: () => startGame(curLevel, m.id) }, list);
      el('div', { class: 'mc-emoji', text: m.emoji }, b);
      const t = el('div', { class: 'mc-text' }, b);
      el('div', { class: 'mc-title', text: m.title }, t);
      el('div', { class: 'mc-desc', text: m.desc }, t);
      if (m.id !== 'leren') {
        const r = bestFor(curLevel.id, m.id);
        el('div', { class: 'mc-rec', html: r ? `🏅 Record<br><b>${fmt(r.time)}</b>` : '⏱️<br>nog geen record' }, b);
      }
    }
  }

  // ── Kaart ──
  const svg = $('#map');
  let mapEls = {};   // id -> svg-element (pad of stip-groep)
  let viewScale = 1;

  function drawMap(lvl, mode) {
    svg.innerHTML = '';
    mapEls = {};
    const view = lvl.view || [0, 0, MAP.width, MAP.height];
    viewScale = view[2] / MAP.width;
    svg.setAttribute('viewBox', view.join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const inLevel = new Set(levelItems(lvl));
    const learn = mode === 'leren';

    el('svg:rect', { x: -500, y: -500, width: MAP.width + 1000, height: MAP.height + 1000, class: 'sea' }, svg);
    const gLand = el('svg:g', {}, svg);
    for (const iso of ['FRA', 'LUX', 'DEU', 'BEL']) {
      if (!MAP.lands[iso]) continue;
      const id = Object.keys(ITEMS).find(k => ITEMS[k].type === 'land' && ITEMS[k].ref === iso);
      const p = el('svg:path', { d: MAP.lands[iso], class: 'land' + (id && inLevel.has(id) ? ' target' : '') }, gLand);
      if (id) { p.dataset.id = id; mapEls[id] = p; }
    }
    const gReg = el('svg:g', {}, svg);
    for (const [code, d] of Object.entries(MAP.regions)) {
      const id = Object.keys(ITEMS).find(k => ITEMS[k].type === 'region' && ITEMS[k].ref === code);
      const p = el('svg:path', { d, class: 'region' + (inLevel.has(id) ? ' target' : ''), style: `--fill:${REGION_COLORS[code]}` }, gReg);
      p.dataset.id = id; mapEls[id] = p;
    }

    const gLabels = el('svg:g', { class: 'labels' }, svg);
    const fs = 1 * viewScale;
    // Waternamen als decoratie
    for (const [id, it] of Object.entries(ITEMS)) {
      if (it.type !== 'water') continue;
      const [x, y] = proj(it.label);
      el('svg:text', { x, y, class: 'lbl water', 'font-size': 18 * fs, text: it.name }, gLabels);
    }
    // Namen van gebieden (alleen in Leren-modus) en hints (altijd)
    for (const [id, it] of Object.entries(ITEMS)) {
      if (it.type !== 'region' && it.type !== 'land') continue;
      const [x, y] = proj(it.label);
      if (learn && inLevel.has(id)) {
        const t = el('svg:text', { x, y, class: 'lbl area', 'font-size': (it.type === 'land' ? 22 : 17) * fs, text: it.name }, gLabels);
        t.dataset.for = id;
      } else if (it.hint) {
        el('svg:text', { x, y, class: 'lbl hint', 'font-size': 24 * fs, text: it.hint }, gLabels);
      }
    }

    // Steden
    const gCity = el('svg:g', { class: 'cities' }, svg);
    for (const [id, it] of Object.entries(ITEMS)) {
      if (it.type !== 'city') continue;
      const [x, y] = proj(it.at);
      const g = el('svg:g', { class: 'city' + (inLevel.has(id) ? ' target' : ''), transform: `translate(${x} ${y}) scale(${viewScale})` }, gCity);
      g.dataset.id = id;
      el('svg:circle', { r: 26, class: 'ring' }, g);
      if (it.icon) el('svg:text', { class: 'icon', y: 6, text: it.icon }, g);
      else el('svg:circle', { r: 6.5, class: 'dot' }, g);
      const off = { r: [12, 5, 'start'], l: [-12, 5, 'end'], t: [0, -12, 'middle'], b: [0, 22, 'middle'] }[it.dir || 'r'];
      const showName = learn && inLevel.has(id);
      const text = showName ? it.name : it.hint;
      if (text) {
        const t = el('svg:text', { x: off[0], y: off[1], style: `text-anchor:${off[2]}`, class: 'lbl ' + (showName ? 'city-name' : 'hint small'), text }, g);
        if (showName) t.dataset.for = id;
      }
      mapEls[id] = g;
    }
  }

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function hitTest(evt, wantCity) {
    if (wantCity) {
      const p = svgPoint(evt);
      let best = null, bd = 34 * viewScale;
      for (const id of game.pool) {
        if (ITEMS[id].type !== 'city') continue;
        const [x, y] = proj(ITEMS[id].at);
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < bd) { bd = d; best = id; }
      }
      return best;
    }
    const t = document.elementFromPoint(evt.clientX, evt.clientY);
    const n = t && t.closest('[data-id]');
    return n && game.pool.includes(n.dataset.id) ? n.dataset.id : null;
  }

  function mark(id, cls, ms) {
    const n = mapEls[id];
    if (!n) return;
    n.classList.add(cls);
    if (n.tagName === 'g' || n.tagName === 'path') n.parentNode.appendChild(n); // bovenop
    if (ms) setTimeout(() => n.classList.remove(cls), ms);
  }
  function clearMarks() {
    svg.querySelectorAll('.ask,.good,.bad,.picked').forEach(n => n.classList.remove('ask', 'good', 'bad', 'picked'));
  }
  function flashLabel(id, text, cls) {
    const it = ITEMS[id];
    const [x, y] = it.at ? proj(it.at) : proj(it.label);
    const t = el('svg:text', { x, y: y - 30 * viewScale, class: 'lbl pop ' + cls, 'font-size': 22 * viewScale, text }, svg);
    setTimeout(() => t.remove(), 1400);
  }

  // ── Spel ──
  let game = null;
  let tick = null;

  function startGame(lvl, mode, onlyItems) {
    stopGame();
    const pool = levelItems(lvl);
    game = {
      lvl, mode, pool,
      queue: shuffle(onlyItems || pool),
      total: (onlyItems || pool).length,
      practice: !!onlyItems,
      done: 0, mistakes: [], penalty: 0, start: 0, end: 0,
      cur: null, locked: false,
    };
    show('play');
    document.body.dataset.mode = mode;
    drawMap(lvl, mode);
    $('#feedback').textContent = '';
    $('#penalty').textContent = '';
    const rec = bestFor(lvl.id, mode);
    $('#record').textContent = mode === 'leren' || game.practice ? '' : rec ? `Record ${fmt(rec.time)}` : 'Nog geen record';

    if (mode === 'leren') return startLearn();
    game.start = performance.now();
    tick = setInterval(updateTimer, 100);
    nextQuestion();
  }

  function stopGame() {
    clearInterval(tick); tick = null;
    if (game) game.over = true;
  }

  const elapsed = () => ((game.end || performance.now()) - game.start) / 1000 + game.penalty;

  function updateTimer() {
    if (!game || game.over) return;
    const t = elapsed();
    $('#timer').textContent = fmt(t);
    const rec = bestFor(game.lvl.id, game.mode);
    $('#timer').classList.toggle('slow', !game.practice && !!rec && t > rec.time);
  }

  function updateProgress() {
    $('#progressFill').style.width = `${(game.done / game.total) * 100}%`;
  }

  function nextQuestion() {
    clearMarks();
    updateProgress();
    if (!game.queue.length) return finish();
    game.cur = game.queue.shift();
    game.locked = false;
    const it = ITEMS[game.cur];
    const prompt = $('#prompt'), answers = $('#answers');
    answers.innerHTML = '';
    $('#feedback').textContent = '';
    $('#feedback').className = '';

    if (game.mode === 'aanwijzen') {
      prompt.innerHTML = `<small>Waar ligt</small><span class="target-name">${it.name}</span>`;
      el('div', { class: 'tip', text: it.type === 'city' ? 'Tik op de goede stip 👆' : 'Tik op de kaart 👆' }, answers);
    } else {
      mark(game.cur, 'ask');
      prompt.innerHTML = `<small>Hoe heet ${it.type === 'city' ? 'deze plaats' : it.type === 'land' ? 'dit land' : 'deze provincie'}?</small>`;
      if (game.mode === 'kiezen') renderChoices(it);
      else renderTyping(it);
    }
  }

  function renderChoices(it) {
    const answers = $('#answers');
    const same = game.pool.filter(id => id !== game.cur && ITEMS[id].type === it.type).map(id => ITEMS[id].name);
    let opts = shuffle([...new Set(same)]).filter(n => n !== it.name);
    if (opts.length < 3) {
      const extra = it.type === 'land' ? EXTRA_LANDS
        : Object.values(ITEMS).filter(x => x.type === it.type).map(x => x.name);
      opts = opts.concat(shuffle(extra.filter(n => n !== it.name && !opts.includes(n))));
    }
    opts = shuffle([it.name, ...opts.slice(0, 3)]);
    const grid = el('div', { class: 'choices' }, answers);
    for (const name of opts) {
      el('button', { class: 'choice', text: name, onclick: e => answerChoice(e.currentTarget, name) }, grid);
    }
  }

  function answerChoice(btn, name) {
    if (game.locked) return;
    const it = ITEMS[game.cur];
    if (name === it.name) {
      game.locked = true;
      btn.classList.add('good');
      good();
    } else {
      btn.classList.add('bad');
      btn.disabled = true;
      wrong(`Nee, dat is niet ${name}`);
    }
  }

  function renderTyping(it) {
    const answers = $('#answers');
    const form = el('form', { class: 'type-form', autocomplete: 'off' }, answers);
    const inp = el('input', {
      type: 'text', class: 'type-input', placeholder: 'Typ de naam…', autocapitalize: 'words',
      autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'done',
    }, form);
    el('button', { class: 'big-btn', type: 'submit', text: 'OK ✓' }, form);
    el('button', { class: 'link-btn', type: 'button', text: 'Ik weet het niet 🤷', onclick: () => giveUp() }, answers);
    form.addEventListener('submit', e => { e.preventDefault(); answerTyped(inp.value); });
    setTimeout(() => inp.focus({ preventScroll: true }), 50);
  }

  function answerTyped(value) {
    if (game.locked) return;
    const v = norm(value);
    if (!v) return;
    const it = ITEMS[game.cur];
    const names = [it.name, ...(it.aliases || [])].map(norm);
    if (names.includes(v)) { game.locked = true; return good(); }
    const dist = Math.min(...names.map(n => lev(v, n)));
    const tol = v.length >= 10 ? 2 : v.length >= 5 ? 1 : 0;
    if (dist <= tol) {
      game.locked = true;
      return good(`Bijna perfect! Je schrijft het zo: <b>${it.name}</b>`, 2200);
    }
    game.locked = true;
    wrong(`Het is <b>${it.name}</b>`, true);
  }

  function giveUp() {
    if (game.locked) return;
    game.locked = true;
    wrong(`Het is <b>${ITEMS[game.cur].name}</b>`, true);
  }

  function onMapTap(evt) {
    if (!game || game.over) return;
    if (game.mode === 'leren') return learnTap(evt);
    if (game.mode !== 'aanwijzen' || game.locked) return;
    const it = ITEMS[game.cur];
    const hit = hitTest(evt, it.type === 'city');
    if (!hit) return; // naast de kaart getikt: geen straf
    if (hit === game.cur) {
      game.locked = true;
      mark(hit, 'good');
      good();
    } else {
      game.locked = true;
      mark(hit, 'bad', 1300);
      flashLabel(hit, ITEMS[hit].name, 'bad');
      wrong(`Dat is ${ITEMS[hit].name}. Kijk, hier ligt ${it.name}!`, true);
    }
  }
  svg.addEventListener('pointerdown', onMapTap);

  function good(msg, wait = 650) {
    sfx.good();
    const fb = $('#feedback');
    fb.innerHTML = msg || ['Goed zo! 🎉', 'Super! ⭐', 'Top! 👍', 'Ja! 🙌', 'Knap! 💪'][Math.random() * 5 | 0];
    fb.className = 'good';
    mark(game.cur, 'good');
    game.done++;
    updateProgress();
    setTimeout(() => !game.over && nextQuestion(), wait);
  }

  function wrong(msg, advance) {
    sfx.bad();
    game.penalty += PENALTY;
    if (!game.mistakes.includes(game.cur)) game.mistakes.push(game.cur);
    const pen = $('#penalty');
    pen.textContent = `+${PENALTY} sec`;
    pen.classList.remove('show'); void pen.offsetWidth; pen.classList.add('show');
    const fb = $('#feedback');
    fb.innerHTML = msg;
    fb.className = 'bad';
    if (!advance) return;
    // Laat het goede antwoord zien en vraag het later nog een keer.
    mark(game.cur, 'good');
    if (!game.queue.includes(game.cur)) game.queue.splice(Math.min(game.queue.length, 2 + (Math.random() * 3 | 0)), 0, game.cur);
    setTimeout(() => !game.over && nextQuestion(), 2000);
  }

  function finish() {
    game.end = performance.now();
    stopGame();
    updateTimer();
    const t = elapsed();
    const key = `${game.lvl.id}:${game.mode}`;
    const old = saved.records[key];
    const isRecord = !game.practice && (!old || t < old.time);
    if (isRecord) {
      saved.records[key] = { time: t, mistakes: game.mistakes.length, date: new Date().toISOString().slice(0, 10) };
      store.save(saved);
    }
    const nm = game.mistakes.length;
    $('#resultEmoji').textContent = isRecord ? '🏆' : nm === 0 ? '🌟' : '🏁';
    $('#resultTitle').textContent = isRecord ? (old ? 'NIEUW RECORD!' : 'Je eerste record!')
      : game.practice ? 'Fouten geoefend!' : nm === 0 ? 'Foutloos!' : 'Finish!';
    $('#resultTime').textContent = fmt(t);
    $('#resultDetail').innerHTML = (nm ? `${nm} fout${nm > 1 ? 'en' : ''} (+${nm * PENALTY} sec straftijd)` : 'Geen fouten 🎯')
      + (old && !game.practice ? `<br>Vorig record: ${fmt(old.time)}` : '');
    $('#resultMistakes').innerHTML = nm ? 'Oefen nog even: ' + game.mistakes.map(id => `<span class="chip">${ITEMS[id].name}</span>`).join(' ') : '';
    $('#mistakesBtn').style.display = nm ? '' : 'none';
    const { lvl, mode, mistakes } = game;
    $('#againBtn').onclick = () => startGame(lvl, mode);
    $('#mistakesBtn').onclick = () => startGame(lvl, mode, mistakes);
    setTimeout(() => {
      show('result');
      if (isRecord || nm === 0) { sfx.win(); confetti(); }
    }, 500);
  }

  // ── Leren ──
  function startLearn() {
    $('#timer').textContent = '';
    $('#progressFill').style.width = '0';
    $('#prompt').innerHTML = '<small>Ontdek de kaart</small><span class="target-name">Tik ergens op!</span>';
    const answers = $('#answers');
    answers.innerHTML = '';
    const info = el('div', { id: 'learnInfo', class: 'learn-info', html: 'Tik op een provincie of stip om te zien hoe hij heet.' }, answers);
    const tog = el('button', { class: 'big-btn alt', text: '🙈 Namen verbergen' }, answers);
    tog.addEventListener('click', () => {
      const hidden = svg.classList.toggle('hide-names');
      tog.textContent = hidden ? '👀 Namen tonen' : '🙈 Namen verbergen';
    });
    el('button', { class: 'big-btn', text: '🏁 Ik ben er klaar voor!', onclick: () => show('modes') }, answers);
    info.dataset.ready = '1';
  }

  function learnTap(evt) {
    const p = svgPoint(evt);
    // Eerst kijken of er een stip in de buurt is, anders het gebied.
    let id = null, bd = 30 * viewScale;
    for (const cid of game.pool) {
      if (ITEMS[cid].type !== 'city') continue;
      const [x, y] = proj(ITEMS[cid].at);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bd) { bd = d; id = cid; }
    }
    id = id || hitTest(evt, false);
    if (!id) return;
    clearMarks();
    mark(id, 'picked');
    const it = ITEMS[id];
    if (it.capital && game.pool.includes(it.capital)) mark(it.capital, 'picked');
    sfx.good();
    $('#learnInfo').innerHTML = `<div class="learn-name">${it.icon || ''} ${it.name}</div><div>${describe(id)}</div>`
      + (it.hint ? `<div class="hint-note">Op de kaart staat: <b>${it.hint}</b></div>` : '');
  }

  // ── Confetti ──
  function confetti() {
    const c = $('#confetti'), ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const cols = ['#ff8a3d', '#3d9bff', '#b05cff', '#ffc21a', '#2ecc71', '#ff4d6d'];
    const ps = Array.from({ length: 160 }, () => ({
      x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5,
      vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, r: Math.random() * 6,
      s: 6 + Math.random() * 8, c: cols[Math.random() * cols.length | 0],
    }));
    let f = 0;
    (function frame() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.r += 0.1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      }
      if (++f < 220) requestAnimationFrame(frame); else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }

  $('#quitBtn').addEventListener('click', () => { stopGame(); show('modes'); });

  show('home');

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
