// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http, $filter, $localForage, $q) {

      var searchResults = [];
      var favorites = [];

      var factory = {
        search: search,
        lookUpGroup: lookUpGroup,
        searchResults: searchResults,
        favorites: favorites,
        getBook: getBook,
        loadFavorites: loadFavorites,
        toggleFavorite: toggleFavorite,
        isBookInFavorites: isBookInFavorites,
        getBookFromFavorites: getBookFromFavorites,
        getBookDetails: getBookDetails
      };

      return factory;

      /////

      function search(query) {
        // Fetch records from API for the given query

        factory.searchResults = [];
        var deferred = $q.defer();

        $http({
          url: 'https://scs.biblionaut.net/primo/search',
          method: 'GET',
          cache: true,
          params: {
            query: query,
            // library: "ubo1030310"
            institution: "UBO"
          }
        }).then(function(data) {

          factory.searchResults = data.data.results;

          angular.forEach(factory.searchResults, function(book) {
            // Create a display-friendly authors-variable
            book.authors = book.creators.join(", ");

            // Create a display-friendly format variable
            // if (book.material=="book_electronic") book.format = "Electronic book";
            // else if (book.material=="journal_electronic") book.format = "Electronic journal";
            // else if (book.material=="electronic") book.format = "Electronic resource";
            // else book.format = "Printed";
          });

          // Resolve the promise. This will send the search results to the success function in the controller
          deferred.resolve(factory.searchResults);

        }, function(error) {
          console.log('error in search factory');
          deferred.reject(error);
        });

        return deferred.promise;
      }

      function lookUpGroup(id) {
        // Fetch group records from API for the given id

        factory.searchResults = [];
        var deferred = $q.defer();

        $http({
          url: 'https://scs.biblionaut.net/primo/groups/' + id,
          method: 'GET',
          cache: true,
        }).then(function(data) {

          factory.searchResults = data.data.result.records;

          angular.forEach(factory.searchResults, function(book) {
            // Create a display-friendly authors-variable
            book.authors = book.creators.join(", ");

            // Create a display-friendly format variable
            // if (book.material=="book_electronic") book.format = "Electronic book";
            // else if (book.material=="journal_electronic") book.format = "Electronic journal";
            // else if (book.material=="electronic") book.format = "Electronic resource";
            // else book.format = "Printed";
          });

          // Resolve the promise. This will send the search results to the success function in the controller
          deferred.resolve(factory.searchResults);

        }, function(error) {
          console.log('error in search factory');
          deferred.reject(error);
        });

        return deferred.promise;
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

        var found;
        var book = null;

        // Is the book stored in favorites?
        if (factory.favorites.length){
          found = $filter('filter')(factory.favorites, {id: id}, true);
          if (found.length) {
             book = found[0];
             console.log("Found the book in favorites!");
          }
        }
        // If not, is the book in searchResults?
        if (book===null && factory.searchResults.length) {
          found = $filter('filter')(factory.searchResults, {id: id}, true);
          if (found.length) {
             book = found[0];
             console.log("Found the book in searchResults!");
          }
        }

        if (book===null) {
          console.log("Could not find the book");
          book = {};
        }

        return book;
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

      function getBookFromFavorites(id) {
        // Return book of given id if found in favorites

        var deferred = $q.defer();

        if (factory.favorites.length){
          var found = $filter('filter')(factory.favorites, {id: id}, true);
          if (found.length){
            deferred.resolve(found[0]);
          }else{
            deferred.reject("Book not in favorites.");
          }
        }else{
          deferred.reject("Book not in favorites.");
        }

        // The book was not found
        return deferred.promise;
      }

      function getBookDetails(id) {
        // Find details for the book(s) with given id

        // We'll return a promise, which will resolve with a book if found, or with an error if not.
        var deferred = $q.defer();

        // Do we already have the book stored in favorites?
        factory.getBookFromFavorites(id)
        .then(function(data) {
          // We found the book in favorites. This means we already have detailed information on this book
          deferred.resolve(data);
        }, function(error) {
          // We have to get information on this book

          $http.get('https://scs.biblionaut.net/primo/records/' + id)
          .then(function(data) {
            book = data.data.result;

            // Decide which book.avaiability-record to use, as the book might exist in several locations with different availability statuses. This is the priority list of which record we choose:
            // 1. Exists at Realfagsbiblioteket and is available
            // 2. Exists elsewhere and is available
            // 3. Exists at Realfagsbiblioteket
            
            // If none of these 3 options are applicable, the book is simply not available.

            var bookLocations;

            // 1)
            bookLocations = $filter('filter')(book.availability, function(value, index, array) {
              return value.libraryCode === "1030310" && value.status === "available";
            })
            // Select the first for now
            if (bookLocations.length>0){
              book.availability = bookLocations[0];
              book.available = true;
            }

            // 2)
            if (bookLocations.length==0) {
              bookLocations = $filter('filter')(book.availability, function(value, index, array) {
                return value.status === "available";
              })
              if (bookLocations.length>0){
                book.availability = bookLocations[0];
                book.available = true;
              }
            }

            // 3)
            if (bookLocations.length==0) {
              bookLocations = $filter('filter')(book.availability, function(value, index, array) {
                return value.libraryCode === "1030310";
              })
              if (bookLocations.length>0){
                book.availability = bookLocations[0];
                book.available = false;
              }
            }

            // else)
            if (bookLocations.length==0) {
              book.available = false;
              book.availability = [];
            }

            // Create display-friendly authors-variable
            book.authors = book.creators.join(", ");

            // TO DO
            // - Figure out itemAvailable info
            // - Figure out cover
            // - Figure out location in map (physical location in the library)

            // Resolve the promise. This will send the search results to the success function in the controller
            deferred.resolve(book);
          }, function(error) {
            console.log("error in getBookDetails factory");
            deferred.reject(error);
          });

        });

        return deferred.promise;
      }

    }

    // add it to our factories module
    angular
      .module('factories')
      .factory('SearchFactory', SearchFactory);

    // ------------------------------------------------------------------------

})();