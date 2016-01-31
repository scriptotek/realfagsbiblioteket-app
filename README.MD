## realfagsbiblioteket-app

Ionic-based app (Android, iOs) for searching and navigating the UiO Science Library. The code is licensed under the MIT license, but not the icons (See the credits section below for info about the icons).

Former https://github.com/saqimtiaz/BibSearch/

### Development

* `npm install` to install deps
* `gulp install` to install frontend deps
* Install Scandit:
  * Since Scandit is not open source, we cannot distribute it on GitHub. Create an account at Scandit, download `scandit-barcodescanner-community-phonegap_4.11.0.zip` from https://ssl.scandit.com/account/sdk and unzip it in the root project folder.
  * `ionic plugin add scandit-barcodescanner-community-phonegap_4.11.0`
  * `cp config/env.dist.json config/env.json` and add your API key to the file.
* `gulp` to build CSS from SASS and inject the Scandit API key

To start a dev server: `ionic serve`

#### Build and run on Android

`ionic run android --device`

To build for Android you need Java and Android Studio. Use the SDK manager to fetch a recent SDK. Remember to set the `ANDROID_HOME` environment variable.

#### Build and run on iOS

@TODO

### Credits

The app originates from a 2012 user driven innovation student project [“Bookworms”](http://www.uio.no/studier/emner/matnat/ifi/INF2260/h12/projects/library-projects/Bookworms/). The student group consisted of Jeongyun Choi, Lena Drevsjø, Saq Imtiaz, Hilde Bakken Reistad, and Therese Slang. During spring 2013 the group developed the design into a working app, with support from [Kyrre Traavik Låberg](https://github.com/kyrretl) and [Dan Michael O. Heggø](https://github.com/danmichaelo) at the Science Library. In 2016 a reworked version 2.0 based on Ionic was created by [Stian Lågstad](https://github.com/stianlagstad).

The app icon was made by [Yvonne Edvartsen](https://github.com/trekkoppmus). The icons used in search results are made by [Freepik](http://www.freepik.com) from [www.flaticon.com](http://www.flaticon.com), and are licensed under [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/).