(function() {

  angular
    .module('app.isbn', ['app.search', 'app.xisbn', 'app.constants'])
    .controller('IsbnCtrl', IsbnCtrl);

  // --------------------------------------------------------------------------

  function IsbnCtrl($scope, $state, $ionicLoading, $ionicHistory, _, SearchFactory, XisbnFactory, scanditKey, gettextCatalog) {
    var vm = this;

    vm.authorTitleSearch = authorTitleSearch;
    vm.scan = checkCamera;
    vm.openPermissionSettings = openPermissionSettings;

    $scope.$on('$ionicView.enter', activate);

    /////

    function authorTitleSearch() {

      // Source: https://github.com/driftyco/ionic/issues/1287#issuecomment-67752210
      // @TODO: Remove if https://github.com/driftyco/ionic/pull/3811 get merged
      $ionicHistory.removeBackView();
      // $ionicHistory.currentView($ionicHistory.backView());

      $state.go('app.search', {query: vm.title + ' ' + vm.author});
    }

    function setError(msg) {
      vm.error = msg;
    }

    function diagnosticError(error) {
      console.error(error);
      $scope.$apply(setError(error));
    }

    function notAuthorized() {
      vm.cameraDenied = true;
      var msg = gettextCatalog.getString('You must grant the app permission to use the camera if you want to read barcodes.');
      $scope.$apply(setError(msg));
    }

    function checkCamera() {
      var diag = window.cordova.plugins.diagnostic;
      diag.isCameraPresent(function(present) {
        if (present) {
          checkPermissions();
        } else {
          $scope.$apply(setError(gettextCatalog.getString('No camera found on this device.')));
        }
      }, diagnosticError);
    }

    function checkPermissions() {
      var diag = window.cordova.plugins.diagnostic;
      console.log('Checking camera authorization status...');
      if (window.device.platform === 'Android') {
        // We won't use diag.getCameraAuthorizationStatus, since it also asks
        // for READ_EXTERNAL_STORAGE, which we don't need.
        diag.getPermissionAuthorizationStatus(checkAuthorizationStatus, diagnosticError, diag.permission.CAMERA);
      } else {
        diag.getCameraAuthorizationStatus(checkAuthorizationStatus, diagnosticError);
      }
    }

    function checkAuthorizationStatus(status) {
      var diag = window.cordova.plugins.diagnostic;
      if (status === diag.permissionStatus.GRANTED) {
        console.log(' > Camera use permission has been granted.');
        scan();
      } else if (status === diag.permissionStatus.NOT_REQUESTED || status === diag.permissionStatus.NOT_DETERMINED) {
        console.log(' > Not requested yet. Requesting camera authorization...');
        requestCameraPermission();
      } else if (status === diag.permissionStatus.DENIED && window.device.platform == 'Android') {
        console.log(' > Camera use permission has been denied once.');
        // User denied access to this permission (without checking "Never Ask Again" box).
        // App can request permission again and user will be prompted again to allow/deny again.
        requestCameraPermission();
      } else {
        console.log(' > Camera use permission status is: ' + status);
        notAuthorized();
      }
    }

    function requestCameraPermission() {
      var diag = window.cordova.plugins.diagnostic;
      if (window.device.platform === 'Android') {
        diag.requestRuntimePermission(requestCameraPermissionCallback, diagnosticError, diag.permission.CAMERA);
      } else {
        diag.requestCameraAuthorization(requestCameraPermissionCallback, diagnosticError);
      }
    }

    function requestCameraPermissionCallback(status) {
      var diag = window.cordova.plugins.diagnostic;
      if (status == diag.permissionStatus.GRANTED) {
        console.log(' > Authorization granted.');
        scan();
      } else {
        console.log(' > Authorization denied.');
        notAuthorized();
      }
    }

    function openPermissionSettings() {
      var diag = window.cordova.plugins.diagnostic;
      diag.switchToSettings(function(){
        console.log('Successfully switched to Settings app');
      }, function(error){
        console.error('Failed switching to Settings app: ' + error);
      });
    }

    function scan() {

      resetState();

      // @TODO: Inject as a dependency, so we can mock it
      window.cordova.exec(success, failure, 'ScanditSDK', 'scan', [scanditKey, {
        beep: true,
        code128: false,
        dataMatrix: false
      }]);
    }

    function resetState() {
      vm.author = undefined;
      vm.title = undefined;
      vm.isbn = undefined;
      vm.error = undefined;
      vm.cameraDenied = false;
    }

    function activate() {
      if (!window.cordova) {
        vm.error = 'Not running on a device.';
        return;
      }

      resetState();
      vm.scan();
    }

    function success(data) {
      // data[0]: the barcode
      // data[1]: code type (EAN)
      $scope.$apply(function() {
        search(data[0]);
      });
    }

    function failure(error) {
      $scope.$apply(function() {
        if (error == 'Canceled') {
          $ionicHistory.goBack();
        } else {
          vm.error = 'Failed to scan barcode: ' + error;
        }
      });
    }

    function search(isbn) {
      $ionicLoading.show({
        template: '<ion-spinner icon="ripple" class="spinner-energized"></ion-spinner> ' + gettextCatalog.getString('Searching...'),
        noBackdrop: true,
        delay: 500,
      });

      SearchFactory.search(isbn, 'BIBSYS')
      .then(function(data) {
        $ionicLoading.hide();

        if (data.results.length) {

          // Source: https://github.com/driftyco/ionic/issues/1287#issuecomment-67752210
          // @TODO: Remove if https://github.com/driftyco/ionic/pull/3811 get merged
          $ionicHistory.currentView($ionicHistory.backView());

          var result = data.results[0];

          if (result.type == 'group') {
            $state.go('app.editions', {id: result.id, scope: 'BIBSYS'});
          } else {
            $state.go('app.book', {id: result.id});
          }

        } else {

          XisbnFactory.getMetadata(isbn).then(function(metadata) {
            if (metadata.stat == 'ok' && metadata.list.length) {
              vm.isbn = isbn;
              var author = _.get(metadata.list[0], 'author', '');
              author = author.replace(/[,;:].*$/, ''); // Slightly aggressive
              author = author.replace(/\. Trans.*$/, '');  // Remove 'Translated by…'
              author = author.replace(/\. Ed.*$/, '');  // Remove 'Edited by…'
              vm.author = author;
              vm.title = metadata.list[0].title;
            } else {
              vm.error = gettextCatalog.getString('Couldn\'t find the book.');
            }
          }, function(error) {
            console.log('XisbnFactory error: ', error);
            // vm.error = error;
            vm.error = gettextCatalog.getString('Couldn\'t find the book.');
          });
        }
      }, function() {
        $ionicLoading.hide();
        vm.error = gettextCatalog.getString('The search failed.');
      });
    }

  }

})();
