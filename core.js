/* core: storage, formatting, telegram helpers */
(function () {
  'use strict';

  var KEY = 'gramhouse_v1';

  function r3(n) { return Math.round(n * 1000) / 1000; }

  function fmt(v) {
    var n = r3(Number(v) || 0);
    if (Math.abs(n) >= 1000) return n.toLocaleString('ru-RU');
    var s = n.toFixed(3).replace(/0$/, '');
    return s;
  }

  var Store = {
    state: null,
    listeners: [],

    load: function () {
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }

      var base = {
        balance: 5,
        history: [],
        inventory: [],
        stats: { wagered: 0, won: 0, bets: 0 },
        name: '',
        promos: [],
        ref: null
      };

      this.state = Object.assign(base, saved || {});
      this.state.stats = Object.assign(base.stats, (saved && saved.stats) || {});
      if (!Array.isArray(this.state.history)) this.state.history = [];
      if (!Array.isArray(this.state.inventory)) this.state.inventory = [];
      if (!Array.isArray(this.state.promos)) this.state.promos = [];
      this.state.promos = this.state.promos.map(function (p) {
        if (typeof p === 'string') return { code: p, t: Date.now() };
        return p;
      }).filter(function (p) { return p && p.code; });
      if (!this.state.ref) this.state.ref = { code: '', invited: 0, earned: 0 };
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) {}
      for (var i = 0; i < this.listeners.length; i++) this.listeners[i](this.state);
    },

    on: function (fn) { this.listeners.push(fn); },

    can: function (v) { return this.state.balance + 1e-9 >= v; },

    sub: function (v) {
      if (!this.can(v)) return false;
      this.state.balance = r3(this.state.balance - v);
      this.state.stats.wagered = r3(this.state.stats.wagered + v);
      this.state.stats.bets += 1;
      this.save();
      return true;
    },

    add: function (v) {
      this.state.balance = r3(this.state.balance + v);
      this.save();
    },

    bet: function (game, v) {
      if (!this.sub(v)) return false;
      this.push({ game: game, amount: -v, type: 'bet' });
      return true;
    },

    win: function (game, v, mult) {
      this.state.balance = r3(this.state.balance + v);
      this.state.stats.won = r3(this.state.stats.won + v);
      this.push({ game: game, amount: v, mult: mult || 0, type: 'win' });
      this.save();
    },

    push: function (e) {
      e.t = Date.now();
      this.state.history.unshift(e);
      this.state.history = this.state.history.slice(0, 80);
    },

    reset: function () {
      this.state.balance = 5;
      this.state.history = [];
      this.state.inventory = [];
      this.state.stats = { wagered: 0, won: 0, bets: 0 };
      this.save();
    }
  };

  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#0b0b0b');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#0b0b0b');
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    } catch (e) {}
  }

  function haptic(kind) {
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (kind === 'success') tg.HapticFeedback.notificationOccurred('success');
      else if (kind === 'error') tg.HapticFeedback.notificationOccurred('error');
      else tg.HapticFeedback.impactOccurred('light');
    } catch (e) {}
  }

  function diamond(size) {
    size = size || 18;
    return '<img class="diamond" src="assets/ton.png" width="' + size + '" height="' + size +
      '" alt="TON" />';
  }

  function userName() {
    if (Store.state.name) return Store.state.name;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      var u = tg.initDataUnsafe.user;
      var n = u.first_name || u.username || 'Игрок';
      Store.state.name = n;
      return n;
    }
    return 'Вы';
  }

  function timeAgo(ts) {
    var d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'только что';
    if (d < 3600) return Math.floor(d / 60) + ' мин назад';
    if (d < 86400) return Math.floor(d / 3600) + ' ч назад';
    return Math.floor(d / 86400) + ' дн назад';
  }

  window.Store = Store;
  window.fmt = fmt;
  window.tg = tg;
  window.haptic = haptic;
  window.diamond = diamond;
  window.userName = userName;
  window.timeAgo = timeAgo;
  window.round3 = r3;
})();
