/* ui: router, tabs, sheets, toasts */
(function () {
  'use strict';

  var screenEl = document.getElementById('screen');
  var tabbar = document.getElementById('tabbar');
  var sheetEl = document.getElementById('sheet');
  var sheetBody = document.getElementById('sheet-body');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  var UI = {
    screens: {},
    current: null,
    route: 'home',
    params: {},
    stack: [],

    register: function (name, screen) { this.screens[name] = screen; },

    go: function (name, params) {
      var screen = this.screens[name];
      if (!screen) return;

      if (this.current && this.current.destroy) {
        try { this.current.destroy(); } catch (e) {}
      }

      if (this.route && this.route !== name) {
        this.stack.push({ name: this.route, params: this.params });
      }

      this.current = screen;
      this.route = name;
      this.params = params || {};

      document.body.classList.toggle('in-game', !!screen.fullscreen);
      screenEl.classList.toggle('screen--game', !!screen.fullscreen);
      tabbar.hidden = !!screen.fullscreen;

      screenEl.innerHTML = '';
      screenEl.scrollTop = 0;
      window.scrollTo(0, 0);
      screen.render(screenEl, this.params);

      var tabs = tabbar.querySelectorAll('.tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].dataset.route === name);
      }

      this.balance();
      this.syncBackButton();
    },

    tab: function (name) {
      this.stack = [];
      this.go(name);
      this.stack = [];
      this.syncBackButton();
    },

    back: function () {
      var prev = this.stack.pop();
      var target = prev ? prev.name : 'home';
      var params = prev ? prev.params : {};
      this.go(target, params);
    },

    syncBackButton: function () {
      if (!tg || !tg.BackButton) return;
      try {
        if (this.stack.length) tg.BackButton.show();
        else tg.BackButton.hide();
      } catch (e) {}
    },

    balance: function () {
      var nodes = document.querySelectorAll('[data-balance]');
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = fmt(Store.state.balance);
    },

    toast: function (text, kind) {
      toastEl.textContent = text;
      toastEl.className = 'toast show' + (kind ? ' toast--' + kind : '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 2300);
    },

    sheet: function (html) {
      sheetBody.innerHTML = html;
      sheetEl.classList.add('open');
      sheetEl.setAttribute('aria-hidden', 'false');
    },

    closeSheet: function () {
      sheetEl.classList.remove('open');
      sheetEl.setAttribute('aria-hidden', 'true');
    },

    deposit: function () {
      if (API.online) {
        this.sheet('<div class="sheet-grab"></div><div class="sheet-title">Пополнение</div>' +
          '<div class="mini-label" style="margin:0 4px 12px">Загружаем реквизиты…</div>');

        API.payInfo().then(function (info) {
          if (!info.wallet) {
            UI.sheet('<div class="sheet-grab"></div><div class="sheet-title">Пополнение</div>' +
              '<div class="sheet-note" style="text-align:left">Приём TON ещё не настроен. Напиши администратору — включим за минуту.</div>' +
              '<button class="btn btn-ghost big" id="dep-close" style="margin-top:14px">Закрыть</button>');
            sheetBody.querySelector('#dep-close').addEventListener('click', function () { UI.closeSheet(); });
            return;
          }

          var minTon = API.toTon(info.min_deposit_nano);

          UI.sheet(
            '<div class="sheet-grab"></div>' +
            '<div class="sheet-title">Пополнение TON</div>' +
            '<div class="mini-label" style="margin:0 4px 8px">Адрес кошелька</div>' +
            '<div class="pay-box" id="pay-wallet">' + info.wallet + '</div>' +
            '<button class="btn btn-ghost btn-sm" id="copy-wallet" style="width:100%;margin-bottom:14px">Скопировать адрес</button>' +
            '<div class="mini-label" style="margin:0 4px 8px">Комментарий к переводу · обязателен</div>' +
            '<div class="pay-box pay-box--accent" id="pay-memo">' + info.memo + '</div>' +
            '<button class="btn btn-ghost btn-sm" id="copy-memo" style="width:100%">Скопировать комментарий</button>' +
            '<div class="sheet-note" style="text-align:left;margin-top:14px">' +
            'Минимум <b>' + fmt(minTon) + ' TON</b>. Переводи TON на адрес и вставь комментарий — ' +
            'по нему платёж привяжется к твоему аккаунту. Без комментария зачислить не сможем.<br><br>' +
            'Зачисление проверяет администратор, обычно в течение часа.' +
            '</div>' +
            '<button class="btn btn-green big" id="dep-ok" style="margin-top:14px">Понятно</button>'
          );

          function copy(text, label) {
            var ok = false;
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text);
                ok = true;
              }
            } catch (e) {}
            haptic('light');
            UI.toast(ok ? label + ' скопирован' : 'Не удалось скопировать');
          }

          sheetBody.querySelector('#copy-wallet').addEventListener('click', function () { copy(info.wallet, 'Адрес'); });
          sheetBody.querySelector('#copy-memo').addEventListener('click', function () { copy(info.memo, 'Комментарий'); });
          sheetBody.querySelector('#dep-ok').addEventListener('click', function () { UI.closeSheet(); });
        }).catch(function () {
          UI.sheet('<div class="sheet-grab"></div><div class="sheet-title">Пополнение</div>' +
            '<div class="sheet-note">Не удалось загрузить реквизиты. Попробуй ещё раз.</div>' +
            '<button class="btn btn-ghost big" id="dep-close" style="margin-top:14px">Закрыть</button>');
          sheetBody.querySelector('#dep-close').addEventListener('click', function () { UI.closeSheet(); });
        });
        return;
      }

      var amounts = [0.1, 0.5, 1, 5, 10];
      var grid = amounts.map(function (a, i) {
        return '<button data-amount="' + a + '"' + (i === 0 ? ' class="is-min"' : '') + '>' +
          '+' + fmt(a) + (i === 0 ? '<span>мин</span>' : '') +
          '</button>';
      }).join('');

      this.sheet(
        '<div class="sheet-grab"></div>' +
        '<div class="sheet-title">Пополнение</div>' +
        '<div class="seg" id="pay-tabs">' +
        '<button class="active" data-pay="gram">TON</button>' +
        '<button data-pay="stars">Звёзды</button>' +
        '<button data-pay="gifts">Гифты</button>' +
        '</div>' +
        '<div class="mini-label" style="margin:0 4px 8px">Сумма · минимум 0.1 TON</div>' +
        '<div class="amount-grid">' + grid + '</div>' +
        '<button class="btn btn-green big" id="connect">Подключить кошелёк</button>' +
        '<div class="sheet-note">Минимальный депозит — <b>0.1 TON</b>. Демо-режим: реальные депозиты<br>включаются после подключения мерчанта TON / CryptoBot.</div>'
      );

      var tabs = sheetBody.querySelectorAll('#pay-tabs button');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function () {
          for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
          this.classList.add('active');
        });
      }

      var gridBtns = sheetBody.querySelectorAll('[data-amount]');
      for (var k = 0; k < gridBtns.length; k++) {
        gridBtns[k].addEventListener('click', function () {
          UI.closeSheet();
          UI.toast('Демо: пополнение на ' + fmt(this.dataset.amount) + ' TON появится после подключения мерчанта');
        });
      }

      sheetBody.querySelector('#connect').addEventListener('click', function () {
        UI.closeSheet();
        UI.toast('Подключение кошелька появится после настройки мерчанта');
      });
    },

    withdraw: function () {
      if (!API.online) {
        this.toast('В демо-режиме вывод недоступен');
        return;
      }

      this.sheet('<div class="sheet-grab"></div><div class="sheet-title">Вывод</div>' +
        '<div class="mini-label" style="margin:0 4px 12px">Загружаем данные…</div>');

      API.payInfo().then(function (info) {
        var minTon = API.toTon(info.min_withdraw_nano);
        var bal = API.toTon(info.balance_nano);
        var preset = [1, 2, 5, 10].filter(function (v) { return v <= bal; });
        var chips = preset.map(function (v) {
          return '<button class="c-chip" data-w="' + v + '">' + fmt(v) + '</button>';
        }).join('');

        UI.sheet(
          '<div class="sheet-grab"></div>' +
          '<div class="sheet-title">Вывод TON</div>' +
          '<div class="mini-label" style="margin:0 4px 8px">Баланс ' + fmt(bal) + ' TON · минимум ' + fmt(minTon) + ' TON</div>' +
          '<div class="bet-input" style="margin-bottom:10px">' +
          '  <input id="w-amount" type="text" inputmode="decimal" value="' + fmt(Math.max(minTon, Math.min(bal, minTon))) + '" />' +
          '  <span class="bet-cur">TON</span>' +
          '</div>' +
          '<div class="chips" style="margin-bottom:14px">' + chips +
          '<button class="c-chip" data-w="max">Всё</button></div>' +
          '<div class="mini-label" style="margin:0 4px 8px">Кошелёк TON для выплаты</div>' +
          '<div class="bet-input" style="margin-bottom:14px">' +
          '  <input id="w-wallet" type="text" placeholder="UQ…" />' +
          '</div>' +
          '<button class="btn btn-green big" id="w-send">Создать заявку</button>' +
          '<div class="sheet-note" style="text-align:left;margin-top:12px">' +
          'Деньги сразу списываются с баланса и ждут выплаты. Администратор отправляет TON вручную, обычно до 24 часов. ' +
          'Заявку можно увидеть в профиле.' +
          '</div>'
        );

        var amountEl = sheetBody.querySelector('#w-amount');
        var walletEl = sheetBody.querySelector('#w-wallet');
        var send = sheetBody.querySelector('#w-send');
        var chipBtns = sheetBody.querySelectorAll('[data-w]');

        for (var i = 0; i < chipBtns.length; i++) {
          chipBtns[i].addEventListener('click', function () {
            var v = this.dataset.w;
            amountEl.value = v === 'max' ? fmt(bal) : fmt(Number(v));
            haptic('light');
          });
        }

        send.addEventListener('click', function () {
          var amount = parseFloat(String(amountEl.value).replace(',', '.'));
          var wallet = String(walletEl.value || '').trim();

          if (!isFinite(amount) || amount < minTon) {
            UI.toast('Минимум ' + fmt(minTon) + ' TON', 'error');
            haptic('error');
            return;
          }
          if (amount > bal) {
            UI.toast('На балансе меньше', 'error');
            haptic('error');
            return;
          }
          if (wallet.length < 20) {
            UI.toast('Введи адрес кошелька TON', 'error');
            haptic('error');
            return;
          }

          send.disabled = true;
          send.textContent = 'Отправляем…';

          API.withdraw(API.toNano(amount), wallet).then(function (r) {
            UI.balance();
            UI.closeSheet();
            haptic('success');
            UI.toast('Заявка №' + r.id + ' принята · выплата до 24 ч', 'success');
          }).catch(function (e) {
            send.disabled = false;
            send.textContent = 'Создать заявку';
            haptic('error');
            if (e.message === 'INSUFFICIENT') UI.toast('Недостаточно средств', 'error');
            else if (e.message === 'BAD_WALLET') UI.toast('Проверь адрес кошелька', 'error');
            else if (e.message === 'BAD_AMOUNT') UI.toast('Сумма ниже минимума', 'error');
            else UI.toast('Заявка не создалась', 'error');
          });
        });
      }).catch(function () {
        UI.toast('Не удалось загрузить данные', 'error');
        UI.closeSheet();
      });
    }
  };

  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) { UI.go(go.dataset.go); return; }

    if (e.target.closest('[data-deposit]')) { UI.deposit(); return; }

    var back = e.target.closest('[data-back]');
    if (back) { UI.back(); return; }

    if (e.target.closest('[data-close]')) { UI.closeSheet(); return; }
  });

  window.UI = UI;
})();
