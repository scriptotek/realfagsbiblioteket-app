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

    function FavoritesCtrl(SearchFactory) {
      var vm = this;
      vm.results = SearchFactory.favorites;
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('FavoritesCtrl', FavoritesCtrl);

    // ------------------------------------------------------------------------

    function HomeCtrl() {
      var vm = this;
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('HomeCtrl', HomeCtrl);

    // ------------------------------------------------------------------------

    function IsbnCtrl($scope, $state, $ionicLoading, $ionicHistory, SearchFactory, XisbnFactory, scanditKey) {
      var vm = this;

      vm.authorTitleSearch = authorTitleSearch;
      vm.scan = scan;

      $scope.$on('$ionicView.enter', activate);

      /////

      function authorTitleSearch() {

        // Source: https://github.com/driftyco/ionic/issues/1287#issuecomment-67752210
        // @TODO: Remove if https://github.com/driftyco/ionic/pull/3811 get merged
        $ionicHistory.currentView($ionicHistory.backView());

        $state.go('app.search', {query: vm.title + ' ' + vm.author});
      }

      function scan() {
        // @TODO: Inject as a dependency, so we can mock it
        window.cordova.exec(success, failure, 'ScanditSDK', 'scan', [scanditKey, {
          beep: true,
          code128: false,
          dataMatrix: false
        }]);
      }

      function activate() {
        if (!window.cordova) {
          vm.error = 'Not running on a device.';
          return;
        }

        vm.author = undefined;
        vm.title = undefined;
        vm.isbn = undefined;
        vm.error = undefined;

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

            $state.go('app.single', {id: data.results[0].id});

          } else {

            XisbnFactory.getMetadata(isbn).then(function(metadata) {
              console.log(Object.keys(metadata));
              if (metadata.stat == 'ok' && metadata.list.length) {
                vm.isbn = isbn;
                var author = _.get(metadata.list[0], 'author', '');
                author = author.replace(/[.,;?]\s*$/, '');
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
      vm.searchQuery = '';
      vm.results = [];
      vm.search = search;
      vm.showEbooks = true;
      // Helper variable to show/hide "no results" error message
      vm.noResults = false;
      // Helper variable for ionic-infinite-scroll. Set to false when there are no new books.
      vm.canLoadMoreResults = true;
      // On android loadMore() fires instantly even though immediate-check="false" on the ion-infinite-scroll element. Therefore use this helper variable:
      vm.initialSearchCompleted = false;
      // Functions
      vm.clickResult = clickResult;
      vm.loadMore = loadMore;
      vm.searchQueryUpdated = searchQueryUpdated;
      vm.totalResults = 0;

      activate();

      /////

      function activate() {
        vm.searchQuery = $stateParams.query;
        vm.search();
      }

      function searchQueryUpdated() {
        vm.noResults = false;
      }

      function loadMore() {
        // Can we load more books?
        if (vm.canLoadMoreResults && vm.results.length > 0 && vm.results.length === SearchFactory.searchResult.total_results) {
          vm.canLoadMoreResults = false;
        }

        // Don't load more if there are no more results
        if (!vm.canLoadMoreResults) {
          return;
        }

        SearchFactory.search(vm.searchQuery, vm.results.length+1)
        .then(function(data) {
          vm.results = vm.results.concat(data.results);

          if (vm.results.length===0) vm.noResults = true;
          else vm.noResults = false;
          
          $scope.$broadcast('scroll.infiniteScrollComplete');
        }, function(error) {
          console.log("error in search ctrl");
          $scope.$broadcast('scroll.infiniteScrollComplete');
        });

      }

      function search() {
        if (!vm.searchQuery || 0 === vm.searchQuery.length) return;

        document.activeElement.blur();

        $ionicLoading.show({
          template: '<ion-spinner></ion-spinner> Søker...'
        });

        // If the url is not currently set to this query, update it
        if (vm.searchQuery !== $stateParams.query) {
          // Update the url without reloading, so that the user can go back in history to this search.
          $state.go('app.search', {query: vm.searchQuery}, {notify: false});
          $stateParams.query = vm.searchQuery;
        }

        // Need to update vm.canLoadMoreResults for the new search
        vm.canLoadMoreResults = true;

        SearchFactory.search(vm.searchQuery)
        .then(function(data) {
          // console.log("got data in search controller");
          vm.results = data.results;
          vm.totalResults = SearchFactory.searchResult.total_results;

          if (vm.results.length === 0) {
            vm.noResults = true;

            // Disable infinite scroll. Without this loadMore gets called again and again.
            vm.canLoadMoreResults = false;
          } else {
            vm.noResults = false;
          }

          // Update helper variable so that loadMore() will work normally
          vm.initialSearchCompleted = true;
          
          $ionicLoading.hide();
        }, function(error) {
          console.log("error in search ctrl");
          $ionicLoading.hide();
        });
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
      // @TODO: Remove?

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

    function BookCtrl($stateParams, SearchFactory, $ionicLoading) {
      var vm = this;

      vm.book = null;
      vm.busy = true;

      // List of local libraries in preferred order.
      // @TODO: Get from some global config
      var config = {
        libraries: {
          local: {code: 'UBO1030310', name: 'Realfagsbiblioteket'},
          satellites: [
            {code: 'UBO1030317', name: 'Informatikkbiblioteket'}
          ]
        }
      };
      vm.config = config;

      vm.toggleFavorite = toggleFavorite;

      activate();

      /////

      function activate() {
        $ionicLoading.show({
          template: '<ion-spinner></ion-spinner> Laster...'
        });

        SearchFactory.getBookDetails($stateParams.id, config)
        .then(function(data) {
          $ionicLoading.hide();
          vm.busy = false;

          // Did we have the book stored in favorites?
          // @TODO: Move to factory
          data.isFavorite = SearchFactory.isBookInFavorites(data.id);

          vm.books = [data];
        }, function(error) {
          $ionicLoading.hide();
          vm.busy = false;
          vm.error = error;
        });
      }

      function toggleFavorite(book) {
        // Update in localForage
        SearchFactory.toggleFavorite(book);
        // Update in view
        if (book.isFavorite) book.isFavorite = false;
        else book.isFavorite = true;
      }
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('BookCtrl', BookCtrl);

    // ------------------------------------------------------------------------

})();