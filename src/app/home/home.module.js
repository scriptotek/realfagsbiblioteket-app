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
      vm.status = null;
      var device_info,
        device_str,
        platform,
        platform_version,
        app_version;

      if (window.navigator.appInfo) {
        app_version = window.navigator.appInfo.version;
        platform = ionic.Platform.platform();
        device_info = ionic.Platform.device();
        platform_version = device_info.version;
        device_str = device_info.manufacturer + ' ' + device_info.model;
      }

      console.log('Checking server status...');
      $http({
        url: 'https://ub-www01.uio.no/realfagsbiblioteket-app/status',
        method: 'GET',
        cache: false,
        params: {
          platform: platform,
          platform_version: platform_version,
          app_version: app_version,
          device: device_str,
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

})();
