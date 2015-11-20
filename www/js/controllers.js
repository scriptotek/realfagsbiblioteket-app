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

    function SearchCtrl(SearchFactory, $cordovaBarcodeScanner, $state) {
      var vm = this;

      vm.searchQuery = '';
      vm.results = {};
      vm.search = search;
      vm.scanBarcode = scanBarcode;
      vm.showEbooks = true;
      vm.clickResult = clickResult;

      /////

      function search() {
        if (!vm.searchQuery || 0 === vm.searchQuery.length) return;

        SearchFactory.search(vm.searchQuery)
        .then(function success(data) {
          // console.log("got data in controller");
          vm.results = data;
        }, function error(error) {
          console.log("error in search ctrl");
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
          console.log("multiple");
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

    function BookCtrl($stateParams, SearchFactory) {
      var vm = this;

      vm.book = null;
      vm.toggleFavorite = toggleFavorite;

      activate();

      /////

      function activate() {
        SearchFactory.getBookDetails($stateParams.id)
        .then(function(data) {
          vm.book = data;
          // Did we have the book stored in favorites?
          vm.book.isFavorite = SearchFactory.isBookInFavorites(vm.book.id);
        }, function(error) {
          console.log("error in activate bookctrl");
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