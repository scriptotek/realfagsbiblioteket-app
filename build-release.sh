#!/bin/bash

rm realfagsbiblioteket.apk

# Workaround for https://github.com/driftyco/ionic-cli/issues/1608
# rm -rf platforms/android/res/drawable-*
# rm -rf platforms/android/res/mipmap-*
# cp -r res/* platforms/android/res/
# rm -rf res

cordova build --release android

jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/keys/realfagsbiblioteket-release-key.keystore platforms/android/build/outputs/apk/android-release-unsigned.apk realfagsbiblkey

$ANDROID_HOME/build-tools/23.0.3/zipalign -v 4 platforms/android/build/outputs/apk/android-release-unsigned.apk realfagsbiblioteket.apk

