/* Кейсы */
(function () {
  'use strict';

  var ITEM_W = 78;
  var GAP = 8;
  var STEP = ITEM_W + GAP;

  var CASES = [
    {
      id: 'neon', name: 'Неон', emoji: '\uD83D\uDCAB', price: 0.5,
      items: [
        { name: 'Осколок', emoji: '\uD83D\uDD39', rarity: '', value: 0.05, w: 50 },
        { name: 'Кристалл', emoji: '\uD83D\uDCAB', rarity: 'rare', value: 0.25, w: 30 },
        { name: 'Ледяной клинок', emoji: '\uD83D\uDDE1\uFE0F', rarity: 'rare', value: 0.8, w: 11.5 },
        { name: 'Аура', emoji: '\uD83D\uDD2E', rarity: 'epic', value: 2, w: 5.5 },
        { name: 'Корона льда', emoji: '\uD83D\uDC51', rarity: 'legend', value: 8, w: 1.2 }
      ]
    },
    {
      id: 'ice', name: 'Лёд', emoji: '\u2744\uFE0F', price: 2,
      items: [
        { name: 'Снежок', emoji: '\uD83D\uDD39', rarity: '', value: 0.2, w: 48 },
        { name: 'Ледяная маска', emoji: '\uD83C\uDFAD', rarity: 'rare', value: 1, w: 30 },
        { name: 'Клинок', emoji: '\uD83D\uDDE1\uFE0F', rarity: 'rare', value: 3, w: 14 },
        { name: 'Дракон', emoji: '\uD83D\uDC09', rarity: 'epic', value: 7, w: 6 },
        { name: 'Абсолют', emoji: '\uD83D\uDC8E', rarity: 'epic', value: 18, w: 1.5 },
        { name: 'Трон', emoji: '\uD83D\uDC51', rarity: 'legend', value: 25, w: 0.5 }
      ]
    },
    {
      id: 'crown', name: 'Корона', emoji: '\uD83D\uDC51', price: 5,
      items: [
        { name: 'Пыль', emoji: '\u2728', rarity: '', value: 0.5, w: 42 },
        { name: 'Печать', emoji: '\uD83D\uDD31', rarity: 'rare', value: 2, w: 30 },
        { name: 'Скипетр', emoji: '\u269C\uFE0F', rarity: 'rare', value: 5, w: 14 },
        { name: 'Корона', emoji: '\uD83D\uDC51', rarity: 'epic', value: 12, w: 7 },
        { name: 'Феникс', emoji: '\uD83D\uDD25', rarity: 'epic', value: 30, w: 2.5 },
        { name: 'Джекпот', emoji: '\uD83D\uDC8E', rarity: 'legend', value: 60, w: 0.8 },
        { name: 'Легенда', emoji: '\uD83C\uDF1F', rarity: 'legend', value: 150, w: 0.2 }
      ]
    }
  ];

  function pick(caseObj) {
    var total = 0;
    for (var i = 0; i < caseObj.items.length; i++) total += caseObj.items[i].w;
    var r = Math.random() * total;
    var acc = 0;
    for (var j = 0; j < caseObj.items.length; j++) {
      acc += caseObj.items[j].w;
      if (r <= acc) return caseObj.items[j];
    }
    return caseObj.items[caseObj.items.length - 1];
  }

  UI.register('cases', {
    fullscreen: true,

    render: function (root) {
      var selected = 0;
      var spinning = false;
      var spinTimer = null;
      var pending = null;

      root.innerHTML =
        '<div class="gamebar">' +
        '  <button class="icon-btn" data-back aria-label="Назад">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '  </button>' +
        '  <div class="gamebar-title">Кейсы</div>' +
        '  <div class="bal-chip small"><span data-balance>' + fmt(Store.state.balance) + '</span>' + diamond(16) + '</div>' +
        '</div>' +

        '<div class="case-tabs" id="tabs"></div>' +

        '<div class="roulette"><div class="roulette-strip" id="strip"></div></div>' +

        '<div class="case-result" id="result" hidden></div>' +

        '<div class="panel" style="margin-top:0">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:0 4px">' +
        '    <span class="mini-label">Цена кейса</span>' +
        '    <b id="price" style="font-size:17px">0.50 GRAM</b>' +
        '  </div>' +
        '  <button class="btn btn-green big" id="action">Открыть кейс</button>' +
        '</div>';

      var tabsEl = root.querySelector('#tabs');
      var stripEl = root.querySelector('#strip');
      var resultEl = root.querySelector('#result');
      var priceEl = root.querySelector('#price');
      var action = root.querySelector('#action');
      var rouletteEl = root.querySelector('.roulette');

      function renderTabs() {
        tabsEl.innerHTML = CASES.map(function (c, i) {
          return '<button class="case-card' + (i === selected ? ' active' : '') + '" data-case="' + i + '">' +
            '<div class="case-emoji">' + c.emoji + '</div>' +
            '<div class="case-name">' + c.name + '</div>' +
            '<div class="case-price">' + fmt(c.price) + ' GRAM</div>' +
            '</button>';
        }).join('');

        var btns = tabsEl.querySelectorAll('[data-case]');
        for (var i = 0; i < btns.length; i++) {
          btns[i].addEventListener('click', function () {
            if (spinning) return;
            selected = Number(this.dataset.case);
            renderTabs();
            renderIdle();
            syncPrice();
            haptic('light');
          });
        }
      }

      function syncPrice() {
        priceEl.textContent = fmt(CASES[selected].price) + ' GRAM';
      }

      function itemHTML(item) {
        return '<div class="r-item ' + item.rarity + '">' + item.emoji + '<small>' + fmt(item.value) + '</small></div>';
      }

      function renderIdle() {
        var html = '';
        for (var i = 0; i < 12; i++) html += itemHTML(pick(CASES[selected]));
        stripEl.style.transition = 'none';
        stripEl.style.transform = 'translateX(0px)';
        stripEl.innerHTML = html;
      }

      function open() {
        if (spinning) return;

        var caseObj = CASES[selected];
        if (!Store.bet('cases', caseObj.price)) {
          UI.toast('Недостаточно средств', 'error');
          UI.deposit();
          return;
        }

        spinning = true;
        action.disabled = true;
        action.textContent = 'Открываем…';
        resultEl.hidden = true;

        var winner = pick(caseObj);
        pending = { item: winner, caseObj: caseObj };

        var strip = [];
        for (var i = 0; i < 42; i++) strip.push(pick(caseObj));
        strip[38] = winner;

        stripEl.innerHTML = strip.map(itemHTML).join('');
        stripEl.style.transition = 'none';
        stripEl.style.transform = 'translateX(0px)';
        void stripEl.offsetWidth;

        var viewport = rouletteEl.clientWidth;
        var jitter = (Math.random() - 0.5) * 36;
        var target = viewport / 2 - (38 * STEP + ITEM_W / 2) + jitter;

        stripEl.style.transition = 'transform 4.2s cubic-bezier(.12,.72,.06,1)';
        stripEl.style.transform = 'translateX(' + target + 'px)';

        spinTimer = setTimeout(settle, 4300);
      }

      function settle() {
        spinTimer = null;
        if (!pending) return;

        var item = pending.item;
        var caseObj = pending.caseObj;
        pending = null;

        Store.win('cases', item.value, 0);
        Store.state.inventory.unshift({
          name: item.name, emoji: item.emoji, value: item.value, caseName: caseObj.name, t: Date.now()
        });
        Store.state.inventory = Store.state.inventory.slice(0, 24);
        Store.save();

        UI.balance();
        haptic('success');

        resultEl.hidden = false;
        resultEl.innerHTML =
          '<div style="font-size:38px;line-height:1">' + item.emoji + '</div>' +
          '<div class="name">' + item.name + '</div>' +
          '<div class="val">+' + fmt(item.value) + ' GRAM</div>';

        spinning = false;
        action.disabled = false;
        action.textContent = 'Открыть ещё';
      }

      action.addEventListener('click', open);

      renderTabs();
      renderIdle();
      syncPrice();

      this.destroy = function () {
        if (spinTimer) {
          clearTimeout(spinTimer);
          spinTimer = null;
          if (pending) settle();
        }
      };
    }
  });
})();
