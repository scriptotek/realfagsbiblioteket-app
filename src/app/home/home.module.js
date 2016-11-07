(function() {

  angular
    .module('app.home', [])
    .controller('HomeCtrl', HomeCtrl);

  // --------------------------------------------------------------------------

  function HomeCtrl($scope, $ionicPlatform, $http) {
    var vm = this;

    $ionicPlatform.ready(ready);

    /////

    function ready() {

      if (!window.navigator.appInfo) {
        vm.status = 'Not currently running on a device.';
      } else {
        var platform = ionic.Platform.platform();
        var deviceInfo = ionic.Platform.device();
        var appVersion = window.navigator.appInfo.version;

        vm.status = null;

        console.log('Checking server status...');
        $http({
          url: 'https://ub-www01.uio.no/realfagsbiblioteket-app/status',
          method: 'GET',
          cache: false,
          params: {
            platform: platform,
            platform_version: deviceInfo.version,
            app_version: appVersion,
            device: deviceInfo.manufacturer + ' ' + deviceInfo.model,
          }
        }).then(function(response) {
          if (response.data.status == 'ok') {
            console.log(' > Server says it\'s OK!');
          } else {
            console.log(' > Server reports problems:');
            console.log(' > ' + response.data.status);
            vm.status = response.data.status;
          }
        }, function() {
          console.log(' > Status message endpoint is unreachable!');
        });
      }
    }
  }

})();
