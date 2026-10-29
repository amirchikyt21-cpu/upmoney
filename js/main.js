/* bootstrap */
(function () {
  'use strict';

  Store.load();

  Store.on(function () { UI.balance(); });

  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      UI.tab(this.dataset.route);
      haptic('light');
    });
  }

  if (tg && tg.BackButton) {
    try {
      tg.BackButton.onClick(function () { UI.back(); });
    } catch (e) {}
  }

  UI.go('home');
})();
