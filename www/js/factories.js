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
        isBookInFavorites: isBookInFavorites,
        addCallnumberAndCollection: addCallnumberAndCollection,
        addLocation: addLocation
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

        var found;
        var book = null;

        // Is the book stored in favorites?
        if (factory.favorites.length){
          found = $filter('filter')(factory.favorites, {id: id}, true);
          if (found.length) {
             book = found[0];
          }
        }
        // Is the book in searchResults?
        if (book===null && factory.searchResults.length) {
          found = $filter('filter')(factory.searchResults, {id: id}, true);
          if (found.length) {
             book = found[0];
          }
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

      function addCallnumberAndCollection(id) {
        // Find and add callnumber (if any) to book of given id

        var book = factory.getBook(id);

        return $http.get('https://ask.bibsys.no/ask2/json/items.jsp?callback=JSON_CALLBACK', {
          params: {
            objectid: id
          }
        })
        .success(function(data) {
          data = data.result.documents;
          
          // Filter because we're interested in institutionsection="UREAL" and that it has a callnumber
          data = $filter('filter')(data, function(obj, index, array) {
            return (obj.institutionsection === "UREAL" && obj.callnumber !== "");
          }, true);
          
          // Have we found anything with a callnumber?
          if (data.length) {
            // If so, add this callnumber to the book
            book.callnumber = data[0].callnumber;
            book.collection = data[0].collection;
          }else{
            // If so, add an empty string value so that we don't do the search again for the same book
            book.callnumber = "";
            book.collection = "";
          }

        }).error(function(err) {
          console.log('error in addCallnumberAndCollection: ' + err);
        });

      }

      function addLocation(id) {
        // Find and add loation (if any) to book of given id

        var book = factory.getBook(id);

        return $http.get('http://app.uio.no/ub/bdi/bibsearch/loc.php', {
          params: {
            collection: book.collection,
            callnumber: book.callnumber
          }
        })
        .success(function(data) {
          // Here I expect a return like "bottom  2". I need the number
          data = data.split("\t");

          // data[1] is either 1, 2, or undefined. Set floortext:
          if (data[1]=="1") book.floorText = "1st mezzanine";
          else if (data[1]=="2") book.floorText = "2nd floor / Hangar";
          else book.floorText = "";

          // If we have a floorText, we can store mapPosition and mapUrlImage
          if (book.floorText!=="") {
            book.mapPosition = data[0];
            book.mapUrlImage = "http://app.uio.no/ub/bdi/bibsearch/?collection="+book.collection+"&callnumber="+book.callnumber;
          }else{
            book.mapPosition = "";
            book.mapUrlImage = "";
          }

        }).error(function(err) {
          console.log('error in addLocation: ' + err);
        });

      }

    }

    // add it to our factories module
    angular
      .module('factories')
      .factory('SearchFactory', SearchFactory);

    // ------------------------------------------------------------------------

})();