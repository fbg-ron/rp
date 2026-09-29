# Little Orbit

A calm space game for toddlers who love planets, numbers and letters. There is nothing
to lose: no timers, no scores, no ads, and no internet connection.

## What's inside

- **Planets**: the whole solar system, slowly turning. Drag to look around, pinch to zoom,
  and tap a planet or moon to hear its name and a fact while the view flies there. Tap the
  letters of the name to hear each letter. Look out for the asteroid belt and the
  occasional comet.
- **Count**: tap each moon around a planet to count it out loud. It starts with a few moons
  and slowly works up to ten.
- **Math**: adding with pictures, like 2 stars + 1 star. Drag or tap the answer. A wrong
  answer just floats back and the pictures count themselves out loud. It gets harder
  slowly (sums up to 10, then taking away) and eases off again if needed.
- **Words**: drag letter bubbles onto the matching letters to spell SUN, MOON, MARS, and
  later longer words up to JUPITER. Tap a bubble to hear its letter.
- **Write**: trace big letters (A–Z) or numbers (1–10) with a finger, which leaves
  glowing star dust. Finish one to hear something like "M is for Moon".

The two buttons on the home screen turn the music and the voice on or off.

## Put it on an Android phone or tablet

Needs Android 7.0 or newer.

1. Copy `LittleOrbit.apk` to the device, or download it there.
2. Open it. Android asks whether to allow installing apps from that place (Files, Chrome,
   and so on). Allow it, then tap **Install**.
3. If Play Protect says it doesn't recognize the app, choose to install anyway.

The voice is the device's own text-to-speech voice (Settings → Text-to-speech).

To keep a little one inside the game, turn on app pinning (in Settings, search for
"pin"). In the game, Back goes to the home screen and never closes the game.

## Play in a browser

Open `game/index.html` in Chrome or another modern browser. Everything works the same;
the voice comes from the browser.

## Build the APK

`tools/build-apk.sh` builds `build/LittleOrbit.apk` with the Android build tools that
Ubuntu and Debian package, so Android Studio isn't needed. The packages to install are
listed at the top of the script.

The first build creates a signing key in `~/.android/littleorbit.keystore`. Android only
lets a new version replace an installed one when both are signed with the same key. If
you build somewhere else, uninstall the old copy first; this resets the game's progress.

## How it's made

- `game/`: the game itself, in plain HTML, CSS and JavaScript with no libraries. All the
  art is drawn in code and all the sounds are made with Web Audio.
- `android/`: a small Android app that shows the game full screen in a WebView and lends
  it the phone's text-to-speech voice.
- `tools/build-apk.sh`: the build script.
