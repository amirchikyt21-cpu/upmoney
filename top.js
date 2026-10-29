/* Топ игроков */
(function () {
  'use strict';

  var NAMES = [
    ['Vlad', '#ff8a8a'], ['Mira', '#8ec5ff'], ['Kite', '#c3a7ff'],
    ['Solo', '#ffd166'], ['Neo', '#7ef0a8'], ['Rin', '#ffa8d8'],
    ['Kay', '#9fe3ff'], ['Max', '#ffbf8a'], ['Lara', '#b6ff9e']
  ];

  var board = null;

  function buildBoard() {
    var list = NAMES.map(function (n) {
      return { name: n[0], color: n[1], profit: Math.round((Math.random() * 40 - 4) * 100) / 100 };
    });

    var you = Store.state.stats.won - Store.state.stats.wagered;
    list.push({ name: userName(), color: '#7ef0a8', profit: round3(you), me: true });

    list.sort(function (a, b) { return b.profit - a.profit; });
    return list;
  }

  UI.register('top', {
    render: function (root) {
      if (!board) board = buildBoard();
      else {
        for (var i = 0; i < board.length; i++) {
          if (board[i].me) board[i].profit = round3(Store.state.stats.won - Store.state.stats.wagered);
        }
        board.sort(function (a, b) { return b.profit - a.profit; });
      }

      var rows = board.map(function (p, i) {
        var rank = i + 1;
        var sign = p.profit >= 0 ? '+' : '';
        return '<div class="lb-row' + (p.me ? ' me' : '') + '">' +
          '<div class="lb-rank' + (rank <= 3 ? ' top' : '') + '">' + rank + '</div>' +
          '<div class="lb-ava" style="background:' + p.color + '">' + p.name.charAt(0).toUpperCase() + '</div>' +
          '<div class="lb-name">' + p.name + (p.me ? ' <span class="mini-label">вы</span>' : '') + '</div>' +
          '<div class="lb-sum' + (p.profit < 0 ? ' neg' : '') + '">' + sign + fmt(p.profit) + '</div>' +
          '</div>';
      }).join('');

      root.innerHTML =
        '<div class="topbar">' +
        '  <div class="brand">' +
        '    <span class="brand-spade">&#9824;</span>' +
        '    <div class="brand-text">upmoney</div>' +
        '  </div>' +
        '  <button class="bal-chip" data-deposit>' +
        '    <span data-balance>' + fmt(Store.state.balance) + '</span>' + diamond(18) +
        '  </button>' +
        '</div>' +

        '<div style="padding:4px 4px 18px">' +
        '  <div style="font-size:30px;font-weight:900;letter-spacing:-.02em">Топ игроков</div>' +
        '  <div class="mini-label" style="margin-top:8px">Профит за всё время · демо-данные</div>' +
        '</div>' +

        '<div class="lb">' + rows + '</div>';

      UI.balance();
    }
  });
})();
