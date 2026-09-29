'use strict';

// Spoken words. Inside the Android app the phone's own text-to-speech voice is used
// (through the AndroidBridge the app adds); in a browser, the Web Speech API.
const Speech = (() => {
  let on = U.store.get('voice', true);
  let voice = null;
  const hasWebSpeech = 'speechSynthesis' in window;

  const bridge = () =>
    window.AndroidBridge && typeof window.AndroidBridge.speak === 'function' ? window.AndroidBridge : null;

  function pickVoice() {
    const all = speechSynthesis.getVoices();
    const en = all.filter((v) => /^en([-_]|$)/i.test(v.lang));
    voice =
      en.find((v) => /Google US English/i.test(v.name)) ||
      en.find((v) => /en[-_]US/i.test(v.lang) && v.localService) ||
      en.find((v) => /en[-_]US/i.test(v.lang)) ||
      en[0] ||
      null;
  }

  if (hasWebSpeech) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function say(text) {
    if (!on || !text) return;
    const b = bridge();
    if (b) {
      try {
        b.speak(String(text));
      } catch (e) {
        /* the app is closing */
      }
      return;
    }
    if (!hasWebSpeech) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = 0.88;
    u.pitch = 1.12;
    // Chrome sometimes drops an utterance queued in the same tick as cancel().
    setTimeout(() => speechSynthesis.speak(u), 30);
  }

  function stop() {
    const b = bridge();
    if (b && typeof b.stop === 'function') {
      try {
        b.stop();
      } catch (e) {
        /* ignore */
      }
    }
    if (hasWebSpeech) speechSynthesis.cancel();
  }

  return {
    say,
    stop,
    letter: (ch) => say(U.LETTER_NAMES[ch] || ch),
    number: (n) => say(U.NUMBER_WORDS[n] || String(n)),
    get on() {
      return on;
    },
    set on(v) {
      on = v;
      U.store.set('voice', v);
      if (!v) stop();
    },
  };
})();
