(function() {

  angular
    .module('app.about', [])
    .controller('AboutCtrl', Ctrl);

  // --------------------------------------------------------------------------

  function Ctrl($ionicPlatform, $cordovaSocialSharing, $window, $ionicHistory, gettextCatalog, localStorageService) {
    var vm = this;
    this.lang = gettextCatalog.getCurrentLanguage();
    console.log('Lang: ' + this.lang);

    // Register for translation
    gettextCatalog.getString('Norwegian Bokmål');
    gettextCatalog.getString('English');

    this.languages = {
      nb: {
        name: 'Norwegian Bokmål',
      },
      en: {
        name: 'English',
      },
    };
    this.setLang = setLang;

    vm.share = share;

    $ionicPlatform.ready(ready);

    /////

    function setLang() {
      console.log('Set lang: ', vm.lang);
      localStorageService.set('lang', vm.lang);
      gettextCatalog.setCurrentLanguage(vm.lang);
      $ionicHistory.clearCache();
    }

    function ready() {

      vm.language = $window.navigator.language;
      if (!window.navigator.appInfo) {
        vm.device = '(not running on a device)';
      } else {
        var platform = ionic.Platform.platform();
        var deviceInfo = ionic.Platform.device();

        vm.device = deviceInfo.manufacturer + ' ' + deviceInfo.model;
        vm.platform = platform + ' ' + deviceInfo.version;
        vm.app_version = window.navigator.appInfo.version;
        vm.app_build = window.navigator.appInfo.build;
      }
    }

    function share() {
      if (!window.cordova) {
        console.log('Not on a device');
        return;
      }
      $cordovaSocialSharing.shareWithOptions({
        message: gettextCatalog.getString('Here it is: '),   // not supported on some apps (Facebook, Instagram)
        subject: gettextCatalog.getString('Try the UiO Science Library app 🤓'),   // fi. for email
        url: 'https://app.uio.no/ub/bdi/realfagsbiblioteket/',
      });
    }
  }

})();
