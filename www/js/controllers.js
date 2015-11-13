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

    function SearchCtrl(SearchFactory, $cordovaBarcodeScanner) {
      var vm = this;

      vm.searchQuery = '';
      vm.results = {};
      vm.search = search;
      vm.scanBarcode = scanBarcode;

      /////

      function search() {
        if (!vm.searchQuery || 0 === vm.searchQuery.length) return;

        SearchFactory.search(vm.searchQuery)
        .then(function() {
          vm.results = SearchFactory.searchResults;
        });
      }

      function scanBarcode() {
        $cordovaBarcodeScanner
        .scan()
        .then(function(barcodeData) {
          console.log('success in scanBarcode:');
          console.log(barcodeData);
          vm.searchQuery = barcodeData.text;
          vm.search();
          alert('barcode scanned:' +  barcodeData.text);
        }, function(error) {
          console.log('error in scanBarcode: ' + error);
          alert('error in scanBarcode: ' + error);
        });
      }

    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('SearchCtrl', SearchCtrl);

    // ------------------------------------------------------------------------

    function BookCtrl($stateParams, SearchFactory) {
      var vm = this;

      vm.book = SearchFactory.getBook($stateParams.id);
      vm.toggleFavorite = toggleFavorite;

      /////

      if (vm.book!==null){
        // The book might be a favorite saved from earlier. If it is then set isFavorite to true
        vm.book.isFavorite = SearchFactory.isBookInFavorites(vm.book.id);
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