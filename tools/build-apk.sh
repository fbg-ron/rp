#!/usr/bin/env bash
# Builds the Little Orbit Android app (an APK) without Gradle or Android Studio.
#
# Needs a JDK (17 or newer) and the Android build tools that Ubuntu/Debian package:
#   sudo apt-get install aapt android-sdk-platform-23 android-framework-res \
#        dalvik-exchange zipalign apksigner
#
# The APK is signed with a key kept outside the repo (created on first run).
# Android only installs an update over an existing copy when it's signed with the
# same key, so keep that file if you want to update without uninstalling first.
#
# Output: build/LittleOrbit.apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
FRAMEWORK_RES="${FRAMEWORK_RES:-/usr/share/android-framework-res/framework-res.apk}"
KEYSTORE="${KEYSTORE:-$HOME/.android/littleorbit.keystore}"
KEYSTORE_PASS="${KEYSTORE_PASS:-littleorbit}"

rm -rf "$OUT"
mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/assets"
cp -r "$ROOT/game" "$OUT/assets/www"

echo "1/5 Packing the game and app resources"
aapt package -f -m \
  -M "$ROOT/android/AndroidManifest.xml" \
  -S "$ROOT/android/res" \
  -A "$OUT/assets" \
  -I "$FRAMEWORK_RES" \
  -J "$OUT/gen" \
  -F "$OUT/unsigned.apk"

echo "2/5 Compiling Java"
find "$ROOT/android/src" "$OUT/gen" -name '*.java' > "$OUT/sources.txt"
javac -source 8 -target 8 -Xlint:-options -encoding UTF-8 \
  -bootclasspath "$ANDROID_JAR" \
  -d "$OUT/classes" \
  @"$OUT/sources.txt"

echo "3/5 Converting to Android bytecode"
dalvik-exchange --dex --min-sdk-version=24 --output="$OUT/classes.dex" "$OUT/classes"
(cd "$OUT" && aapt add unsigned.apk classes.dex > /dev/null)

echo "4/5 Aligning"
zipalign -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "5/5 Signing"
if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KEYSTORE_PASS" -keypass "$KEYSTORE_PASS" \
    -alias littleorbit -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Little Orbit"
fi
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KEYSTORE_PASS" --out "$OUT/LittleOrbit.apk" "$OUT/aligned.apk"
apksigner verify "$OUT/LittleOrbit.apk"

echo "Done: $OUT/LittleOrbit.apk"
