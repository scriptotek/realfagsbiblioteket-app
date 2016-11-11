(function() {

  angular
    .module('app.about', [])
    .controller('AboutCtrl', Ctrl);

  // --------------------------------------------------------------------------

  function Ctrl($ionicPlatform, $cordovaSocialSharing) {
    var vm = this;

    vm.share = share;

    $ionicPlatform.ready(ready);

    /////

    function ready() {

      vm.language = window.navigator.language;
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
        message: 'Hei, her er Realfagsbiblioteket-appen:',   // not supported on some apps (Facebook, Instagram)
        subject: 'Prøv Realfagsbiblioteket-appen',   // fi. for email
        url: 'https://app.uio.no/ub/bdi/realfagsbiblioteket/',
      });
    }
  }

})();
