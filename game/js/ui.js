'use strict';

// Buttons and the top bar that every activity shares.
const UI = (() => {
  function button(parent, icon, label, cls) {
    const b = U.el('button', 'round-btn' + (cls ? ' ' + cls : ''), parent);
    b.innerHTML = ICONS[icon] || '';
    b.setAttribute('aria-label', label);
    return b;
  }

  // Home button on the left, a quiet title in the middle, room for buttons on the right.
  function chrome(root, title) {
    const bar = U.el('div', 'chrome', root);
    const home = button(bar, 'home', 'Home', 'home-btn');
    let leaving = false;
    U.onTap(home, () => {
      if (leaving) return;
      leaving = true;
      Sound.pop();
      App.go('home');
    });
    const t = U.el('div', 'chrome-title', bar);
    t.textContent = title || '';
    const right = U.el('div', 'chrome-right', bar);
    return { bar, right };
  }

  return { button, chrome };
})();
