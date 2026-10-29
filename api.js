/* api: Supabase-бэкенд upmoney. Без Telegram initData приложение работает в демо. */
(function () {
  'use strict';

  var URL = 'https://bmxoqwbpgsboyxauvlxu.supabase.co';
  var KEY = 'sb_publishable_rUXEME3abkpB8g7V9WunKw_GBMupHtP';
  var SESSION = 'upmoney_session';
  var NANO = 1e9;

  var API = {
    online: false,
    user: null,
    token: '',
    _boot: null,

    toTon: function (nano) { return Math.round(Number(nano) || 0) / NANO; },
    toNano: function (ton) { return Math.round(Number(ton) * NANO); },

    rpc: function (fn, body) {
      return fetch(URL + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: {
          'apikey': KEY,
          'Authorization': 'Bearer ' + KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body || {})
      }).then(function (r) {
        return r.text().then(function (t) {
          var data = null;
          try { data = t ? JSON.parse(t) : null; } catch (e) {}
          if (!r.ok) {
            var err = new Error((data && data.message) || ('HTTP ' + r.status));
            err.code = data && data.code;
            throw err;
          }
          return data;
        });
      });
    },

    boot: function () {
      if (API._boot) return API._boot;

      var tg = window.tg;
      if (!tg || !tg.initData) {
        API._boot = Promise.resolve(false);
        return API._boot;
      }

      try { API.token = localStorage.getItem(SESSION) || ''; } catch (e) { API.token = ''; }

      var attempt = API.token
        ? API.me().catch(function () { return API.login(); })
        : API.login();

      API._boot = attempt.then(function (res) {
        if (!res) return false;
        API.online = true;
        API.apply(res);
        return true;
      }).catch(function (e) {
        console.warn('upmoney api:', e && e.message);
        API.online = false;
        return false;
      });

      return API._boot;
    },

    login: function () {
      var tg = window.tg;
      var ref = '';
      try {
        var sp = tg.initDataUnsafe && tg.initDataUnsafe.start_param;
        if (sp && sp.indexOf('ref_') === 0) ref = sp.slice(4);
      } catch (e) {}

      return API.rpc('tg_login', { p_init_data: tg.initData, p_ref: ref || null })
        .then(function (res) {
          API.token = res.token;
          try { localStorage.setItem(SESSION, res.token); } catch (e) {}
          return res;
        });
    },

    me: function () {
      return API.rpc('me', { p_token: API.token });
    },

    apply: function (res) {
      var st = Store.state;

      st.balance = API.toTon(res.balance_nano);

      if (res.user) {
        API.user = res.user;
        if (res.user.name) st.name = res.user.name;
        if (res.user.ref_code) {
          if (!st.ref) st.ref = { code: '', invited: 0, earned: 0 };
          st.ref.code = res.user.ref_code;
          st.ref.invited = 0;
          st.ref.earned = 0;
          st.ref.friends = [];
        }
      }

      if (res.wagered_nano != null) {
        st.stats = {
          wagered: API.toTon(res.wagered_nano),
          won: API.toTon(res.won_nano),
          bets: res.bets || 0
        };
      }

      if (res.history && res.history.length) {
        st.history = res.history.map(function (h) {
          return {
            game: h.game || h.kind,
            amount: API.toTon(h.amount_nano),
            mult: (h.meta && h.meta.mult) || 0,
            type: h.kind,
            t: Date.parse(h.at) || Date.now()
          };
        });
      }

      Store.save();
    },

    sync: function (res) {
      if (res && res.balance_nano != null) {
        Store.state.balance = API.toTon(res.balance_nano);
        if (window.UI) UI.balance();
      }
      return res;
    },

    coin: function (bet, side) {
      return API.rpc('coin_flip', {
        p_token: API.token,
        p_amount_nano: API.toNano(bet),
        p_side: side
      }).then(API.sync);
    },

    casesList: function () {
      return API.rpc('cases_list', {});
    },

    caseSpin: function (key) {
      return API.rpc('case_spin', { p_token: API.token, p_key: key }).then(API.sync);
    },

    minesStart: function (bet, bombs) {
      return API.rpc('mines_start', {
        p_token: API.token,
        p_amount_nano: API.toNano(bet),
        p_bombs: bombs
      }).then(API.sync);
    },

    minesPick: function (round, cell) {
      return API.rpc('mines_pick', {
        p_token: API.token, p_round: round, p_cell: cell
      }).then(API.sync);
    },

    minesCashout: function (round) {
      return API.rpc('mines_cashout', { p_token: API.token, p_round: round }).then(API.sync);
    },

    crashStart: function (bet) {
      return API.rpc('crash_start', {
        p_token: API.token, p_amount_nano: API.toNano(bet)
      }).then(API.sync);
    },

    crashCashout: function (round, mult) {
      return API.rpc('crash_cashout', {
        p_token: API.token, p_round: round, p_mult: mult
      }).then(API.sync);
    },

    crashPoll: function (round) {
      return API.rpc('crash_poll', { p_token: API.token, p_round: round });
    },

    payInfo: function () {
      return API.rpc('pay_info', { p_token: API.token });
    },

    withdraw: function (amountNano, wallet) {
      return API.rpc('withdraw_request', {
        p_token: API.token,
        p_amount_nano: amountNano,
        p_wallet: wallet
      }).then(API.sync);
    },

    myWithdrawals: function () {
      return API.rpc('my_withdrawals', { p_token: API.token });
    }
  };

  window.API = API;
})();
