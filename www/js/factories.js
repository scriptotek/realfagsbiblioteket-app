// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http, $filter, $localForage, $q, $sce) {

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
        getBookDetails: getBookDetails,
        getBookLocation: getBookLocation,
        updateBookInFavorites: updateBookInFavorites
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

            var whichIcons = function(material) {
              // Figure out which icons should be shown for this search result

              var availableIcons = ["ebook", "book", "other"];
              var icons = [];
              angular.forEach(material, function(value, index, array) {
                // electronic
                if (value.indexOf("e-") != -1) {
                  if (icons.indexOf("ebook") === -1) icons.push("ebook");
                }
                // book
                else if (value.indexOf("print-books") != -1) {
                  if (icons.indexOf("book") === -1) icons.push("book");
                }
                // other
                else if (value.indexOf("books") === -1) {
                  if (icons.indexOf("other") === -1) icons.push("other");
                }
              });

              return icons;
            }

            // Decide which icon to use.
            book.icons = whichIcons(book.material);
            // console.log(book.material);
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

        // @TODO: Decide whether to remove this function. Not used as of 16.dec

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

        // @TODO: Decide whether to remove this function. Not used as of 16.dec

        if (factory.favorites.length){
          var found = $filter('filter')(factory.favorites, {id: id}, true);
          if (found.length) return true;
        }

        // The book was not found
        return false;
      }

      function updateBookInFavorites(book) {
        // Removes current version in favorites and replaces with new

        // remove old
        factory.favorites.splice(factory.favorites.indexOf(book),1);
        // add new
        factory.favorites.push(book);
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

      function processPrintAvailability(record, localLibrary) {
        // Adds a view-friendly 'record.print' object based on
        // data from 'record.components', for showing print availability.

        var printed = record.components.filter(function(x) {
          return x.category === 'Alma-P';
        });
        if (!printed.length) {
          return;
        }

        printed = printed[0];

        record.print = {};

        var localHoldings = printed.holdings.filter(function(holding) {
          return holding.library === localLibrary;
        });
        var otherHoldings = printed.holdings.filter(function(holding) {
          return holding.library !== localLibrary;
        });

        function isAvailable(holding) {
          return holding.status === 'available';
        }
        localAvailable = localHoldings.filter(isAvailable);
        otherAvailable = otherHoldings.filter(isAvailable);

        if (localAvailable.length){
          // There's available holdings at our local library

          // Let's just pick the first one for now.
          // @TODO: Rather than just showing the first one, we
          //        should prioritize open stack collections over closed stack!
          record.print = localAvailable[0];

        } else if (otherAvailable.length) {
          // No available holdings at our local library, but somewhere else

          // Let's just pick the first one for now.
          // @TODO: We should sort availability based on distance from local library.
          //        See <https://github.com/scriptotek/scs/issues/8>
          record.print = otherAvailable[0];

        } else if (localHoldings.length){
          // No available holdings, but local non-available holdings
          record.print.available = 0;

          // Let's just pick the first one for now.
          // @TODO: Rather than just showing the first one, we
          //        should prioritize open stack collections over closed stack!
          record.print = localHoldings[0];

        } else if (otherHoldings.length) {
          // No local holdings, holdings elsewhere, but not available
          record.print.available = 0;

          // Let's just pick the first one for now.
          // @TODO: Rather than just showing the first one, we
          //        should prioritize open stack collections over closed stack!
          record.print = otherHoldings[0];

        }

        record.print.available = record.print.status !== undefined && record.print.status.toLowerCase() == 'available';
      }

      function processElectronicAvailability(record) {
        // Adds a view-friendly 'record.electronic' object based on
        // data from 'record.components', for showing electronic availability.
        var electronic = record.components.filter(function(component) {
          return component.category !== undefined && component.category !== 'Alma-P';
        });
        if (!electronic.length) {
          return;
        }

        // @TODO: Pick first or…?
        record.electronic = electronic[0];

        // Trust for use in iframe
        if (record.urls.length) {
          record.urls[0].url = $sce.trustAsResourceUrl(record.urls[0].url);
        }
      }

      function getBookDetails(id, localLibrary) {
        // Find details for the book(s) with given id

        // We'll return a promise, which will resolve with a book if found, or with an error if not.
        var deferred = $q.defer();

        $http.get('https://scs.biblionaut.net/primo/records/' + id)
        .then(function(data) {
          book = data.data.result;

          // Add display-friendly variables for displaying availability
          processPrintAvailability(book, localLibrary);
          processElectronicAvailability(book);

          // Create display-friendly authors-variable
          book.authors = book.creators.join(", ");

          // Since the book may have been updated in the backend since the last load, update the book in localForage.favorites if it's a favorite
          if (isBookInFavorites(book.id)) updateBookInFavorites(book);

          // Get location
          if (book.print && book.print.library == localLibrary) {
            factory.getBookLocation(book)
            .then(function(book) {
              // We got a book location
              deferred.resolve(book);
            }, function(error) {
              // We didn't get book location, but resolve promise anyway.
              deferred.resolve(book);
            });
          }else{
            // Resolve without location information
            deferred.resolve(book);
          }
        }, function(response) {
          console.log("error in getBookDetails factory");
          if (response.data && response.data.error) {
            deferred.reject(response.data.error);
          } else {
            deferred.reject(data.data.statustext);
          }
        });

        return deferred.promise;
      }

      function getBookLocation(book) {
        // Find the physical location of the given book, add the results to the book, then return the book

        var deferred = $q.defer();

        $http.get('http://app.uio.no/ub/bdi/bibsearch/loc2.php', {
          params: {
            collection: book.print.collection_code,
            callnumber: book.print.callcode
          }
        }).then(function(data) {
          // Here I expect a return like "bottom  2". I need the number
          data = data.data.split("\t");

          // data[1] is either 1, 2, or undefined. Set floor_text:
          if (data[1]=="1") book.print.floor_text = "1st mezzanine";
          else if (data[1]=="2") book.print.floor_text = "2nd floor / Hangar";
          else book.print.floor_text = "";

          // If we have a floor_text, we can store map_position and map_url_image
          if (book.print.floor_text!=="") {
            book.print.map_position = data[0];
            book.print.map_url_image = "http://app.uio.no/ub/bdi/bibsearch/new.php?collection="+book.print.collection_code+"&callnumber="+book.print.callcode;
          }else{
            book.print.map_position = "";
            book.print.map_url_image = "";
          }

          deferred.resolve(book);
        }, function(error) {
          // console.log("error in factory.getBookLocation")
          deferred.reject(error);
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