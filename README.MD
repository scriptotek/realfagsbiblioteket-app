## realfagsbiblioteket-app

Ionic-based app (Android, iOs) for searching and navigating the UiO Science Library. The code is licensed under the MIT license, but not the icons (See the credits section below for info about the icons).

Former https://github.com/saqimtiaz/BibSearch/

Useful adb commands:

    adb shell am start -a android.intent.action.DELETE -d package:no.uio.ub.realfagsbiblioteket
    adb shell pm revoke no.uio.ub.realfagsbiblioteket android.permission.CAMERA


### Server dependencies

- bibapp.biblionaut.net (just a proxy for lsm)
- lsm.biblionaut.net
- https://app.uio.no/ub/bdi/realfagsbiblioteket/status.php

### Development

[![Codacy Badge](https://api.codacy.com/project/badge/grade/acfe39f1875f42849e0b92c1a052afc7)](https://www.codacy.com/app/danmichaelo/realfagsbiblioteket-app)
[![Stories in Ready](https://badge.waffle.io/scriptotek/realfagsbiblioteket-app.svg?label=ready&title=Ready)](http://waffle.io/scriptotek/realfagsbiblioteket-app)

* To build for Android you need Java and Android Studio. Use the SDK manager to fetch a recent SDK. Remember to set the `ANDROID_HOME` environment variable.
* To build for iOs, you need the latest XCode and `npm install -g ios-sim ios-deploy`.

Setup:

* `npm install` to install deps
* `gulp install` to install frontend deps
* Install Scandit:
  * Since Scandit is not open source, we cannot distribute it on GitHub. Create an account at Scandit, download `scandit-barcodescanner-community-phonegap_4.11.0.zip` from https://ssl.scandit.com/account/sdk and unzip it in the root project folder.
  * `ionic plugin add scandit-barcodescanner-community-phonegap_4.11.0`
  * `cp config/env.dist.json config/env.json` and add your API key to the file.
* `gulp` to build CSS from SASS and inject the Scandit API key

A few useful commands:

* `ionic serve` to start a dev server
* `ionic run android --device` to run on a connected Android device with USB debugging enabled
* `ionic emulate --target="iPhone-4s" ios` (`ios-sim showdevicetypes` to list available devices)

#### Preparing a release

Remember to

- `config.xml`: Bump version.
- `config.xml`: Remove this:
  ```xml
    <gap:config-file parent="/manifest" platform="android">
      <application android:debuggable="true"/>
    </gap:config-file>
  ```
- `index.html`: Switch to production Content Security Policy

Android:

* `cordova build --release android`
* `jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore realfagsbiblioteket-release-key.keystore platforms/android/build/outputs/apk/android-release-unsigned.apk realfagsbiblkey`
* `$ANDROID_HOME/build-tools/23.0.1/zipalign -v 4 platforms/android/build/outputs/apk/android-release-unsigned.apk realfagsbiblioteket.apk`

iOS:

* `ionic prepare ios`
* Open `platforms/ios/Realfagsbiblioteket.xcodeproj`
  * Select `Generic iOS Device` in the dropdown menu at the toolbar and `Target → Realfagsbiblioteket`.
  ![XCode 1](meta/xcode1.png)
  * Under `Build Settings`, fill in values under `Code Signing`.
  ![XCode 2](meta/xcode2.png)
  * Delete the icon entry in Realfagsbiblioteket-Info.plist: http://stackoverflow.com/a/19358534/489916
  * Add the 167x167 icon manually unless this has been fixed: https://github.com/driftyco/ionic-cli/issues/713
* Select the `Product → Archive` menu item.
  * This should also open up the `Organizer - Archives` window in XCode automatically.
  If it doesn't, you can click the `Window → Organizer` menu item.
  * Click `Validate`, then `Upload`. Cross your fingers…

Additional notes for iOs/XCode:

* UiO has a organization membership to Apple Developer, so you need to be added to the organization.
* Once added, you can request a certificate (press the plus button under `iOs certificates` at https://developer.apple.com/membercenter/). Follow the instructions and add the certificate to your keychain.
* In XCode: log in to your Apple ID under `Preferences → Accounts` and download the provisioning profile under `View details`.


## Tips

* Using Ionic CLI 2.1.4 and iOs 10.1, running

    ionic emulate ios --livereload --consolelogs --serverlogs

gave me

    0     657911   log      deviceready has not fired after 5 seconds.
    1     657940   log      Channel not fired: onAppInfoReady
    2     657941   log      Channel not fired: onCordovaInfoReady
    3     657944   log      Channel not fired: onCordovaConnectionReady

Turned out to be caused by my development Content-Security-Policy, and fixed
by adding `default-src gap://ready *`. This led to the status page failing with
status 0, though, which I first thought was related, but it was not. This turned
out to be an issue with an outdated ssl configuration (cipher set or something)
at app.uio.no. Moving the status page to another server solved the problem.


### Credits

The app originates from a 2012 user driven innovation student project [“Bookworms”](http://www.uio.no/studier/emner/matnat/ifi/INF2260/h12/projects/library-projects/Bookworms/). The student group consisted of Jeongyun Choi, Lena Drevsjø, Saq Imtiaz, Hilde Bakken Reistad, and Therese Slang. During spring 2013 the group developed the design into a working app, with support from [Kyrre Traavik Låberg](https://github.com/kyrretl) and [Dan Michael O. Heggø](https://github.com/danmichaelo) at the Science Library. In 2016 a reworked version 2.0 based on Ionic was prepared by [Stian Lågstad](https://github.com/stianlagstad) and Dan Michael.

The app icon and related graphics was made by [Yvonne Edvartsen](https://github.com/trekkoppmus).

The icons used in search results are made by [Freepik](http://www.freepik.com) from [www.flaticon.com](http://www.flaticon.com), and are licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/). The maps used are © OpenStreetMap contributors ([CC-BY-SA 2.0](http://creativecommons.org/licenses/by-sa/2.0/)).

The social sharing icons used are [from here](http://www.graphicsfuel.com/2013/06/simple-flat-social-media-icons-psd-png/).
