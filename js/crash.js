/* Crash */
(function () {
  'use strict';

  UI.register('crash', {
    fullscreen: true,

    render: function (root) {
      var bet = 0.1;
      var running = false;
      var cashedOut = false;
      var crashAt = 1;
      var startTs = 0;
      var mult = 1;
      var pts = [];
      var raf = 0;
      var history = [];

      var BOT_POOL = [
        { name: 'neonfox', color: '#4d8dff', f: 2 },
        { name: 'kite', color: '#ff8a8a', f: 0 },
        { name: 'xasdev', color: '#a766ff', f: 1 },
        { name: 'MetBreeIov', color: '#f0b848', f: 3 },
        { name: 'solo', color: '#8a7dff', f: 0 },
        { name: 'mira', color: '#2fd06b', f: 3 }
      ];
      var bots = [];
      var me = null;
      var myPhoto = (function () {
        try {
          var u = window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user;
          return (u && u.photo_url) || '';
        } catch (e) {
          return '';
        }
      })();

      root.innerHTML =
        '<div class="gamebar">' +
        '  <button class="icon-btn" data-back aria-label="Назад">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '  </button>' +
        '  <div class="gamebar-title">Crash</div>' +
        '  <div class="bal-chip small"><span data-balance>' + fmt(Store.state.balance) + '</span>' + diamond(16) + '</div>' +
        '</div>' +

        '<div class="crash-stage" id="stage">' +
        '  <div class="crash-hist" id="hist"></div>' +
        '  <canvas id="cv"></canvas>' +
        '  <div class="crash-mult" id="mult">1.00&times;</div>' +
        '  <div class="crash-note" id="note">Сделайте ставку</div>' +
        '</div>' +

        '<div class="panel">' +
        '  <div class="betrow">' +
        '    <div class="bet-input">' +
        '      <input id="bet" type="text" inputmode="decimal" value="0.10" />' +
        '      <span class="bet-cur">GRAM</span>' +
        '    </div>' +
        '    <div class="chips">' +
        '      <button class="chip" data-v="0.1">0.1</button>' +
        '      <button class="chip" data-v="0.5">0.5</button>' +
        '      <button class="chip" data-v="1">1</button>' +
        '      <button class="chip" data-v="5">5</button>' +
        '    </div>' +
        '  </div>' +
        '  <button class="btn btn-green big" id="action">Поставить</button>' +
        '</div>' +

        '<div class="panel cp">' +
        '  <div class="cp-head"><b>Игроки в раунде</b><span id="cp-count"></span></div>' +
        '  <div class="cp-list" id="players"><div class="empty">Сделайте ставку — в раунде появятся игроки</div></div>' +
        '</div>';

      var stage = root.querySelector('#stage');
      var cv = root.querySelector('#cv');
      var multEl = root.querySelector('#mult');
      var noteEl = root.querySelector('#note');
      var action = root.querySelector('#action');
      var input = root.querySelector('#bet');
      var histEl = root.querySelector('#hist');
      var listEl = root.querySelector('#players');
      var countEl = root.querySelector('#cp-count');
      var lastUi = 0;

      function plural(n, one, few, many) {
        var a = n % 10, b = n % 100;
        if (a === 1 && b !== 11) return one;
        if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
        return many;
      }

      function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      }

      function avatarInner(p) {
        if (p.photo) return '<i class="face" style="background-image:url(' + p.photo + ')"></i>';
        if (p.f !== undefined) return '<i class="face" data-f="' + p.f + '"></i>';
        return '<b class="init">' + p.name.charAt(0).toUpperCase() + '</b>';
      }

      function renderPlayers() {
        var all = (me ? [me] : []).concat(bots);

        if (!all.length) {
          listEl.innerHTML = '<div class="empty">Сделайте ставку — в раунде появятся игроки</div>';
          countEl.textContent = '';
          return;
        }

        listEl.innerHTML = all.map(function (p) {
          var st = p.cashed ? 'cash' : (p.lost ? 'lost' : 'live');
          var txt = p.cashed
            ? '+' + fmt(p.payout) + '<i>\u00d7' + p.at.toFixed(2) + '</i>'
            : (p.lost ? 'сгорел' : '\u00d7' + mult.toFixed(2));
          return '<div class="cp-row' + (p.me ? ' me' : '') + '">' +
            '<div class="cp-ava" style="background:' + p.color + '">' + avatarInner(p) + '</div>' +
            '<div class="cp-main"><b>' + (p.me ? 'Вы' : p.name) + '</b>' +
            '<span>' + fmt(p.bet) + ' GRAM</span></div>' +
            '<div class="cp-state ' + st + '">' + txt + '</div>' +
            '</div>';
        }).join('');

        countEl.textContent = all.length + ' ' + plural(all.length, 'игрок', 'игрока', 'игроков');
      }

      function updateLive() {
        var nodes = listEl.querySelectorAll('.cp-state.live');
        for (var i = 0; i < nodes.length; i++) nodes[i].textContent = '\u00d7' + mult.toFixed(2);
      }

      function checkBots(m) {
        var changed = false;
        for (var i = 0; i < bots.length; i++) {
          var b = bots[i];
          if (b.cashed || b.lost || m < b.target) continue;
          b.cashed = true;
          b.at = b.target;
          b.payout = round3(b.bet * b.target);
          changed = true;
        }
        if (changed) renderPlayers();
      }

      function readBet() {
        var v = parseFloat(String(input.value).replace(',', '.'));
        if (!isFinite(v) || v <= 0) v = 0.1;
        v = Math.round(v * 1000) / 1000;
        return v;
      }

      function genCrash() {
        var r = Math.random();
        var m = 0.88 / (1 - r);
        return Math.min(30, Math.max(1.01, Math.floor(m * 100) / 100));
      }

      function draw() {
        var w = cv.clientWidth;
        var h = cv.clientHeight;
        var dpr = window.devicePixelRatio || 1;
        if (!w || !h) return;

        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
          cv.width = Math.round(w * dpr);
          cv.height = Math.round(h * dpr);
        }

        var ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        var last = pts.length ? pts[pts.length - 1] : { t: 0, m: 1 };
        var tMax = Math.max(4, last.t * 1.15);
        var mMax = Math.max(2, mult * 1.1);

        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        ctx.lineWidth = 1;
        for (var i = 1; i <= 4; i++) {
          var gy = h - 24 - (i / 4) * (h - 56);
          ctx.beginPath();
          ctx.moveTo(18, gy);
          ctx.lineTo(w - 12, gy);
          ctx.stroke();
        }

        if (!pts.length) return;

        function X(t) { return 18 + (t / tMax) * (w - 30); }
        function Y(m) { return h - 24 - ((m - 1) / (mMax - 1)) * (h - 50); }

        ctx.beginPath();
        ctx.moveTo(X(pts[0].t), h - 24);
        for (var j = 0; j < pts.length; j++) ctx.lineTo(X(pts[j].t), Y(pts[j].m));
        ctx.lineTo(X(last.t), h - 24);
        ctx.closePath();
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(47,208,107,.30)');
        g.addColorStop(1, 'rgba(47,208,107,0)');
        ctx.fillStyle = g;
        ctx.fill();

        ctx.beginPath();
        for (var k = 0; k < pts.length; k++) {
          if (k === 0) ctx.moveTo(X(pts[k].t), Y(pts[k].m));
          else ctx.lineTo(X(pts[k].t), Y(pts[k].m));
        }
        ctx.strokeStyle = '#2fd06b';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(47,208,107,.6)';
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(X(last.t), Y(last.m), 5, 0, Math.PI * 2);
        ctx.fillStyle = '#a9ffcb';
        ctx.fill();
      }

      function renderHistory() {
        histEl.innerHTML = history.map(function (m) {
          var cls = m >= 2 ? ' hi' : ' lo';
          return '<div class="h-chip' + cls + '">' + m.toFixed(2) + '&times;</div>';
        }).join('');
      }

      function tick(now) {
        var t = (now - startTs) / 1000;
        var m = Math.pow(1.08, t);

        if (m >= crashAt) {
          crash();
          return;
        }

        mult = m;
        pts.push({ t: t, m: m });
        if (pts.length > 900) pts.shift();

        checkBots(m);
        if (now - lastUi > 120) {
          lastUi = now;
          updateLive();
        }

        multEl.textContent = m.toFixed(2) + '\u00d7';
        if (!cashedOut) action.textContent = 'Забрать \u00d7' + m.toFixed(2);
        draw();
        raf = requestAnimationFrame(tick);
      }

      function start() {
        bet = readBet();
        input.value = bet.toFixed(2);

        if (!Store.bet('crash', bet)) {
          UI.toast('Недостаточно средств', 'error');
          UI.deposit();
          return;
        }

        bots = shuffle(BOT_POOL).slice(0, 3 + Math.floor(Math.random() * 3)).map(function (b, i) {
          return {
            id: 'b' + i, name: b.name, color: b.color, f: b.f,
            bet: round3(0.05 + Math.random() * 1.95),
            target: 1.15 + Math.random() * 3,
            cashed: false, lost: false, at: 0, payout: 0
          };
        });
        me = {
          me: true, name: 'Вы', photo: myPhoto, color: '#2fd06b', bet: bet,
          cashed: false, lost: false, at: 0, payout: 0
        };
        renderPlayers();

        crashAt = genCrash();
        mult = 1;
        pts = [];
        cashedOut = false;
        running = true;
        startTs = performance.now();

        stage.classList.remove('crashed');
        multEl.textContent = '1.00\u00d7';
        noteEl.textContent = 'Ставка ' + fmt(bet) + ' GRAM';
        action.disabled = false;
        action.textContent = 'Забрать \u00d7' + mult.toFixed(2);
        draw();

        raf = requestAnimationFrame(tick);
      }

      function crash() {
        running = false;
        cancelAnimationFrame(raf);
        mult = crashAt;

        multEl.textContent = crashAt.toFixed(2) + '\u00d7';
        stage.classList.add('crashed');
        noteEl.textContent = 'Краш на ' + crashAt.toFixed(2) + '\u00d7 · ' +
          (me && me.cashed ? 'вы забрали +' + fmt(me.payout) + ' GRAM' : 'ставка сгорела');
        action.disabled = false;
        action.textContent = 'Поставить заново';

        for (var i = 0; i < bots.length; i++) {
          var b = bots[i];
          if (b.cashed || b.lost) continue;
          if (b.target <= crashAt) {
            b.cashed = true;
            b.at = b.target;
            b.payout = round3(b.bet * b.target);
          } else {
            b.lost = true;
          }
        }
        if (me && !me.cashed) me.lost = true;
        renderPlayers();

        history.unshift(crashAt);
        history = history.slice(0, 8);
        renderHistory();

        draw();
        haptic('error');
        UI.balance();
      }

      function cashout() {
        if (!running || cashedOut) return;
        cashedOut = true;

        var payout = round3(bet * mult);
        Store.win('crash', payout, mult);
        UI.balance();
        haptic('success');
        UI.toast('+' + fmt(payout) + ' GRAM', 'success');

        if (me) {
          me.cashed = true;
          me.at = mult;
          me.payout = payout;
          renderPlayers();
        }

        noteEl.textContent = 'Забрали на ' + mult.toFixed(2) + '\u00d7 · +' + fmt(payout) + ' GRAM';
        action.disabled = true;
        action.textContent = 'Ждём краш…';
        draw();
      }

      action.addEventListener('click', function () {
        if (running) cashout();
        else start();
      });

      var chips = root.querySelectorAll('.chip');
      for (var i = 0; i < chips.length; i++) {
        chips[i].addEventListener('click', function () {
          input.value = parseFloat(this.dataset.v).toFixed(2);
          haptic('light');
        });
      }

      function onResize() { draw(); }

      this.destroy = function () {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
      };

      window.addEventListener('resize', onResize);
      draw();
    }
  });
})();
