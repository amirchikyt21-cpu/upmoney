/* Орёл или решка */
(function () {
  'use strict';

  var PAYOUT = 1.96;

  UI.register('coin', {
    fullscreen: true,

    render: function (root) {
      var bet = 0.1;
      var side = 'heads';
      var flipping = false;
      var history = [];

      root.innerHTML =
        '<div class="gamebar">' +
        '  <button class="icon-btn" data-back aria-label="Назад">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '  </button>' +
        '  <div class="gamebar-title">Монетка</div>' +
        '  <div class="bal-chip small"><span data-balance>' + fmt(Store.state.balance) + '</span>' + diamond(16) + '</div>' +
        '</div>' +

        '<div class="coin-stage">' +
        '  <div class="coin-hist" id="hist"></div>' +
        '  <div class="coin-wrap"><div class="coin" id="coin">\u041e</div></div>' +
        '  <div class="side-btns">' +
        '    <button class="side-btn active" data-side="heads">\uD83E\uDD85 Орёл</button>' +
        '    <button class="side-btn" data-side="tails">\uD83C\uDF10 Решка</button>' +
        '  </div>' +
        '</div>' +

        '<div class="panel">' +
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
        '  <button class="btn btn-green big" id="action">Бросить монету</button>' +
        '</div>';

      var coin = root.querySelector('#coin');
      var input = root.querySelector('#bet');
      var action = root.querySelector('#action');
      var histEl = root.querySelector('#hist');
      var sideBtns = root.querySelectorAll('[data-side]');

      function readBet() {
        var v = parseFloat(String(input.value).replace(',', '.'));
        if (!isFinite(v) || v <= 0) v = 0.1;
        return Math.round(v * 1000) / 1000;
      }

      function renderHistory() {
        histEl.innerHTML = history.map(function (h) {
          return '<div class="c-chip' + (h.win ? ' w' : '') + '">' + (h.side === 'heads' ? '\u041e' : '\u0420') + '</div>';
        }).join('');
      }

      function reset() {
        flipping = false;
        action.disabled = false;
        action.textContent = 'Бросить монету';
        coin.textContent = '\u041e';
      }

      function flip() {
        if (flipping) return;
        bet = readBet();
        input.value = bet.toFixed(2);

        var local = null;
        if (!API.online) {
          if (!Store.bet('coin', bet)) {
            UI.toast('Недостаточно средств', 'error');
            UI.deposit();
            return;
          }
          local = { result: Math.random() < 0.5 ? 'heads' : 'tails' };
          local.win = local.result === side;
          local.payout = local.win ? round3(bet * PAYOUT) : 0;
          if (local.win) Store.win('coin', local.payout, PAYOUT);
        }

        var startedAt = Date.now();
        var req = API.online
          ? API.coin(bet, side).then(function (r) {
              return { result: r.result, win: r.win, payout: API.toTon(r.payout_nano) };
            })
          : Promise.resolve(local);

        flipping = true;
        action.disabled = true;
        action.textContent = 'Монета в воздухе…';
        coin.classList.remove('flip');
        void coin.offsetWidth;
        coin.classList.add('flip');
        haptic('light');

        if (local) {
          setTimeout(function () {
            coin.textContent = local.result === 'heads' ? '\u041e' : '\u0420';
          }, 720);
        }

        req.then(function (r) {
          setTimeout(function () {
            coin.textContent = r.result === 'heads' ? '\u041e' : '\u0420';

            if (r.win) {
              UI.balance();
              UI.toast('+' + fmt(r.payout) + ' TON', 'success');
              haptic('success');
            } else {
              UI.toast('Не повезло', 'error');
              haptic('error');
            }

            history.unshift({ side: r.result, win: r.win });
            history = history.slice(0, 10);
            renderHistory();
            reset();
          }, Math.max(0, 1600 - (Date.now() - startedAt)));
        }).catch(function (e) {
          setTimeout(function () {
            reset();
            if (e.message === 'INSUFFICIENT') {
              UI.toast('Недостаточно средств', 'error');
              UI.deposit();
            } else {
              UI.toast('Ставка не принята', 'error');
            }
          }, Math.max(0, 1600 - (Date.now() - startedAt)));
        });
      }

      action.addEventListener('click', flip);

      for (var i = 0; i < sideBtns.length; i++) {
        sideBtns[i].addEventListener('click', function () {
          if (flipping) return;
          side = this.dataset.side;
          for (var j = 0; j < sideBtns.length; j++) sideBtns[j].classList.remove('active');
          this.classList.add('active');
          haptic('light');
        });
      }

      var chips = root.querySelectorAll('.chip');
      for (var k = 0; k < chips.length; k++) {
        chips[k].addEventListener('click', function () {
          input.value = parseFloat(this.dataset.v).toFixed(2);
          haptic('light');
        });
      }

      renderHistory();
      this.destroy = function () {};
    }
  });
})();
