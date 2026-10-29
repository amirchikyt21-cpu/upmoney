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
        '<button class="active" data-pay="gram">GRAM</button>' +
        '<button data-pay="stars">Звёзды</button>' +
        '<button data-pay="gifts">Гифты</button>' +
        '</div>' +
        '<div class="mini-label" style="margin:0 4px 8px">Сумма · минимум 0.1 GRAM</div>' +
        '<div class="amount-grid">' + grid + '</div>' +
        '<button class="btn btn-green big" id="connect">Подключить кошелёк</button>' +
        '<div class="sheet-note">Минимальный депозит — <b>0.1 GRAM</b>. Демо-режим: реальные депозиты<br>включаются после подключения мерчанта GRAM / CryptoBot / xRocket.</div>'
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
          UI.toast('Демо: пополнение на ' + fmt(this.dataset.amount) + ' GRAM появится после подключения мерчанта');
        });
      }

      sheetBody.querySelector('#connect').addEventListener('click', function () {
        UI.closeSheet();
        UI.toast('Подключение кошелька появится после настройки мерчанта');
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
