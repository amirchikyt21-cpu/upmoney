/* Айс Арена — PvP-раунд по мотивам CardHouse: шанс пропорционален ставке */
(function () {
  'use strict';

  var RAKE = 0.05;
  var COUNTDOWN = 10000;
  var BALL = 10;
  var BOTS = [
    { id: 'b1', name: 'xasdev', color: '#a766ff' },
    { id: 'b2', name: 'MetBreeIov', color: '#f0b848' },
    { id: 'b3', name: 'neonfox', color: '#4d8dff' },
    { id: 'b4', name: 'kite', color: '#ff8a8a' }
  ];

  function myPhoto() {
    try {
      var u = window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user;
      return (u && u.photo_url) || '';
    } catch (e) {
      return '';
    }
  }

  function avatarInner(p) {
    if (p.photo) return '<i class="face" style="background-image:url(' + esc(p.photo) + ')"></i>';
    return '<b class="init">' + esc(p.name.charAt(0).toUpperCase()) + '</b>';
  }

  function randHex(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    return s;
  }

  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function hexA(hex, a) {
    var h = hex.replace('#', '');
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  UI.register('arena', {
    fullscreen: true,

    render: function (root) {
      var myName = userName();
      var mode = 'bank';
      var roundNo = 109173 + Math.floor(Math.random() * 40);
      var phase = 'bets';
      var inRound = false;
      var myStake = 0.1;
      var players = [];
      var hash = randHex(32);
      var hashOpen = false;
      var log = [];
      var cdEnd = 0;
      var cdTimer = null;
      var timeouts = [];

      document.body.classList.add('has-bet-dock');

      root.innerHTML =
        '<div class="gamebar">' +
        '  <button class="icon-btn" data-back aria-label="Назад">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '  </button>' +
        '  <div class="gamebar-title">Айс Арена</div>' +
        '  <div class="bal-chip small"><span data-balance>' + fmt(Store.state.balance) + '</span>' + diamond(16) + '</div>' +
        '</div>' +

        '<div class="ar-top">' +
        '  <button class="icon-btn" id="info" aria-label="Информация о раунде">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="4"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>' +
        '  </button>' +
        '  <div class="ar-pill">' +
        '    <div class="ar-fill" id="fill"></div>' +
        '    <div class="ar-pill-txt">' +
        '      <span class="ar-total" id="total">Total: 0 GRAM</span>' +
        '      <span class="ar-time" id="time">Начало через ' + (COUNTDOWN / 1000).toFixed(2) + 'с</span>' +
        '    </div>' +
        '  </div>' +
        '  <button class="icon-btn" id="feed" aria-label="Лента раундов">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.5-4.5A8 8 0 1 1 21 12z"/></svg>' +
        '  </button>' +
        '</div>' +

        '<div class="ice" id="ice">' +
        '  <div class="ice-sun"></div>' +
        '  <div class="ice-wedge"></div>' +
        '  <div class="ice-clouds"><i></i><i></i><i></i></div>' +
        '  <div class="ice-live" id="live">Раунд #' + roundNo + '</div>' +
        '  <div class="ice-avatars" id="avatars"></div>' +
        '  <div class="ball" id="ball"><span class="ball-core"></span></div>' +
        '  <div class="ball-tag" id="tag">#1</div>' +
        '  <div class="ice-result" id="result"><b></b><span></span></div>' +
        '  <div class="ice-bar" id="bar"></div>' +
        '</div>' +

        '<div class="ar-panel">' +
        '  <div class="ar-panel-head"><b id="panelRound">Раунд #' + roundNo + '</b><span id="panelCount"></span></div>' +
        '  <div class="ar-tabs" id="tabs">' +
        '    <button data-mode="std">Стандарт</button>' +
        '    <button data-mode="bank" class="active">Лоу банк</button>' +
        '  </div>' +
        '  <div class="ar-rows" id="rows"><div class="empty">Ждём игроков…</div></div>' +
        '  <div class="ar-hash">' +
        '    <div class="ar-hash-l">Хэш до ставки #' + roundNo + '<span id="hashToggle">Показать</span></div>' +
        '    <button class="ar-hash-v" id="hashBtn"><code id="hash">—</code>' +
        '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>' +
        '    </button>' +
        '  </div>' +
        '</div>' +

        '<div class="section-title">История</div>' +
        '<div class="arena-log" id="log"><div class="empty">Сыграйте первый раунд</div></div>' +

        '<div class="ar-dock">' +
        '  <div class="ar-dock-head">' +
        '    <span class="ar-dock-label" id="dockLabel">Ставка · до 5 GRAM</span>' +
        '    <span class="ar-odds" id="odds">шанс <b class="ch">—</b> · ≈ <b class="pay">—</b></span>' +
        '  </div>' +
        '  <div class="ar-share"><i id="shareFill"></i></div>' +
        '  <div class="ar-dock-row">' +
        '    <div class="ar-stepper">' +
        '      <button class="ar-step" id="dec" aria-label="Уменьшить ставку">−</button>' +
        '      <label class="ar-amount"><input id="bet" type="text" inputmode="decimal" value="0.10" /><span>GRAM</span></label>' +
        '      <button class="ar-step" id="inc" aria-label="Увеличить ставку">+</button>' +
        '    </div>' +
        '    <div class="ar-quick">' +
        '      <button data-v="0.5">0.5</button>' +
        '      <button data-v="1">1</button>' +
        '      <button data-v="5">5</button>' +
        '    </div>' +
        '  </div>' +
        '  <button class="btn btn-green big ar-bet-btn" id="join">Сделать ставку · 0.10 GRAM</button>' +
        '</div>' +
        '<div class="ar-dock-space"></div>';

      var ice = root.querySelector('#ice');
      var ball = root.querySelector('#ball');
      var tag = root.querySelector('#tag');
      var barEl = root.querySelector('#bar');
      var avatarsEl = root.querySelector('#avatars');
      var avaKey = '';
      var rowsEl = root.querySelector('#rows');
      var totalEl = root.querySelector('#total');
      var timeEl = root.querySelector('#time');
      var fillEl = root.querySelector('#fill');
      var liveEl = root.querySelector('#live');
      var panelRound = root.querySelector('#panelRound');
      var panelCount = root.querySelector('#panelCount');
      var hashEl = root.querySelector('#hash');
      var hashLabel = root.querySelector('#hashToggle');
      var resultEl = root.querySelector('#result');
      var joinBtn = root.querySelector('#join');
      var logEl = root.querySelector('#log');
      var input = root.querySelector('#bet');
      var tabsEl = root.querySelector('#tabs');
      var oddsEl = root.querySelector('#odds');
      var shareFill = root.querySelector('#shareFill');
      var dockLabel = root.querySelector('#dockLabel');
      var decBtn = root.querySelector('#dec');
      var incBtn = root.querySelector('#inc');

      function later(fn, ms) { timeouts.push(setTimeout(fn, ms)); }

      function maxStake() { return mode === 'bank' ? 5 : 1000; }

      function rawStake() {
        var v = parseFloat(String(input.value).replace(',', '.'));
        return isFinite(v) && v > 0 ? v : 0.1;
      }

      function readStake() {
        var v = Math.round(rawStake() * 1000) / 1000;
        return Math.max(0.01, Math.min(maxStake(), v));
      }

      function totals() {
        var pool = [], total = 0;
        for (var i = 0; i < players.length; i++) {
          if (players[i].joined && players[i].bet > 0) {
            pool.push(players[i]);
            total += players[i].bet;
          }
        }
        pool.sort(function (a, b) { return b.bet - a.bet; });
        return { pool: pool, total: round3(total) };
      }

      function allocate(pool, total) {
        if (!pool.length || total <= 0) return [];
        var raw = pool.map(function (p) { return p.bet / total * 100; });
        var base = raw.map(function (v) { return Math.floor(v); });
        var used = base.reduce(function (a, b) { return a + b; }, 0);
        var frac = raw.map(function (v, i) { return { i: i, f: v - base[i] }; })
          .sort(function (a, b) { return b.f - a.f; });
        for (var j = 0; j < 100 - used; j++) base[frac[j % frac.length].i] += 1;

        var from = 1;
        return pool.map(function (p, i) {
          var part = { p: p, tickets: base[i], from: from, to: from + base[i] - 1, pct: raw[i] };
          from += base[i];
          return part;
        });
      }

      function rowHtml(part) {
        var p = part.p;
        return '<div class="ar-row' + (p.me ? ' me' : '') + '" data-p="' + p.id + '" ' +
          'style="background-image:linear-gradient(90deg,' + hexA(p.color, .34) + ',rgba(20,20,20,0) 76%)">' +
          '<div class="ar-ava" style="background:' + p.color + '">' + avatarInner(p) + '</div>' +
          '<div class="ar-main"><b>' + (p.me ? '' : '@') + esc(p.name) + '</b>' +
          '<span>' + part.pct.toFixed(1) + '% · #' + part.from + '–' + part.to + '</span></div>' +
          '<div class="ar-bet"><b>' + fmt(p.bet) + ' GRAM</b><span class="dchip">' + fmt(p.bet) + '</span></div>' +
          '</div>';
      }

      function renderHash() {
        hashEl.textContent = hashOpen ? hash : hash.slice(0, 10) + '…' + hash.slice(-8);
        hashLabel.textContent = hashOpen ? 'Скрыть' : 'Показать';
      }

      function avatarLayout(parts) {
        var w = avatarsEl.clientWidth || 400;
        var pad = 8;
        var gap = 3;
        var items = parts.map(function (part) {
          return {
            part: part,
            s: Math.round(Math.min(84, 30 + part.pct * 0.55)),
            c: (part.from + part.tickets / 2 - 0.5) / 100 * w
          };
        });
        var i, min, max;
        for (i = 0; i < items.length; i++) {
          min = items[i].s / 2 + pad;
          max = w - items[i].s / 2 - pad;
          items[i].c = Math.max(min, Math.min(max, items[i].c));
        }
        for (i = 1; i < items.length; i++) {
          min = items[i - 1].c + (items[i - 1].s + items[i].s) / 2 + gap;
          if (items[i].c < min) items[i].c = min;
        }
        for (i = items.length - 1; i >= 0; i--) {
          max = w - items[i].s / 2 - pad;
          if (items[i].c > max) items[i].c = max;
          if (i > 0) {
            min = items[i].c - (items[i - 1].s + items[i].s) / 2 - gap;
            if (items[i - 1].c > min) items[i - 1].c = min;
          }
        }
        return items;
      }

      function renderAvatars(parts) {
        var items = avatarLayout(parts);
        var key = parts.map(function (x) { return x.p.id; }).join(',');

        if (key !== avaKey) {
          avaKey = key;
          avatarsEl.innerHTML = items.map(function (it) {
            var p = it.part.p;
            return '<div class="ice-ava' + (p.me ? ' me' : '') + '" data-p="' + p.id + '" ' +
              'style="--s:' + it.s + 'px;--x:' + it.c.toFixed(1) + 'px;background:' + p.color + '">' +
              avatarInner(p) + '</div>';
          }).join('');
          return;
        }

        for (var i = 0; i < items.length; i++) {
          var el = avatarsEl.querySelector('[data-p="' + items[i].part.p.id + '"]');
          if (!el) continue;
          el.style.setProperty('--s', items[i].s + 'px');
          el.style.setProperty('--x', items[i].c.toFixed(1) + 'px');
        }
      }

      function renderAll() {
        var t = totals();
        var parts = allocate(t.pool, t.total);

        totalEl.textContent = 'Total: ' + fmt(t.total) + ' GRAM';
        panelRound.textContent = 'Раунд #' + roundNo;
        liveEl.textContent = 'Раунд #' + roundNo + (parts.length ? ' · ' + parts.length + ' ' + plural(parts.length, 'игрок', 'игрока', 'игроков') : '');
        panelCount.textContent = parts.length + ' ' + plural(parts.length, 'игрок', 'игрока', 'игроков');

        rowsEl.innerHTML = parts.length
          ? parts.map(rowHtml).join('')
          : '<div class="empty">Ждём игроков…</div>';

        barEl.innerHTML = parts.map(function (part) {
          return '<i data-p="' + part.p.id + '" class="' + (part.p.me ? 'me' : '') + '" ' +
            'style="flex:' + part.tickets + ';background:' + part.p.color + '"></i>';
        }).join('');

        renderAvatars(parts);

        renderHash();
        dockLabel.textContent = mode === 'bank' ? 'Ставка · до 5 GRAM' : 'Ваша ставка';
        syncButton();
        syncInput();
        updateOdds();
      }

      function updateOdds() {
        var pot = totals().total;
        var stake = inRound ? myStake : readStake();
        var bank = inRound ? pot : pot + stake;
        var chance = bank > 0 ? stake / bank * 100 : 0;
        var prize = bank * (1 - RAKE);

        oddsEl.innerHTML = 'шанс <b class="ch">' + chance.toFixed(1) + '%</b>' +
          ' · ≈ <b class="pay">+' + fmt(prize) + '</b>';
        shareFill.style.width = Math.min(100, chance).toFixed(1) + '%';
      }

      function syncButton() {
        var accepted = inRound;

        if (inRound) {
          joinBtn.disabled = true;
          joinBtn.textContent = '✓ Ставка принята · ' + fmt(myStake) + ' GRAM';
        } else if (phase === 'bets') {
          joinBtn.disabled = false;
          joinBtn.textContent = 'Сделать ставку · ' + fmt(readStake()) + ' GRAM';
        } else if (phase === 'spin') {
          joinBtn.disabled = true;
          joinBtn.textContent = 'Идёт розыгрыш…';
        } else {
          joinBtn.disabled = true;
          joinBtn.textContent = 'Следующий раунд…';
        }

        joinBtn.classList.toggle('accepted', accepted);
      }

      function syncInput() {
        var editable = phase === 'bets' && !inRound;
        input.disabled = !editable;
        decBtn.disabled = !editable;
        incBtn.disabled = !editable;
        var chips = root.querySelectorAll('[data-v]');
        for (var i = 0; i < chips.length; i++) chips[i].disabled = !editable;
      }

      function renderLog() {
        if (!log.length) {
          logEl.innerHTML = '<div class="empty">Сыграйте первый раунд</div>';
          return;
        }
        logEl.innerHTML = log.map(function (r) {
          return '<div class="log-row">' +
            '<span>#' + r.round + '</span>' +
            '<b class="' + (r.me ? 'me' : '') + '">' + (r.me ? 'Вы' : '@' + esc(r.name)) + '</b>' +
            '<span class="pot">+' + fmt(r.win) + ' GRAM</span>' +
            '</div>';
        }).join('');
      }

      function resetBall() {
        ball.classList.remove('flying');
        ball.classList.remove('landed');
        ball.style.transition = 'none';
        ball.style.left = '';
        ball.style.top = '';
        tag.classList.remove('show');
        void ball.offsetWidth;
      }

      function fly(ticket, winnerId) {
        var ir = ice.getBoundingClientRect();
        var br = barEl.getBoundingClientRect();
        var cx = ir.width / 2;
        var cy = ir.height * 0.42;
        var rx = Math.max(60, ir.width * 0.32);
        var ry = Math.max(38, ir.height * 0.17);

        var ava = winnerId ? avatarsEl.querySelector('[data-p="' + winnerId + '"]') : null;
        var tx, ty;
        if (ava) {
          var ar = ava.getBoundingClientRect();
          tx = ar.left - ir.left + ar.width / 2;
          ty = ar.top - ir.top - BALL - 3;
        } else {
          tx = (br.left - ir.left) + (ticket - 0.5) / 100 * br.width;
          ty = (br.top - ir.top) - BALL - 10;
        }

        resetBall();
        ball.classList.add('flying');
        ball.style.left = (cx - BALL) + 'px';
        ball.style.top = (cy - BALL) + 'px';
        void ball.offsetWidth;

        var t0 = performance.now();
        var dur = 1250;

        function frame(now) {
          if (!root.isConnected) return;
          var k = Math.min(1, (now - t0) / dur);
          var e = 1 - Math.pow(1 - k, 2.6);
          var a = -Math.PI / 2 + e * Math.PI * 4.2;

          ball.style.left = (cx + Math.cos(a) * rx - BALL) + 'px';
          ball.style.top = (cy + Math.sin(a) * ry - BALL) + 'px';

          if (k < 1) {
            requestAnimationFrame(frame);
          } else {
            ball.classList.remove('flying');
            ball.classList.add('landed');
            ball.style.transition = 'left .4s cubic-bezier(.35,0,.7,1), top .38s cubic-bezier(.55,.05,.9,.4)';
            ball.style.left = (tx - BALL) + 'px';
            ball.style.top = (ty - BALL) + 'px';

            var core = ball.querySelector('.ball-core');
            if (core.animate) {
              core.animate([
                { transform: 'scale(1,1)' },
                { transform: 'scale(1.16,.84)', offset: .84 },
                { transform: 'scale(1,1)' }
              ], { duration: 460, easing: 'ease-out' });
            }

            tag.textContent = '#' + ticket;
            tag.style.left = (tx + 74 > ir.width ? tx - 62 : tx + 20) + 'px';
            tag.style.top = (ty - 38) + 'px';
            tag.classList.add('show');
          }
        }
        requestAnimationFrame(frame);
      }

      function showResult(part, prize) {
        resultEl.className = 'ice-result show won' + (part.p.me ? ' me' : '');
        resultEl.querySelector('b').textContent = part.p.me ? 'Вы забрали банк' : '@' + part.p.name;
        resultEl.querySelector('span').textContent = '+' + fmt(prize) + ' GRAM';
      }

      function finish(part, pot, ticket) {
        phase = 'result';
        var prize = round3(pot * (1 - RAKE));

        var row = root.querySelector('.ar-row[data-p="' + part.p.id + '"]');
        if (row) row.classList.add('win');
        var ava = avatarsEl.querySelector('[data-p="' + part.p.id + '"]');
        if (ava) ava.classList.add('win');
        var seg = barEl.querySelector('i[data-p="' + part.p.id + '"]');
        if (seg) seg.classList.add('on');

        var ir = ice.getBoundingClientRect();
        ice.style.setProperty('--wc', part.p.color);
        ice.style.setProperty('--wcA', hexA(part.p.color, .58));
        ice.style.setProperty('--wcB', hexA(part.p.color, .2));
        ice.style.setProperty('--wcLine', hexA(part.p.color, .85));
        if (ava) {
          var ar = ava.getBoundingClientRect();
          ice.style.setProperty('--wx', Math.round(ar.left - ir.left + ar.width / 2) + 'px');
          ice.style.setProperty('--wy', Math.round(ar.top - ir.top + ar.height / 2) + 'px');
        } else {
          ice.style.setProperty('--wx', '50%');
          ice.style.setProperty('--wy', '62%');
        }
        ice.classList.add('won');

        timeEl.textContent = 'Раунд #' + roundNo + ' завершён';
        fillEl.style.width = '100%';
        showResult(part, prize);
        syncButton();

        if (part.p.me) {
          Store.win('arena', prize, round3(prize / Math.max(0.001, part.p.bet)));
          UI.toast('Вы забрали ' + fmt(prize) + ' GRAM', 'success');
          haptic('success');
        } else {
          haptic('light');
        }

        log.unshift({ round: roundNo, name: part.p.name, win: prize, me: part.p.me });
        log = log.slice(0, 8);
        renderLog();

        later(startRound, 2800);
      }

      function spin() {
        phase = 'spin';
        syncButton();
        syncInput();
        timeEl.textContent = 'Мяч в игре…';
        fillEl.style.width = '100%';

        var t = totals();
        if (!t.pool.length) { later(startRound, 800); return; }
        var parts = allocate(t.pool, t.total);
        var ticket = (parseInt(hash.slice(0, 8), 16) % 100) + 1;
        var winPart = parts[0];
        for (var i = 0; i < parts.length; i++) {
          if (ticket >= parts[i].from && ticket <= parts[i].to) { winPart = parts[i]; break; }
        }

        fly(ticket, winPart.p.id);
        later(function () { finish(winPart, t.total, ticket); }, 1720);
      }

      function tick() {
        if (phase !== 'bets') { clearInterval(cdTimer); cdTimer = null; return; }
        var left = Math.max(0, cdEnd - performance.now());
        timeEl.textContent = 'Начало через ' + (left / 1000).toFixed(2) + 'с';
        fillEl.style.width = Math.min(100, (1 - left / COUNTDOWN) * 100).toFixed(1) + '%';
        if (left <= 0) {
          clearInterval(cdTimer);
          cdTimer = null;
          spin();
        }
      }

      function startRound() {
        phase = 'bets';
        inRound = false;
        roundNo += 1;
        hash = randHex(32);
        hashOpen = false;
        cdEnd = performance.now() + COUNTDOWN;

        resultEl.className = 'ice-result';
        ice.classList.remove('won');
        resetBall();

        var picked = shuffle(BOTS.slice()).slice(0, 2 + Math.floor(Math.random() * 2));
        players = picked.map(function (b) {
          return { id: b.id, name: b.name, color: b.color, bet: 0, joined: false, me: false };
        });
        players.push({ id: 'me', name: myName, color: '#2fd06b', photo: myPhoto(), bet: 0, joined: false, me: true });

        renderAll();
        timeEl.textContent = 'Начало через ' + (COUNTDOWN / 1000).toFixed(2) + 'с';
        fillEl.style.width = '0%';

        picked.forEach(function (b, i) {
          later(function () {
            if (phase !== 'bets') return;
            for (var k = 0; k < players.length; k++) {
              var p = players[k];
              if (p.id !== b.id || p.joined) continue;
              p.joined = true;
              p.bet = mode === 'std'
                ? (inRound ? myStake : readStake())
                : round3(0.04 + Math.random() * 0.4);
              break;
            }
            renderAll();
          }, 500 + i * 850 + Math.random() * 700);
        });

        if (cdTimer) clearInterval(cdTimer);
        cdTimer = setInterval(tick, 50);
      }

      function setMode(m) {
        if (mode === m) return;
        if (phase !== 'bets' || inRound) { UI.toast('Дождитесь конца раунда'); return; }
        mode = m;

        var btns = tabsEl.querySelectorAll('[data-mode]');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.toggle('active', btns[i].dataset.mode === m);
        }

        if (rawStake() > maxStake()) {
          input.value = maxStake().toFixed(2);
          UI.toast('В Лоу банке максимум 5 GRAM', 'error');
        }

        for (var k = 0; k < players.length; k++) {
          var p = players[k];
          if (p.me || !p.joined) continue;
          p.bet = m === 'std' ? myStake : round3(0.04 + Math.random() * 0.4);
        }
        renderAll();
        haptic('light');
      }

      function openInfo() {
        var t = totals();
        var parts = allocate(t.pool, t.total);

        UI.sheet(
          '<div class="sheet-grab"></div>' +
          '<div class="sheet-title">Раунд #' + roundNo + '</div>' +
          '<div class="ar-sheet">' +
          '  <div class="ar-sheet-row"><span>Режим</span><b>' + (mode === 'std' ? 'Стандарт' : 'Лоу банк') + '</b></div>' +
          '  <div class="ar-sheet-row"><span>Макс. ставка</span><b>' + (mode === 'std' ? 'без лимита' : '5 GRAM') + '</b></div>' +
          '  <div class="ar-sheet-row"><span>Банк</span><b>' + fmt(t.total) + ' GRAM</b></div>' +
          '  <div class="ar-sheet-row"><span>Игроков</span><b>' + parts.length + '</b></div>' +
          '  <div class="ar-sheet-row"><span>Билеты</span><b>1–100</b></div>' +
          '  <div class="ar-sheet-row"><span>Комиссия</span><b>5%</b></div>' +
          '</div>' +
          '<div class="mini-label" style="margin:14px 4px 8px">Хэш до ставки</div>' +
          '<div class="ar-hash-big">' + hash + '</div>' +
          '<div class="sheet-note">Победителя определяет билет 1–100: шанс каждого игрока равен его доле в банке.</div>' +
          '<button class="btn btn-green big" data-close>Понятно</button>'
        );
      }

      function openFeed() {
        var body = log.length
          ? log.map(function (r) {
              return '<div class="log-row">' +
                '<span>#' + r.round + '</span>' +
                '<b class="' + (r.me ? 'me' : '') + '">' + (r.me ? 'Вы' : '@' + esc(r.name)) + '</b>' +
                '<span class="pot">+' + fmt(r.win) + ' GRAM</span>' +
                '</div>';
            }).join('')
          : '<div class="empty">Лента пока пустая</div>';

        UI.sheet(
          '<div class="sheet-grab"></div>' +
          '<div class="sheet-title">Лента раундов</div>' +
          '<div class="arena-log">' + body + '</div>' +
          '<div class="sheet-note">Каждый раунд рассчитывается по хэшу, опубликованному до приёма ставок.</div>'
        );
      }

      joinBtn.addEventListener('click', function () {
        if (phase === 'spin') { UI.toast('Раунд уже идёт'); return; }
        if (inRound) { UI.toast('Вы уже в раунде'); return; }
        if (phase !== 'bets') { UI.toast('Готовим следующий раунд'); return; }

        var stakeNow = readStake();
        if (!Store.bet('arena', stakeNow)) {
          UI.toast('Недостаточно средств', 'error');
          UI.deposit();
          return;
        }

        myStake = stakeNow;
        inRound = true;

        for (var i = 0; i < players.length; i++) {
          var p = players[i];
          if (p.me) {
            p.joined = true;
            p.bet = stakeNow;
          } else if (mode === 'std' && p.joined) {
            p.bet = stakeNow;
          }
        }

        input.value = fmt(stakeNow);
        renderAll();
        haptic('light');
      });

      var chips = root.querySelectorAll('[data-v]');
      for (var i = 0; i < chips.length; i++) {
        chips[i].addEventListener('click', function () {
          input.value = parseFloat(this.dataset.v).toFixed(2);
          syncButton();
          updateOdds();
          haptic('light');
        });
      }

      decBtn.addEventListener('click', function () {
        input.value = Math.max(0.01, Math.round((readStake() - 0.1) * 100) / 100).toFixed(2);
        syncButton();
        updateOdds();
        haptic('light');
      });

      incBtn.addEventListener('click', function () {
        input.value = Math.min(maxStake(), Math.round((readStake() + 0.1) * 100) / 100).toFixed(2);
        syncButton();
        updateOdds();
        haptic('light');
      });

      input.addEventListener('input', function () {
        if (rawStake() > maxStake()) input.value = maxStake().toFixed(2);
        syncButton();
        updateOdds();
      });

      input.addEventListener('blur', function () {
        input.value = readStake().toFixed(2);
        syncButton();
        updateOdds();
      });

      tabsEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-mode]');
        if (b) setMode(b.dataset.mode);
      });

      root.querySelector('#info').addEventListener('click', openInfo);
      root.querySelector('#feed').addEventListener('click', openFeed);

      root.querySelector('#hashBtn').addEventListener('click', function (e) {
        if (e.target.closest('svg')) {
          var done = function () { UI.toast('Хэш скопирован'); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(hash).then(done, function () { UI.toast(hash); });
          } else {
            UI.toast(hash);
          }
          return;
        }
        hashOpen = !hashOpen;
        renderHash();
      });

      this.destroy = function () {
        document.body.classList.remove('has-bet-dock');
        clearInterval(cdTimer);
        for (var k = 0; k < timeouts.length; k++) clearTimeout(timeouts[k]);
      };

      startRound();
    }
  });
})();
