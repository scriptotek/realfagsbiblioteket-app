## realfagsbiblioteket-app

Ionic-based app (Android, iOs) for searching and navigating the UiO Science Library. The code is licensed under the MIT license, but not the icons (See the credits section below for info about the icons).

Former https://github.com/saqimtiaz/BibSearch/

### Development

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

Remember to bump version in `config.xml`.

Android:

* `cordova build --release android`
* `jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore realfagsbiblioteket-release-key.keystore platforms/android/build/outputs/apk/android-release-unsigned.apk realfagsbiblkey`
* `$ANDROID_HOME/build-tools/23.0.1/zipalign -v 4 platforms/android/build/outputs/apk/android-release-unsigned.apk realfagsbiblioteket.apk`

iOS:

* `ionic prepare ios`
* Open `platforms/ios/Realfagsbiblioteket.xcodeproj`
* Select `Generic iOS Device` in the dropdown menu at the toolbar.
* Select the `Product → Archive` menu item.
* This should also open up the `Organizer - Archives` window in XCode automatically.
  If it doesn't, you can click the `Window → Organizer` menu item.

Additional notes for iOs/XCode:

* UiO has a organization membership to Apple Developer, so you need to be added to the organization.
* Once added, you can request a certificate (press the plus button under `iOs certificates` at https://developer.apple.com/membercenter/). Follow the instructions and add the certificate to your keychain.
* In XCode: log in to your Apple ID under `Preferences → Accounts` and download the provisioning profile under `View details`.
* Under `Build Settings`, fill in values under `Code Signing`.

### Credits

The app originates from a 2012 user driven innovation student project [“Bookworms”](http://www.uio.no/studier/emner/matnat/ifi/INF2260/h12/projects/library-projects/Bookworms/). The student group consisted of Jeongyun Choi, Lena Drevsjø, Saq Imtiaz, Hilde Bakken Reistad, and Therese Slang. During spring 2013 the group developed the design into a working app, with support from [Kyrre Traavik Låberg](https://github.com/kyrretl) and [Dan Michael O. Heggø](https://github.com/danmichaelo) at the Science Library. In 2016 a reworked version 2.0 based on Ionic was prepared by [Stian Lågstad](https://github.com/stianlagstad) and Dan Michael.

The app icon and related graphics was made by [Yvonne Edvartsen](https://github.com/trekkoppmus).

The icons used in search results are made by [Freepik](http://www.freepik.com) from [www.flaticon.com](http://www.flaticon.com), and are licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/). The maps used are © OpenStreetMap contributors ([CC-BY-SA 2.0](http://creativecommons.org/licenses/by-sa/2.0/)).