// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http, $filter, $localForage) {

      var searchResults = [];
      var favorites = [];

      var factory = {
        search: search,
        searchResults: searchResults,
        favorites: favorites,
        getBook: getBook,
        loadFavorites: loadFavorites,
        toggleFavorite: toggleFavorite,
        isBookInFavorites: isBookInFavorites
      };

      return factory;

      /////

      function search(query, ebook, start, appversion) {
        // Fetches results from the API given the parameters.

        // return $http({
        //   url: 'http://linode.biblionaut.net/app/',
        //   method: 'GET',
        //   params: {
        //     query: query,
        //     ebook: ebook,
        //     start: start,
        //     appversion: appversion
        //   }
        // }).success(function(data) {
        //   factory.searchResults = data.result.documents;
        // }).error(function(err) {
        //   console.log('error in search: ' + err);
        //   factory.searchResults = [];
        // });

        // fetch test data - REMOVE ME
        return $http({
          url: 'testdata.json',
          method: 'GET'
        }).success(function(data) {
          factory.searchResults = data.result.documents;

          angular.forEach(factory.searchResults, function(book) {
            // Create a display-friendly authors-variable
            book.authors = book.creators.map(function (creator) {
              return creator.presentableName;
            }).join(", ");
            // Create a display-friendly format variable
            if (book.material=="book_electronic") book.format = "Electronic book";
            else if (book.material=="journal_electronic") book.format = "Electronic journal";
            else if (book.material=="electronic") book.format = "Electronic resource";
            else book.format = "Printed";
          });
        }).error(function(err) {
          console.log('error in search: ' + err);
          factory.searchResults = [];
        });
      }

      function loadFavorites() {
        // Load stored favorites from localForage.

        return $localForage.getItem('favorites')
        .then(function(data) {
          if (data) factory.favorites = data;
        }, function() {
          console.log('error in loadFavorites');
        });
      }

      function toggleFavorite(book) {
        // Add book if not already favorite, remove if already favorite.

        if (book.isFavorite) {
          // remove book from here
          factory.favorites.splice(factory.favorites.indexOf(book),1);
        }else{
          // add book
          factory.favorites.push(book);
        }
        // update storage
        $localForage.setItem('favorites', factory.favorites);
      }

      function getBook(id) {
        // Find and return the book with the given id, either from searchResults or from stored favorites.

        // Is the book in searchResults?
        var found;
        if (factory.searchResults.length) {
          found = $filter('filter')(factory.searchResults, {id: id}, true);
          if (found.length) {
             return found[0];
          }
        }
        // Is the book in favorites?
        if (factory.favorites.length){
          found = $filter('filter')(factory.favorites, {id: id}, true);
          if (found.length) {
             return found[0];
          }
        }

        // The book was not found
        return null;
      }

      function isBookInFavorites(id) {
        // Determine whether the bookId is a book we can find in the stored favorites.

        if (factory.favorites.length){
          var found = $filter('filter')(factory.favorites, {id: id}, true);
          if (found.length) return true;
        }

        // The book was not found
        return false;
      }

    }

    // add it to our factories module
    angular
      .module('factories')
      .factory('SearchFactory', SearchFactory);

    // ------------------------------------------------------------------------

})();