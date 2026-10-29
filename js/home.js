/* home screen */
(function () {
  'use strict';

  var GAMES = [
    { route: 'crash', img: 'crash', title: 'Crash', sub: '' },
    { route: 'mines', img: 'mines', title: 'Mines', sub: '10 мин' },
    { route: 'coin', img: 'coin', title: 'Монетка', sub: '50/50' },
    { route: 'cases', img: 'cases', title: 'Кейсы', sub: '' }
  ];

  var NAMES = ['Vlad', 'Mira', 'Kite', 'Solo', 'Neo', 'Rin', 'Kay', 'Max'];

  function liveWins() {
    var out = '';
    for (var i = 0; i < 8; i++) {
      var n = NAMES[Math.floor(Math.random() * NAMES.length)];
      var amount = (Math.random() * 2.4 + 0.05).toFixed(2);
      out += '<div class="win-chip">' +
        '<div class="win-ava">' + n.charAt(0) + '</div>' +
        '<span>' + n + ' <b>+' + amount + '</b> GRAM</span>' +
        '</div>';
    }
    return out;
  }

  UI.register('home', {
    render: function (root) {
      var tiles = GAMES.map(function (g) {
        return '<button class="tile" data-go="' + g.route + '">' +
          '<img src="assets/' + g.img + '.png" alt="' + g.title + '" />' +
          '<div class="tile-shade"></div>' +
          '<div class="tile-title">' + g.title + '</div>' +
          (g.sub ? '<div class="tile-badge">' + g.sub + '</div>' : '') +
          '</button>';
      }).join('');

      root.innerHTML =
        '<div class="topbar">' +
        '  <div class="brand">' +
        '    <span class="brand-spade">&#9824;</span>' +
        '    <div class="brand-text">upmoney</div>' +
        '  </div>' +
        '  <button class="bal-chip" data-deposit>' +
        '    <span data-balance>' + fmt(Store.state.balance) + '</span>' +
        diamond(18) +
        '  </button>' +
        '</div>' +

        '<div class="section-title">Игры</div>' +
        '<div class="grid">' + tiles + '</div>' +

        '<div class="section-title">Последние выигрыши</div>' +
        '<div class="wins">' + liveWins() + '</div>';

      UI.balance();
    }
  });
})();
