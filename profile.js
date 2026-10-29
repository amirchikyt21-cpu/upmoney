/* Профиль */
(function () {
  'use strict';

  var GAME_NAMES = { crash: 'Crash', mines: 'Mines', coin: 'Монетка', cases: 'Кейсы' };

  var PROMOS = { WELCOME: 0.5, UPMONEY: 1, LUCKY: 0.25, BOOST: 2 };
  var PROMO_COOLDOWN = 24 * 60 * 60 * 1000;

  function waitText(ms) {
    var min = Math.max(1, Math.ceil(ms / 60000));
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h > 0) return h + ' ч' + (m ? ' ' + m + ' мин' : '');
    return m + ' мин';
  }

  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  UI.register('profile', {
    render: function (root) {
      var st = Store.state;
      var name = userName();
      var profit = round3(st.stats.won - st.stats.wagered);

      if (!st.ref.code) {
        var u = window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user;
        st.ref.code = (u && u.id) ? String(u.id) : Math.random().toString(36).slice(2, 8);
        Store.save();
      }
      if (!Array.isArray(st.ref.friends)) st.ref.friends = [];
      if (!API.online && !st.ref.friends.length) {
        st.ref.friends = [
          { name: 'neonfox', f: 2, withdrawn: 0 },
          { name: 'mira', f: 3, withdrawn: 0 },
          { name: 'kite', f: 0, withdrawn: 0 }
        ];
        st.ref.invited = st.ref.friends.length;
        Store.save();
      }
      var refLink = 'https://t.me/upmoney_app?start=ref_' + st.ref.code;

      var inventory = st.inventory.slice(0, 8).map(function (it) {
        return '<div class="win-chip"><span style="font-size:16px">' + it.emoji + '</span>' +
          '<span>' + it.name + ' <b>+' + fmt(it.value) + '</b></span></div>';
      }).join('');

      var hist = st.history.slice(0, 15).map(function (h) {
        var plus = h.amount > 0;
        var name2 = GAME_NAMES[h.game] || h.game;
        return '<div class="hist-row">' +
          '<div><div class="g">' + name2 + (h.mult ? ' · ' + Number(h.mult).toFixed(2) + '\u00d7' : '') + '</div>' +
          '<div class="t">' + timeAgo(h.t) + '</div></div>' +
          '<div class="a ' + (plus ? 'plus' : 'minus') + '">' + (plus ? '+' : '') + fmt(h.amount) + ' TON</div>' +
          '</div>';
      }).join('');

      root.innerHTML =
        '<div class="topbar">' +
        '  <div class="brand">' +
        '    <span class="brand-spade">&#9824;</span>' +
        '    <div class="brand-text">upmoney</div>' +
        '  </div>' +
        '  <button class="bal-chip" data-deposit>' +
        '    <span data-balance>' + fmt(st.balance) + '</span>' + diamond(18) +
        '  </button>' +
        '</div>' +

        '<div class="profile-head">' +
        '  <div class="profile-ava">' + name.charAt(0).toUpperCase() + '</div>' +
        '  <div>' +
        '    <div class="profile-name">' + name + '</div>' +
        '    <div class="profile-sub"><span class="demo-badge">' + (API.online ? 'TON · БЕТА' : 'ДЕМО-АККАУНТ') + '</span></div>' +
        '  </div>' +
        '</div>' +

        '<div class="balance-card">' +
        '  <div class="mini-label">Баланс</div>' +
        '  <div class="amount">' + diamond(26) + fmt(st.balance) + ' <span>TON</span></div>' +
        '  <div class="balance-actions">' +
        '    <button class="btn btn-green btn-sm" data-deposit>Пополнить</button>' +
        '    <button class="btn btn-ghost btn-sm" id="withdraw">Вывести</button>' +
        '  </div>' +
        '</div>' +

        '<div class="stats">' +
        '  <div class="stat-box"><div class="mini-label">Оборот</div><div class="val">' + fmt(st.stats.wagered) + '</div></div>' +
        '  <div class="stat-box"><div class="mini-label">Ставок</div><div class="val">' + st.stats.bets + '</div></div>' +
        '  <div class="stat-box"><div class="mini-label">Профит</div><div class="val" style="color:' + (profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (profit > 0 ? '+' : '') + fmt(profit) + '</div></div>' +
        '</div>' +

        '<div class="section-title">Промокод</div>' +
        '<div class="promo-card">' +
        '  <div class="promo-row">' +
        '    <input id="promo" class="promo-input" type="text" placeholder="Введите код" autocomplete="off" spellcheck="false" />' +
        '    <button class="btn btn-green btn-sm" id="promo-go">Активировать</button>' +
        '  </div>' +
        '  <div class="promo-status" id="promo-status">Один код — раз в 24 часа</div>' +
        '</div>' +

        '<div class="section-title">Пригласи друга</div>' +
        '<div class="ref-card">' +
        '  <div class="ref-top">' +
        '    <div class="ref-link-wrap"><div class="mini-label">Ваша ссылка</div><div class="ref-link" id="ref-link">' + refLink + '</div></div>' +
        '    <div class="ref-count"><b id="ref-count">' + st.ref.invited + '</b><span>друзей</span></div>' +
        '  </div>' +
        '  <div class="ref-earn"><span>Заработано с друзей</span><b id="ref-earned">' + fmt(st.ref.earned || 0) + ' TON</b></div>' +
        '  <div class="balance-actions">' +
        '    <button class="btn btn-green btn-sm" id="ref-copy">Скопировать</button>' +
        '    <button class="btn btn-ghost btn-sm" id="ref-share">Поделиться</button>' +
        '  </div>' +
        '  <div class="promo-status">5% от выводов каждого друга' + (API.online ? '' : ' · демо') + '</div>' +
        '</div>' +

        (inventory ? '<div class="section-title">Последние дропы</div><div class="wins">' + inventory + '</div>' : '') +

        '<div class="section-title">История ставок</div>' +
        '<div class="hist">' + (hist || '<div class="empty">Пока пусто — сыграйте первую игру</div>') + '</div>' +

        (API.online
          ? '<div class="demo-note" style="margin-top:18px">Бета · реальные пополнения и выводы отключены.<br>Баланс начисляет администратор.</div>'
          : '<button class="btn btn-ghost" id="reset" style="margin-top:18px">Сбросить демо-баланс</button>' +
            '<div class="demo-note" style="margin-top:10px">Демо-режим · реальные депозиты и выводы подключаются отдельно</div>');

      UI.balance();

      var promoInput = root.querySelector('#promo');
      var promoStatus = root.querySelector('#promo-status');

      function setPromoStatus(text, cls) {
        promoStatus.textContent = text;
        promoStatus.className = 'promo-status' + (cls ? ' ' + cls : '');
      }

      function activatePromo() {
        if (API.online) {
          setPromoStatus('Промокоды вернутся после переноса на сервер', 'err');
          haptic('error');
          return;
        }

        var code = String(promoInput.value || '').trim().toUpperCase();
        if (!code) {
          setPromoStatus('Введите промокод', 'err');
          haptic('error');
          return;
        }

        var now = Date.now();
        var last = 0;
        for (var i = 0; i < st.promos.length; i++) {
          var p = st.promos[i];
          if (p.code === code && p.t > last) last = p.t;
        }
        if (last && now - last < PROMO_COOLDOWN) {
          setPromoStatus('Код ' + code + ' уже использован · повтор через ' + waitText(last + PROMO_COOLDOWN - now), 'err');
          haptic('error');
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(PROMOS, code)) {
          setPromoStatus('Промокод не найден', 'err');
          haptic('error');
          return;
        }

        st.promos = st.promos.filter(function (x) { return now - x.t < PROMO_COOLDOWN; });
        st.promos.push({ code: code, t: now });

        var bonus = PROMOS[code];
        Store.add(bonus);
        promoInput.value = '';
        setPromoStatus('Код ' + code + ' активирован · +' + fmt(bonus) + ' GRAM', 'ok');
        UI.balance();
        haptic('success');
        UI.toast('+' + fmt(bonus) + ' GRAM', 'success');
      }

      root.querySelector('#promo-go').addEventListener('click', activatePromo);
      promoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') activatePromo();
      });

      root.querySelector('#ref-copy').addEventListener('click', function () {
        haptic('light');
        UI.toast(copyText(refLink) ? 'Ссылка скопирована' : 'Не удалось скопировать');
      });

      root.querySelector('#ref-share').addEventListener('click', function () {
        haptic('light');
        var shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(refLink) +
          '&text=' + encodeURIComponent('Заходи в upmoney — играй на TON');
        if (window.tg && window.tg.openTelegramLink) window.tg.openTelegramLink(shareUrl);
        else window.open(shareUrl, '_blank');
      });

      root.querySelector('#withdraw').addEventListener('click', function () {
        UI.toast(API.online ? 'Выводы откроются после запуска оператора' : 'Демо: вывод появится после подключения мерчанта');
      });

      var resetBtn = root.querySelector('#reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          if (!window.confirm('Сбросить баланс до 5 TON и очистить историю?')) return;
          Store.reset();
          UI.toast('Демо-баланс сброшен');
          UI.balance();
          UI.go('profile');
        });
      }

      var refTimer = null;
      if (!API.online) refTimer = setInterval(function () {
        var fr = st.ref.friends[Math.floor(Math.random() * st.ref.friends.length)];
        var out = round3(0.2 + Math.random() * 2.8);
        var cut = round3(out * 0.05);
        fr.withdrawn = round3((fr.withdrawn || 0) + out);
        st.ref.earned = round3((st.ref.earned || 0) + cut);
        Store.add(cut);
        var el = root.querySelector('#ref-earned');
        if (el) el.textContent = fmt(st.ref.earned) + ' GRAM';
        haptic('success');
        UI.toast('+' + fmt(cut) + ' GRAM · 5% от вывода ' + fr.name, 'success');
      }, 12000);

      this.destroy = function () { clearInterval(refTimer); };
    }
  });
})();
