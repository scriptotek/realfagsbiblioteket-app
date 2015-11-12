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

      // NOTE: duplicate code in favorites.html and in search.html
      // you must make a new template or something.
      vm.results = SearchFactory.favorites;

    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('FavoritesCtrl', FavoritesCtrl);

    // ------------------------------------------------------------------------

    function SearchCtrl(SearchFactory) {
      var vm = this;

      vm.searchQuery = '';
      vm.results = {};
      vm.search = search;

      /////

      function search() {

        var query = vm.searchQuery;

        if (!query || 0 === query.length) return;
          
        SearchFactory.search(query)
        .then(function() {
          vm.results = SearchFactory.searchResults;
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

      if (vm.book!==null){
        // The book might be a favorite saved from earlier. If it is then set isFavorite to true
        vm.book.isFavorite = SearchFactory.isBookInFavorites(vm.book.id);

        console.log(vm.book);
      }

      vm.toggleFavorite = function() {
        // Update in localForage
        SearchFactory.toggleFavorite(vm.book);
        // Update in view
        if (vm.book.isFavorite) vm.book.isFavorite = false;
        else vm.book.isFavorite = true;
      };
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('BookCtrl', BookCtrl);

    // ------------------------------------------------------------------------

})();