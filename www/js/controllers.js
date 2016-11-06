// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the controllers we're gonna use
    angular.module('controllers', []);

    // ------------------------------------------------------------------------

    function AppCtrl() {
      var vm = this;
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('AppCtrl', AppCtrl);

    // ------------------------------------------------------------------------

    function FavoritesCtrl($scope, FavoriteFactory) {
      var vm = this;
      vm.results = [];

      $scope.$on('$ionicView.enter', activate);

      function activate() {
        FavoriteFactory.ls().then(function(results) {
          vm.results = results.map(function(row) { return row.book; });
        });
      }
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('FavoritesCtrl', FavoritesCtrl);

    // ------------------------------------------------------------------------

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
          }, function(error) {
            console.log(' > Status message endpoint is unreachable!');
          });
        }
      }
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('HomeCtrl', HomeCtrl);

    // ------------------------------------------------------------------------

    function IsbnCtrl($scope, $state, $ionicLoading, $ionicHistory, SearchFactory, XisbnFactory, scanditKey) {
      var vm = this;

      vm.authorTitleSearch = authorTitleSearch;
      vm.scan = checkCamera;
      vm.openPermissionSettings = openPermissionSettings;

      $scope.$on('$ionicView.enter', activate);

      /////

      function authorTitleSearch() {

        // Source: https://github.com/driftyco/ionic/issues/1287#issuecomment-67752210
        // @TODO: Remove if https://github.com/driftyco/ionic/pull/3811 get merged
        $ionicHistory.currentView($ionicHistory.backView());

        $state.go('app.search', {query: vm.title + ' ' + vm.author});
      }

      function setError(msg) {
        vm.error = msg;
      }

      function notAuthorized() {
        vm.cameraDenied = true;
        $scope.$apply(setError('Du må gi appen tilgang til kameraet hvis du ønsker å bruke strekkodelesing.'));
      }

      function checkCamera() {
        var diag = window.cordova.plugins.diagnostic;
        diag.isCameraPresent(function(present) {
          if (present) {
            checkPermissions();
          } else {
            $scope.$apply(setError('No camera found on this device.'));
          }
        }, function(error) {
          console.error('Failed to get camera status: ' + error);
          $scope.$apply(setError(error));
        });
      }

      function checkPermissions() {

        var diag = window.cordova.plugins.diagnostic;

        console.log('Checking camera authorization status...');
        diag.getPermissionAuthorizationStatus(function(status){
          if (status === diag.permissionStatus.NOT_REQUESTED) {

            console.log(' > Not requested yet. Requesting camera authorization...');
            requestCameraPermission();
          } else if (status === diag.permissionStatus.GRANTED) {
            console.log(' > Camera use permission has been granted.');
            scan();
          } else if (status === diag.permissionStatus.DENIED) {
            console.log(' > Camera use permission has been denied.');
            if (window.device.platform == 'Android') {
              // User denied access to this permission (without checking "Never Ask Again" box).
              // App can request permission again and user will be prompted again to allow/deny again.
              requestCameraPermission();
            }
            notAuthorized();
          } else {
            console.log(' > Camera use permission status is: ' + status);
            notAuthorized();
          }
        }, function(error){
          console.error('Failed to get camera authorization status: ' + error);
          vm.error = error;
        }, diag.permission.CAMERA);
      }

      function requestCameraPermission() {
        var diag = window.cordova.plugins.diagnostic;
        diag.requestRuntimePermission(function(status){
          if (status == diag.permissionStatus.GRANTED) {
            console.log(' > Authorization granted.');
            scan();
          } else {
            console.log(' > Authorization denied.');
            notAuthorized();
          }
        }, function(error){
          console.error(error);
          vm.error = error;
        }, diag.permission.CAMERA);
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
          vm.error = 'Failed to scan barcode: ' + error;
        });
      }

      function search(isbn) {
        $ionicLoading.show({
          template: '<ion-spinner></ion-spinner> Søker...'
        });

        SearchFactory.search(isbn)
        .then(function(data) {
          $ionicLoading.hide();

          if (data.results.length) {

            // Source: https://github.com/driftyco/ionic/issues/1287#issuecomment-67752210
            // @TODO: Remove if https://github.com/driftyco/ionic/pull/3811 get merged
            $ionicHistory.currentView($ionicHistory.backView());

            var result = data.results[0];

            if (result.type == 'group') {
              $state.go('app.group', {id: result.id});
            } else {
              $state.go('app.single', {id: result.id});
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
                vm.error = 'Boka ble ikke funnet.';
              }
            }, function(error) {
              console.log('XisbnFactory error: ', error);
              vm.error = error;
            });
          }
        }, function(error) {
          $ionicLoading.hide();
          vm.error = 'Søket gikk ut i feil';
        });
      }

    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('IsbnCtrl', IsbnCtrl);

    // ------------------------------------------------------------------------

    function SearchCtrl(SearchFactory, $state, $stateParams, $ionicLoading, $scope) {
      var vm = this;

      // Variables
      vm.error = null;
      vm.searchQuery = '';
      vm.results = [];
      vm.search = search;
      vm.showEbooks = true;
      vm.searchQuerySort = "date";

      // Total number of results (undefined until search carried out)
      vm.totalResults = undefined;

      // Helper variable to show/hide "no results" error message
      vm.noResults = false;

      // Helper variable for ionic-infinite-scroll. Set to false when there are no new books.
      vm.canLoadMoreResults = false;

      // On android loadMore() fires instantly even though immediate-check="false" on the ion-infinite-scroll element. Therefore use this helper variable:
      vm.initialSearchCompleted = false;

      // Functions
      vm.clickResult = clickResult;
      vm.loadMore = loadMore;
      vm.searchQueryUpdated = searchQueryUpdated;
      vm.sortBy = sortBy;

      activate();

      /////

      function activate() {
        vm.searchQuery = $stateParams.query;
        vm.search();
      }

      function sortBy(sort) {
        // Let's the user sort search results. This does not mean sorting the
        // results already displayed. This performs a new search with the sort
        // parameter updates
        if (vm.searchQuerySort !== sort) {
          vm.searchQuerySort = sort;
          vm.search();
        }
      }

      function searchQueryUpdated() {
        vm.noResults = false;
      }

      function searchCompleted() {
        // Can we load more books?
        // console.log('::', SearchFactory.searchResult.total_results, vm.results.length, SearchFactory.searchResult.total_results);
        vm.canLoadMoreResults = vm.totalResults === undefined || vm.results.length < SearchFactory.searchResult.total_results;
        $ionicLoading.hide();
        $scope.$broadcast('scroll.infiniteScrollComplete');
      }

      function loadMore() {
        // console.log('> loadMore, starting from ' + (vm.results.length+1));

        vm.error = null;
        SearchFactory.search(vm.searchQuery, vm.results.length+1, vm.searchQuerySort)
        .then(function(data) {
          vm.results = data.results;
          vm.totalResults = data.total_results;

          vm.noResults = (vm.results.length===0);
          searchCompleted();
        }, function(error) {
          console.log("error in search ctrl: ", error);
          vm.error = error.statusText ? error.statusText : 'Ingen nettverksforbindelse';
          searchCompleted();
        });

      }

      function search() {
        if (!vm.searchQuery) return;

        // Unfocus the input field to hide keyboard
        document.activeElement.blur();

        $ionicLoading.show({
          template: '<ion-spinner></ion-spinner> Søker...'
        });

        // If the url is not currently set to this query, update it
        if (vm.searchQuery !== $stateParams.query) {
          // Update the url without reloading, so that the user can go back in history to this search.
          $state.go('app.search', {query: vm.searchQuery}, {notify: false});
          $stateParams.query = vm.searchQuery; // Is this needed??
        }

        vm.totalResults = undefined;
        vm.results = [];
        loadMore();
      }

      function clickResult(book) {
        if (book.type === "group") {
          // Multiple editions for this book. Navigate to group (search)view
          $state.go('app.group', {
            id: book.id
          });
        }else{
          // Just a single edition for this book. Navigate straight to it.
          $state.go('app.single', {
            id: book.id
          });
        }
      }

    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('SearchCtrl', SearchCtrl);

    // ------------------------------------------------------------------------

function GroupCtrl(SearchFactory, $stateParams) {
      var vm = this;

      // Variables
      vm.searchId = '';
      vm.results = [];
      vm.showEbooks = true;
      // Functions
      vm.search = search;

      activate();

      /////

      function activate() {
        vm.searchId = $stateParams.id;
        vm.search();
      }

      function search() {
        if (!vm.searchId || 0 === vm.searchId.length) return;

        SearchFactory.lookUpGroup(vm.searchId)
        .then(function(data) {
          // console.log("got data in search controller");
          vm.results = data;
        }, function(error) {
          console.log("error in group search ctrl");
        });
      }

    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('GroupCtrl', GroupCtrl);

    // ------------------------------------------------------------------------

    function BookCtrl($stateParams, SearchFactory, $ionicLoading, $ionicPopup, $ionicModal, FavoriteFactory, $scope, $cordovaSocialSharing) {
      var vm = this;

      vm.book = null;
      vm.busy = true;
      vm.mapModal = mapModal;
      vm.shareBook = shareBook;
      vm.onDevice = false;

      // List of local libraries in preferred order.
      // @TODO: Get from some global config
      var config = {
        libraries: {
          local: {
            code: 'UBO1030310',
            name: 'Realfagsbiblioteket',
            openStackCollections: [  // sorted in order of increasing preference ('Pensum' is less preferred than the rest)
              'k00471',  // UREAL Pensum
              'k00460',  // UREAL Laveregrad
              'k00413',  // UREAL Astr.
              'k00421',  // UREAL Biol.
              'k00447',  // UREAL Geo.
              'k00449',  // UREAL Geol.
              'k00426',  // UREAL Farm.
              'k00457',  // UREAL Kjem.
              'k00440',  // UREAL Fys.
              'k00465',  // UREAL Mat.
              'k00475',  // UREAL Samling 42
              'k00477',  // UREAL SciFi
              'k00423',  // UREAL Boksamling
            ]
          },
          satellites: [
            {code: 'UBO1030317', name: 'Informatikkbiblioteket'},
            {code: 'UBO1030500', name: 'Naturhistorisk museum'}
          ]
        }
      };
      vm.config = config;

      vm.toggleFavorite = toggleFavorite;

      activate();

      /////

      function shareBook(book) {
        var subject = "Hei!";
        var message = "Sjekk ut denne boka: " +
          book.title;

        if (vm.onDevice) {
          $cordovaSocialSharing.share(message, subject, null, book.links.primo);
        } else {
          alert('Not running on a device');
        }
      }

      function mapModal(holding) {

        vm.imageUrl = holding.map_url_image + '&orientation=f';
        vm.callcode = holding.callcode;

        $ionicModal.fromTemplateUrl('book-map-modal.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.modal = modal;

          $scope.openModal();
        });

        $scope.openModal = function() {
          $scope.modal.show();
        };
        $scope.closeModal = function() {
          $scope.modal.hide();
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function() {
          $scope.modal.remove();
        });
        // Execute action on hide modal
        $scope.$on('modal.hidden', function() {
          // Execute action
        });
        // Execute action on remove modal
        $scope.$on('modal.removed', function() {
          // Execute action
        });

      }

      function activate() {
        $ionicLoading.show({
          template: '<ion-spinner></ion-spinner> Laster...'
        });

        SearchFactory.getBookDetails($stateParams.id, config)
        .then(function(data) {
          $ionicLoading.hide();
          vm.busy = false;

          // Did we have the book stored in favorites?
          FavoriteFactory.get(data.id).then(function(res) {
            data.isFavorite = (res !== null);
          });

          vm.books = [data];
        }, function(error) {
          $ionicLoading.hide();
          vm.busy = false;
          vm.error = error;
        });

        // Helper variable
        if (window.cordova) {
          vm.onDevice = true;
        }
      }

      function toggleFavorite(book) {
        // Update view
        book.isFavorite = !book.isFavorite;

        // Update storage
        if (book.isFavorite) {
          FavoriteFactory.put(book);
        } else {
          FavoriteFactory.rm(book);
        }
      }
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('BookCtrl', BookCtrl);

    // ------------------------------------------------------------------------

})();
