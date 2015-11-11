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

    function FavoritesCtrl() {
      var vm = this;

      vm.books = [
        { title: 'Favoritt 1', id: 1 },
        { title: 'Favoritt 2', id: 2 },
        { title: 'Favoritt 3', id: 3 },
        { title: 'Favoritt 4', id: 4 }
      ];

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

        // console.log('Query: ' + query);

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

      // I want this to run only after loading of favorites is done................................
      vm.book = SearchFactory.getBook($stateParams.id);

      if (vm.book!==null){
        // The book might be a favorite saved from earlier. If it is then set isFavorite to true
        vm.book.isFavorite = SearchFactory.isBookInFavorites(vm.book.id);
      }


      vm.toggleFavorite = function() {
        console.log('toggle favorite. isFavorite='+vm.book.isFavorite);
        SearchFactory.toggleFavorite(vm.book);
        if (vm.book.isFavorite===true) vm.book.isFavorite = false;
        else vm.book.isFavorite = true;
      };
    }

    // add it to our controllers module
    angular
      .module('controllers')
      .controller('BookCtrl', BookCtrl);

    // ------------------------------------------------------------------------

})();