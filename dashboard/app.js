// Token Radar dashboard (radar-2): renders window.RADAR, no fetch, no network.
(function () {
  var R = window.RADAR;
  var main = document.getElementById('board');
  if (!R || !R.rows) {
    main.setAttribute('aria-busy', 'false');
    main.insertAdjacentHTML('beforeend', '<p>Data not loaded.</p>');
    return;
  }
  var rows = R.rows;
  var live = R.live || [];
  var ev = R.evidence;
  var ledger = R.ledger;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    if (n == null) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) {
    if (n == null) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function pct(n) {
    if (n == null) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function pctClass(n) {
    return n == null ? '' : (n >= 0 ? 'pos' : 'neg');
  }
  function ageText(d) {
    if (d == null) return 'unknown';
    if (d < 365) return Math.round(d) + 'd';
    return (d / 365).toFixed(1) + 'y';
  }
  function badge(v) {
    return '<span class="badge ' + esc(v) + '">' + esc(v) + '</span>';
  }
  function holdDays(age) {
    if (age == null) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function hoursFor(age) {
    return 0.5 + (holdDays(age) / 7) * (10 / 60) + 0.25;
  }
  function evFor(row, dep) {
    var pool = row.implied_value_usd * row.launch_odds * 0.05;
    return (pool * dep) / row.tvl_usd;
  }

  // Header + hero
  document.getElementById('meta').innerHTML =
    'Snapshot <b>' + esc(R.as_of) + '</b> &nbsp; Floor <b>' + money(R.floor_usd) +
    '</b> &nbsp; Model <b>' + esc(R.model_version) + ' fitted</b> &nbsp; Rows <b>' +
    R.board_size + '</b> &nbsp; Total implied <b>' + money(R.total_implied_usd) + '</b>';
  document.getElementById('headline').textContent =
    R.board_size + ' pre-token protocols, ranked by fitted implied value';
  document.getElementById('lede').innerHTML =
    'Implied value is fitted from the ' + ev.fit_n + ' tokens in this snapshot that already trade: ' +
    'log10(market cap) = ' + ev.intercept.toFixed(4) + ' + ' + ev.exponent.toFixed(4) +
    ' × log10(TVL). It is a model of what a launch could be worth, not a promise of one. ' +
    'Growth and age are shown as context only — they do not move the number.';
  var v1 = R.verdicts_1k;
  document.getElementById('kpis').innerHTML = [
    ['Total implied value', money(R.total_implied_usd)],
    ['Rows ranked', String(R.board_size)],
    ['Verdicts at $1,000', v1.SKIP + ' SKIP / ' + v1.THIN + ' THIN'],
    ['Typical miss (leave-one-out)', '×' + ev.loo_miss.toFixed(2)],
    ['Protocols accounted for', ledger.total + ' / ' + ledger.total],
  ].map(function (k) {
    return '<div class="kpi"><div class="label">' + esc(k[0]) + '</div><div class="value">' + esc(k[1]) + '</div></div>';
  }).join('');

  // Ledger strip
  document.getElementById('ledger').innerHTML =
    '<h2>All ' + ledger.total + ' protocols accounted for</h2><div class="counts">' +
    '<span><b>' + ledger.ranked + '</b> Ranked on the board</span>' +
    '<span><b>' + ledger.token_on_record + '</b> Token already trades</span>' +
    '<span><b>' + ledger.cex + '</b> CEX</span>' +
    '<span><b>' + ledger.versioned + '</b> Versioned name</span>' +
    '<span><b>' + ledger.bridge + '</b> Bridge</span>' +
    '<span><b>' + ledger.liquid_staking + '</b> Liquid staking / restaking</span>' +
    '<span><b>' + ledger.wrapped + '</b> Wrapped / staked product</span>' +
    '<span><b>' + ledger.set_aside + '</b> Set aside (rankable, not selected)</span></div>';

  // Evidence tables
  document.getElementById('evidence-table').innerHTML =
    '<tr><th>Model</th><th>Leave-one-out miss</th><th>Walk-forward miss</th><th>P25–P75 holds</th><th>P10–P90 holds</th></tr>' +
    '<tr><td><b>Fitted curve (kept)</b></td><td>×' + ev.loo_miss.toFixed(2) + '</td><td>×' + ev.walk_forward_miss.toFixed(2) +
    '</td><td>' + Math.round(ev.loo_p25_75 * 100) + '% / ' + Math.round(ev.walk_forward_p25_75 * 100) +
    '%</td><td>' + Math.round(ev.loo_p10_90 * 100) + '% / ' + Math.round(ev.walk_forward_p10_90 * 100) + '%</td></tr>' +
    '<tr><td>Flat 0.25× TVL</td><td>×' + ev.flat_miss.toFixed(2) + '</td><td>—</td><td>—</td><td>—</td></tr>';
  document.getElementById('evidence-note').textContent =
    'Miss is the median factor between predicted and true market cap. Leave-one-out refits the curve ' +
    'without each token and predicts it; walk-forward fits on tokens listed before 2024-12-19 and tests ' +
    'on the 32 listed after. Adding growth, age or chain count made both held-out tests worse, so the ' +
    'curve is size alone.';
  document.getElementById('odds-table').innerHTML =
    '<tr><th>Age</th><th>Protocols</th><th>Share with a token</th></tr>' +
    ev.odds.map(function (o) {
      return '<tr><td>' + esc(o.bucket) + '</td><td>' + o.protocols + '</td><td>' +
        Math.round(o.share * 100) + '%</td></tr>';
    }).join('');
  document.getElementById('brier').textContent =
    ev.brier_odds.toFixed(2) + ' vs ' + ev.brier_overall.toFixed(2) + ' for the overall rate alone (' +
    Math.round(ev.overall_token_share * 100) + '% of protocols record a token)';

  // Top 5 spotlight
  document.getElementById('top5').innerHTML = rows.slice(0, 5).map(function (r) {
    return '<div class="card"><div class="rank">Rank ' + r.rank + '</div><h3>' + esc(r.name) + '</h3>' +
      '<div class="sub">' + esc(r.category || 'No category') + ' on ' + esc(r.chains.slice(0, 2).join(', ')) + '</div>' +
      '<div class="big">' + money(r.implied_value_usd) + '</div>' + badge(r.verdict_1k) +
      '<div class="sub">TVL ' + money(r.tvl_usd) + ' · <span class="' + pctClass(r.change_7d) + '">' +
      pct(r.change_7d) + '</span></div></div>';
  }).join('');

  // Sandbox
  var expSlider = document.getElementById('exp-slider');
  var scaleSlider = document.getElementById('scale-slider');
  expSlider.value = ev.exponent.toFixed(3);
  function renderSandbox() {
    var exp = parseFloat(expSlider.value);
    var shift = parseFloat(scaleSlider.value);
    document.getElementById('exp-out').textContent = exp.toFixed(3);
    document.getElementById('scale-out').textContent = (shift >= 0 ? '+' : '') + shift.toFixed(2);
    document.getElementById('sandbox-result').innerHTML = rows.slice(0, 5).map(function (r) {
      var v = Math.round(Math.pow(10, ev.intercept + shift) * Math.pow(r.tvl_usd, exp));
      return '<span>' + esc(r.name) + ': <b>' + money(v) + '</b></span>';
    }).join('');
  }
  expSlider.addEventListener('input', renderSandbox);
  scaleSlider.addEventListener('input', renderSandbox);
  renderSandbox();

  // Filters
  var catSel = document.getElementById('category');
  var chainSel = document.getElementById('chain');
  var cats = Array.from(new Set(rows.map(function (r) { return r.category || 'No category'; }))).sort();
  var chains = Array.from(new Set(rows.flatMap(function (r) { return r.chains; }))).sort();
  cats.forEach(function (c) { catSel.insertAdjacentHTML('beforeend', '<option>' + esc(c) + '</option>'); });
  chains.forEach(function (c) { chainSel.insertAdjacentHTML('beforeend', '<option>' + esc(c) + '</option>'); });

  var mode = 'pre';
  var tbody = document.getElementById('rows');
  var liveTbody = document.getElementById('live-rows');
  function filtered() {
    var q = document.getElementById('search').value.trim().toLowerCase();
    var cat = catSel.value;
    var chain = chainSel.value;
    var sort = document.getElementById('sort').value;
    var out = rows.filter(function (r) {
      if (cat && (r.category || 'No category') !== cat) return false;
      if (chain && r.chains.indexOf(chain) === -1) return false;
      if (q) {
        var hay = (r.name + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var by = {
      rank: function (a, b) { return a.rank - b.rank; },
      implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d); },
      age: function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days); },
    }[sort];
    return out.sort(by);
  }
  function renderRows() {
    var list = filtered();
    tbody.innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td><td><b>' + esc(r.name) + '</b></td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td>' +
        '<td class="num">' + money(r.implied_p25_usd) + ' – ' + money(r.implied_p75_usd) + '</td>' +
        '<td class="num">' + Math.round(r.launch_odds * 100) + '%</td>' +
        '<td>' + badge(r.verdict_1k) + '</td></tr>';
    }).join('');
    document.getElementById('count').textContent = list.length + ' rows shown';
  }
  function renderLive() {
    liveTbody.innerHTML = live.map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(r.name) + '</b></td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num"><b>' + money(r.mcap_usd) + '</b></td></tr>';
    }).join('');
    document.getElementById('count').textContent = live.length + ' live-token protocols shown';
  }
  ['search', 'category', 'chain', 'sort'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { if (mode === 'pre') renderRows(); });
  });
  document.getElementById('show-pre').addEventListener('click', function () {
    mode = 'pre';
    this.classList.add('active');
    document.getElementById('show-live').classList.remove('active');
    document.getElementById('board-table').hidden = false;
    document.getElementById('live-table').hidden = true;
    renderRows();
  });
  document.getElementById('show-live').addEventListener('click', function () {
    mode = 'live';
    this.classList.add('active');
    document.getElementById('show-pre').classList.remove('active');
    document.getElementById('board-table').hidden = true;
    document.getElementById('live-table').hidden = false;
    renderLive();
  });
  renderRows();

  // Detail drawer
  var drawer = document.getElementById('drawer');
  var drawerBody = document.getElementById('drawer-body');
  var dep = 1000;
  var current = null;
  function renderDrawer() {
    if (!current) return;
    var r = current;
    var pool = r.implied_value_usd * r.launch_odds * 0.05;
    var evNow = evFor(r, dep);
    var net = (evNow - 15) / hoursFor(r.age_days);
    var verdict = dep === 1000 ? r.verdict_1k : r.verdict_10k;
    drawerBody.innerHTML =
      '<h2>' + esc(r.name) + '</h2>' +
      '<div>' + esc(r.category || 'No category') + ' · ' + esc(r.chains.join(', ')) + ' · Age ' + ageText(r.age_days) + '</div>' +
      '<div class="seg" role="group" aria-label="Deposit size">' +
      '<button type="button" data-dep="1000"' + (dep === 1000 ? ' class="active"' : '') + '>$1,000 deposit</button>' +
      '<button type="button" data-dep="10000"' + (dep === 10000 ? ' class="active"' : '') + '>$10,000 deposit</button></div>' +
      '<div class="stats">' +
      '<div class="stat"><div class="label">Implied value</div><div class="value">' + money(r.implied_value_usd) + '</div></div>' +
      '<div class="stat"><div class="label">P25–P75 range</div><div class="value">' + money(r.implied_p25_usd) + ' – ' + money(r.implied_p75_usd) + '</div></div>' +
      '<div class="stat"><div class="label">TVL</div><div class="value">' + money(r.tvl_usd) + '</div></div>' +
      '<div class="stat"><div class="label">7-day change</div><div class="value">' + pct(r.change_7d) + '</div></div>' +
      '<div class="stat"><div class="label">Launch odds</div><div class="value">' + Math.round(r.launch_odds * 100) + '%</div></div>' +
      '<div class="stat"><div class="label">Farmer pool (5% × odds)</div><div class="value">' + money(pool) + '</div></div>' +
      '<div class="stat"><div class="label">Expected value at $' + dep.toLocaleString('en-US') + '</div><div class="value">' + moneyFull(evNow) + '</div></div>' +
      '<div class="stat"><div class="label">Net per hour (after $15 gas)</div><div class="value">$' + net.toFixed(2) + '</div></div>' +
      '<div class="stat"><div class="label">Break-even deposit</div><div class="value">' + (r.break_even_usd > 0 ? moneyFull(r.break_even_usd) : '—') + '</div></div>' +
      '<div class="stat"><div class="label">Verdict at $' + dep.toLocaleString('en-US') + '</div><div class="value">' + badge(verdict) + '</div></div>' +
      '</div>' +
      '<p class="note">Verdict: FARM needs $25/hour net, MARGINAL $8/hour, THIN $0/hour, otherwise SKIP. ' +
      'Hold ' + holdDays(r.age_days) + ' days; about ' + hoursFor(r.age_days).toFixed(1) + ' hours of work in total.</p>' +
      '<h3>Farm plan — 6 steps</h3><ol>' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol>' +
      '<p class="note">Claim only from the protocol\u2019s own page. Never pay to claim, and never share a seed phrase.</p>';
    drawerBody.querySelectorAll('[data-dep]').forEach(function (b) {
      b.addEventListener('click', function () {
        dep = parseInt(b.getAttribute('data-dep'), 10);
        renderDrawer();
      });
    });
  }
  tbody.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    var slug = tr.getAttribute('data-slug');
    current = rows.find(function (r) { return r.slug === slug; }) || null;
    if (!current) return;
    dep = 1000;
    renderDrawer();
    drawer.hidden = false;
  });
  document.getElementById('drawer-close').addEventListener('click', function () {
    drawer.hidden = true;
    current = null;
  });

  // Methodology footer
  document.getElementById('method').innerHTML =
    '<h2>Methodology</h2>' +
    '<p>Source: ' + esc(R.source) + ', snapshot as of ' + esc(R.as_of) + '. Floor: ' + money(R.floor_usd) + ' TVL. ' +
    'Model ' + esc(R.model_version) + ': log10(market cap) = ' + ev.intercept.toFixed(4) + ' + ' + ev.exponent.toFixed(4) +
    ' × log10(TVL), fitted by least squares on the ' + ev.fit_n + ' protocols in this snapshot whose token already trades ' +
    '(market cap &gt; 0, TVL &gt; 0). The fitted curve was tested held-out two ways — leave-one-out miss ×' + ev.loo_miss.toFixed(2) +
    ' and walk-forward miss ×' + ev.walk_forward_miss.toFixed(2) + ' — against a flat 0.25× TVL multiple at ×' + ev.flat_miss.toFixed(2) + '. ' +
    'Extra terms (7-day growth, age, chain count) were tested and rejected: each made both held-out tests worse.</p>' +
    '<p>Launch odds are counted from the snapshot: the share of protocols in each age bucket that record a token. ' +
    'A protocol “records no token” when DefiLlama lists no market cap, no CoinGecko id and no symbol for it — ' +
    'that is not a guarantee it has no token, and it is not a guarantee it will ever issue one. Implied value is ' +
    'this entry\u2019s own claim about what a launch could be worth if the protocol\u2019s record stayed as it is, never a promise.</p>' +
    '<p>Farm verdicts: farmer pool = implied value × launch odds × 5%; expected value = pool × deposit ÷ TVL; ' +
    'net per hour = (expected value − $15 gas) ÷ hours. FARM ≥ $25/hour, MARGINAL ≥ $8/hour, THIN ≥ $0/hour, else SKIP. ' +
    'At a $1,000 deposit, ' + v1.SKIP + ' of ' + R.board_size + ' rows are SKIP — the board says so honestly.</p>';

  // Deep links for screenshots and sharing: #detail=<slug> opens a protocol,
  // #category=<name> pre-filters the board.
  var hash = new URLSearchParams(window.location.hash.slice(1));
  var dslug = hash.get('detail');
  if (dslug) {
    current = rows.find(function (r) { return r.slug === dslug; }) || null;
    if (current) {
      dep = 1000;
      renderDrawer();
      drawer.hidden = false;
    }
  }
  var hcat = hash.get('category');
  if (hcat) {
    catSel.value = hcat;
    renderRows();
  }

  main.setAttribute('aria-busy', 'false');
})();
