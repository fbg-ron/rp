'use strict';

// Starts the game and switches between screens.
const App = (() => {
  const root = document.getElementById('screen');
  const SCREENS = { home: Home, explore: Explore, count: Count, sums: Sums, words: Words, trace: Trace };
  let current = null;
  let name = '';

  function go(next) {
    if (current && current.exit) current.exit();
    root.innerHTML = '';
    root.className = 'screen-' + next;
    void root.offsetWidth; // restart the fade-in
    root.classList.add('fade-in');
    name = next;
    current = SCREENS[next];
    current.enter(root);
  }

  // The Android app calls this for the Back button. Back returns to the home screen;
  // on the home screen it does nothing, so the game can't be closed by accident.
  window.onAndroidBack = () => {
    if (name !== 'home') go('home');
    return true;
  };

  // The Android app reports the camera cutout here (in CSS pixels).
  window.setSafeInsets = (l, t, r, b) => {
    const s = document.documentElement.style;
    s.setProperty('--safe-l', l + 'px');
    s.setProperty('--safe-t', t + 'px');
    s.setProperty('--safe-r', r + 'px');
    s.setProperty('--safe-b', b + 'px');
  };

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      Sky.resize();
      FX.resize();
      if (current && current.resize) current.resize();
    }, 120);
  });

  // Browsers only allow sound after the first touch.
  document.addEventListener('pointerdown', () => Sound.init(), true);
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  if (window.AndroidBridge) Sound.init(); // the app allows sound right away

  Sky.start();
  FX.resize();
  go('home');

  return { go };
})();
