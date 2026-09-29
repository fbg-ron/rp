'use strict';

// Everything you hear is made on the fly with Web Audio: soft bells on a pentatonic
// scale (every note sounds nice with every other note) and a slow, quiet space lullaby.
const Sound = (() => {
  let ctx = null;
  let sfxBus = null;
  let musicBus = null;
  let nextNoteAt = 0;
  let nextPadAt = 0;
  let padIndex = 0;
  let lastMelody = -1;
  let musicOn = U.store.get('music', true);
  const MUSIC_LEVEL = 0.55;

  const STEPS = [0, 2, 4, 7, 9];
  // Pentatonic note number -> frequency. 0 is middle C, 5 is the C above it.
  const freq = (i) => 261.63 * Math.pow(2, (12 * Math.floor(i / 5) + STEPS[((i % 5) + 5) % 5]) / 12);

  // Slow chords under the melody: C, A minor, F, G (as frequencies).
  const PADS = [
    [130.81, 196.0, 329.63],
    [110.0, 164.81, 261.63],
    [87.31, 130.81, 220.0],
    [98.0, 146.83, 196.0],
  ];

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);

    // A soft echo makes everything sound spacious.
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.38;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.33;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2400;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    damp.connect(wet);
    wet.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    sfxBus.connect(delay);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? MUSIC_LEVEL : 0;
    musicBus.connect(master);
    musicBus.connect(delay);

    nextNoteAt = ctx.currentTime + 1.2;
    nextPadAt = ctx.currentTime + 0.3;
    setInterval(scheduleMusic, 250);
  }

  function tone(f, { t, dur = 1.2, type = 'sine', gain = 0.2, attack = 0.012, bus = sfxBus, glide = 0 }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, t + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // A small glassy bell: a sine with two quieter overtones.
  function bell(f, at, gain, dur, bus) {
    if (!ctx) return;
    const t = ctx.currentTime + (at || 0);
    const b = bus || sfxBus;
    tone(f, { t, dur, gain, bus: b });
    tone(f * 2, { t, dur: dur * 0.5, gain: gain * 0.22, bus: b });
    tone(f * 3.01, { t, dur: dur * 0.25, gain: gain * 0.07, bus: b });
  }

  function scheduleMusic() {
    if (!ctx || !musicOn || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (nextNoteAt < now) nextNoteAt = now + 0.2;
    if (nextPadAt < now) nextPadAt = now + 0.2;

    while (nextPadAt < now + 0.6) {
      const chord = PADS[padIndex++ % PADS.length];
      chord.forEach((f) => {
        [-3, 3].forEach((cents) => {
          const detuned = f * Math.pow(2, cents / 1200);
          tone(detuned, { t: nextPadAt, dur: 9.5, attack: 3, gain: 0.018, bus: musicBus, type: 'sine' });
        });
      });
      nextPadAt += 8;
    }

    while (nextNoteAt < now + 0.6) {
      let n;
      do n = U.randInt(5, 13);
      while (n === lastMelody);
      lastMelody = n;
      const t = nextNoteAt - now;
      bell(freq(n), t, 0.045, 3.2, musicBus);
      if (Math.random() < 0.25) bell(freq(n + 2), t + 0.45, 0.03, 3, musicBus);
      nextNoteAt += U.rand(1.7, 3.4);
    }
  }

  function noiseSweep(from, to, dur, gain) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(sfxBus);
    src.start(t);
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    init,
    freq,
    chime(i) {
      bell(freq(8 + (i % 7)), 0, 0.14, 1.6);
    },
    count(n) {
      bell(freq(4 + n), 0, 0.16, 1.4);
    },
    pop() {
      if (!ctx) return;
      tone(560, { t: ctx.currentTime, dur: 0.2, gain: 0.16, glide: 0.55 });
    },
    // Neutral "try again" sound: low and soft, never a buzzer.
    soft() {
      bell(freq(2), 0, 0.09, 0.9);
    },
    sparkle() {
      [10, 12, 14, 15].forEach((n, k) => bell(freq(n), k * 0.08, 0.08, 1.1));
    },
    success() {
      [5, 7, 9, 10, 12].forEach((n, k) => bell(freq(n), k * 0.11, 0.12, 2));
    },
    twinkle() {
      bell(freq(U.randInt(7, 14)), 0, 0.06, 1.3);
    },
    whoosh() {
      noiseSweep(300, 2200, 0.9, 0.05);
    },
    get musicOn() {
      return musicOn;
    },
    set musicOn(on) {
      musicOn = on;
      U.store.set('music', on);
      if (ctx) musicBus.gain.setTargetAtTime(on ? MUSIC_LEVEL : 0, ctx.currentTime, 0.4);
    },
  };
})();
