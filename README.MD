## realfagsbiblioteket-app

Ionic-based app (Android, iOs) for searching and navigating the UiO Science Library. Licensed under the MIT license.

Former https://github.com/saqimtiaz/BibSearch/

### Development

Run `npm install` followed by `cordova plugin add https://github.com/phonegap/phonegap-plugin-barcodescanner.git` to fetch all dependencies, then `ionic serve` to start a dev server.

#### Build and run on Android

`ionic run android --device`

To build for Android you need Java and Android Studio. Use the SDK manager to fetch a recent SDK. Remember to set the `ANDROID_HOME` environment variable. 

#### Build and run on iOS

..
