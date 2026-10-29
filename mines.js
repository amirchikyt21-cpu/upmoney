/* Mines */
(function () {
  'use strict';

  var CELLS = 25;

  function comb(n, k) {
    if (k < 0 || k > n) return 0;
    if (k > n - k) k = n - k;
    var r = 1;
    for (var i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return r;
  }

  function multFor(k, b) {
    if (k <= 0) return 1;
    var fair = comb(CELLS, k) / comb(CELLS - b, k);
    return Math.max(1, Math.round(fair * 0.88 * 100) / 100);
  }

  UI.register('mines', {
    fullscreen: true,

    render: function (root) {
      var bet = 0.1;
      var bombs = 10;
      var active = false;
      var busy = false;
      var revealed = 0;
      var bombSet = {};
      var mult = 1;
      var roundId = null;

      root.innerHTML =
        '<div class="gamebar">' +
        '  <button class="icon-btn" data-back aria-label="Назад">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '  </button>' +
        '  <div class="gamebar-title">Mines</div>' +
        '  <div class="bal-chip small"><span data-balance>' + fmt(Store.state.balance) + '</span>' + diamond(16) + '</div>' +
        '</div>' +

        '<div class="mines-head">' +
        '  <div class="stat-box"><div class="mini-label">Множитель</div><div class="val" id="mult">1.00&times;</div></div>' +
        '  <div class="stat-box"><div class="mini-label">Мин на поле</div><div class="val" id="bombs-val">10</div></div>' +
        '</div>' +

        '<div class="range-wrap">' +
        '  <input id="bomb-range" class="range" type="range" min="1" max="24" step="1" value="10" />' +
        '</div>' +

        '<div class="chips" id="bomb-chips" style="margin-bottom:12px">' +
        '  <button class="chip" data-b="3" style="height:40px;flex:1">3</button>' +
        '  <button class="chip" data-b="5" style="height:40px;flex:1">5</button>' +
        '  <button class="chip" data-b="10" style="height:40px;flex:1">10</button>' +
        '  <button class="chip" data-b="24" style="height:40px;flex:1">24</button>' +
        '</div>' +

        '<div class="mines-grid" id="grid"></div>' +

        '<div class="panel" style="margin-top:0">' +
        '  <div class="betrow">' +
        '    <div class="bet-input">' +
        '      <input id="bet" type="text" inputmode="decimal" value="0.10" />' +
        '      <span class="bet-cur">TON</span>' +
        '    </div>' +
        '    <div class="chips">' +
        '      <button class="chip" data-v="0.1">0.1</button>' +
        '      <button class="chip" data-v="0.5">0.5</button>' +
        '      <button class="chip" data-v="1">1</button>' +
        '      <button class="chip" data-v="5">5</button>' +
        '    </div>' +
        '  </div>' +
        '  <button class="btn btn-green big" id="action">Начать игру</button>' +
        '</div>';

      var gridEl = root.querySelector('#grid');
      var multEl = root.querySelector('#mult');
      var bombsVal = root.querySelector('#bombs-val');
      var input = root.querySelector('#bet');
      var action = root.querySelector('#action');
      var bombChips = root.querySelectorAll('[data-b]');
      var rangeEl = root.querySelector('#bomb-range');

      function readBet() {
        var v = parseFloat(String(input.value).replace(',', '.'));
        if (!isFinite(v) || v <= 0) v = 0.1;
        return Math.round(v * 1000) / 1000;
      }

      function buildGrid() {
        gridEl.innerHTML = '';
        for (var i = 0; i < CELLS; i++) {
          var b = document.createElement('button');
          b.className = 'cell';
          b.dataset.i = i;
          b.type = 'button';
          b.disabled = true;
          gridEl.appendChild(b);
        }
      }

      function cells() {
        return gridEl.querySelectorAll('.cell');
      }

      function syncMult() {
        multEl.textContent = Number(mult).toFixed(2) + '\u00d7';
      }

      function setBombChips() {
        for (var i = 0; i < bombChips.length; i++) {
          var on = Number(bombChips[i].dataset.b) === bombs;
          bombChips[i].classList.toggle('active', on);
          bombChips[i].disabled = active;
        }
        rangeEl.value = bombs;
        rangeEl.disabled = active;
        rangeEl.style.setProperty('--p', ((bombs - 1) / 23) * 100 + '%');
        bombsVal.textContent = String(bombs);
      }

      function resetCells() {
        var list = cells();
        for (var c = 0; c < list.length; c++) {
          list[c].className = 'cell';
          list[c].textContent = '';
          list[c].disabled = false;
        }
      }

      function finish() {
        active = false;
        action.textContent = 'Начать игру';
        action.disabled = false;
        setBombChips();
      }

      function showMines(list) {
        var set = {};
        for (var i = 0; i < list.length; i++) set[Number(list[i])] = true;
        bombSet = set;

        var all = cells();
        for (var j = 0; j < all.length; j++) {
          all[j].disabled = true;
          if (set[Number(all[j].dataset.i)]) {
            all[j].classList.add('bomb', 'dim');
            if (!all[j].textContent) all[j].textContent = '\u2739';
          } else if (all[j].classList.contains('gem')) {
            all[j].classList.add('dim');
          }
        }
      }

      function showGem(el, m) {
        el.classList.add('gem', 'pop');
        el.textContent = '\u25c6';
        el.disabled = true;

        revealed += 1;
        if (m != null) mult = m;
        syncMult();

        action.disabled = false;
        action.textContent = 'Забрать ' + fmt(round3(bet * mult)) + ' TON';
        haptic('light');
      }

      function lose(clicked) {
        clicked.classList.add('bomb', 'pop');
        clicked.textContent = '\u2739';
        showMines(Object.keys(bombSet));
        clicked.classList.remove('dim');
        finish();
        haptic('error');
        UI.toast('Минус ' + fmt(bet) + ' TON', 'error');
      }

      function makeLocalMines() {
        var positions = [];
        for (var i = 0; i < CELLS; i++) positions.push(i);
        for (var j = positions.length - 1; j > 0; j--) {
          var r = Math.floor(Math.random() * (j + 1));
          var tmp = positions[j];
          positions[j] = positions[r];
          positions[r] = tmp;
        }
        bombSet = {};
        for (var k = 0; k < bombs; k++) bombSet[positions[k]] = true;
      }

      function beginRound(serverMult) {
        active = true;
        busy = false;
        revealed = 0;
        mult = serverMult != null ? Number(serverMult) : 1;
        syncMult();

        resetCells();
        setBombChips();
        action.textContent = 'Забрать';
        action.disabled = true;
        haptic('light');
      }

      function start() {
        bet = readBet();
        input.value = bet.toFixed(2);

        if (!API.online) {
          if (!Store.bet('mines', bet)) {
            UI.toast('Недостаточно средств', 'error');
            UI.deposit();
            return;
          }
          makeLocalMines();
          beginRound(null);
          return;
        }

        action.disabled = true;
        action.textContent = 'Ставка…';

        API.minesStart(bet, bombs).then(function (r) {
          roundId = r.id;
          beginRound(r.mult);
        }).catch(function (e) {
          action.disabled = false;
          action.textContent = 'Начать игру';
          if (e.message === 'INSUFFICIENT') {
            UI.toast('Недостаточно средств', 'error');
            UI.deposit();
          } else {
            UI.toast('Ставка не принята', 'error');
          }
        });
      }

      function reveal(i, el) {
        if (!active || busy) return;
        if (el.classList.contains('gem') || el.classList.contains('bomb')) return;

        if (!API.online) {
          if (bombSet[i]) {
            lose(el);
            return;
          }
          showGem(el, multFor(revealed + 1, bombs));
          if (revealed === CELLS - bombs) cashout();
          return;
        }

        busy = true;
        el.disabled = true;

        API.minesPick(roundId, i).then(function (r) {
          busy = false;

          if (r.hit) {
            showMines(r.mines);
            var clicked = gridEl.querySelector('.cell[data-i="' + i + '"]');
            if (clicked) {
              clicked.classList.remove('dim');
              clicked.classList.add('bomb', 'pop');
              clicked.textContent = '\u2739';
            }
            finish();
            haptic('error');
            UI.toast('Минус ' + fmt(bet) + ' TON', 'error');
            return;
          }

          showGem(el, r.mult);

          if (r.won) {
            showMines([]);
            finish();
            haptic('success');
            UI.toast('+' + fmt(API.toTon(r.payout_nano)) + ' TON', 'success');
          }
        }).catch(function () {
          busy = false;
          el.disabled = false;
          UI.toast('Клетка не открылась', 'error');
        });
      }

      function cashout() {
        if (!active || revealed === 0 || busy) return;

        if (!API.online) {
          var payout = round3(bet * mult);
          Store.win('mines', payout, mult);
          UI.balance();
          haptic('success');
          UI.toast('+' + fmt(payout) + ' TON', 'success');
          showMines(Object.keys(bombSet));
          finish();
          return;
        }

        busy = true;
        action.disabled = true;

        API.minesCashout(roundId).then(function (r) {
          busy = false;
          UI.balance();
          haptic('success');
          UI.toast('+' + fmt(API.toTon(r.payout_nano)) + ' TON', 'success');
          showMines(r.mines);
          finish();
        }).catch(function (e) {
          busy = false;
          action.disabled = false;
          UI.toast(e.message === 'NOTHING_PICKED' ? 'Сначала открой клетку' : 'Не получилось забрать', 'error');
        });
      }

      gridEl.addEventListener('click', function (e) {
        var cell = e.target.closest('.cell');
        if (!cell || !active || cell.disabled) return;
        reveal(Number(cell.dataset.i), cell);
      });

      action.addEventListener('click', function () {
        if (active) cashout();
        else start();
      });

      var chips = root.querySelectorAll('.chip[data-v]');
      for (var i = 0; i < chips.length; i++) {
        chips[i].addEventListener('click', function () {
          input.value = parseFloat(this.dataset.v).toFixed(2);
          haptic('light');
        });
      }

      for (var b = 0; b < bombChips.length; b++) {
        bombChips[b].addEventListener('click', function () {
          if (active) return;
          bombs = Number(this.dataset.b);
          setBombChips();
          haptic('light');
        });
      }

      rangeEl.addEventListener('input', function () {
        if (active) return;
        bombs = Math.max(1, Math.min(24, Number(rangeEl.value)));
        setBombChips();
      });

      rangeEl.addEventListener('change', function () {
        haptic('light');
      });

      buildGrid();
      setBombChips();
      this.destroy = function () {};
    }
  });
})();
