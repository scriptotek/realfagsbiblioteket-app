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

    function SearchCtrl(SearchFactory, $cordovaBarcodeScanner, $state, $stateParams, $ionicLoading) {
      var vm = this;

      // Variables
      vm.searchQuery = '';
      vm.results = [];
      vm.search = search;
      vm.showEbooks = true;
      // Helper variable to show/hide "no results" error message
      vm.noResults = false;
      // Functions
      vm.scanBarcode = scanBarcode;
      vm.clickResult = clickResult;

      activate();

      /////

      function activate() {
        vm.searchQuery = $stateParams.query;
        vm.search();
      }

      function search() {
        if (!vm.searchQuery || 0 === vm.searchQuery.length) return;
        
        $ionicLoading.show({
          template: '<ion-spinner></ion-spinner> Loading...'
        });

        // If the url is not currently set to this query, update it
        if (vm.searchQuery !== $stateParams.query) {
          // Update the url without reloading, so that the user can go back in history to this search.
          $state.go('app.search', {query: vm.searchQuery}, {notify: false});
          $stateParams.query = vm.searchQuery;
        }

        SearchFactory.search(vm.searchQuery)
        .then(function(data) {
          // console.log("got data in search controller");
          vm.results = data;

          if (vm.results.length===0) vm.noResults = true;
          else vm.noResults = false;
          
          $ionicLoading.hide();
        }, function(error) {
          console.log("error in search ctrl");
          $ionicLoading.hide();
        });
      }

      function scanBarcode() {
        $cordovaBarcodeScanner
        .scan()
        .then(function(barcodeData) {
          // console.log("success in scanBarcode:");
          // console.log(barcodeData);
          vm.searchQuery = barcodeData.text;
          vm.search();
        }, function(error) {
          console.log("error in scanBarcode");
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
      vm.toggleFavorite = toggleFavorite;

      activate();

      /////

      function activate() {
        $ionicLoading.show({
          template: '<ion-spinner></ion-spinner> Loading...'
        });

        SearchFactory.getBookDetails($stateParams.id)
        .then(function(data) {
          vm.book = data;
          // Did we have the book stored in favorites?
          vm.book.isFavorite = SearchFactory.isBookInFavorites(vm.book.id);

          $ionicLoading.hide();
        }, function(error) {
          console.log("error in activate bookctrl");
          $ionicLoading.hide();
        });
      }

      function toggleFavorite() {
        // Update in localForage
        SearchFactory.toggleFavorite(vm.book);
        // Update in view
        if (vm.book.isFavorite) vm.book.isFavorite = false;
        else vm.book.isFavorite = true;
      }
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('BookCtrl', BookCtrl);

    // ------------------------------------------------------------------------

})();