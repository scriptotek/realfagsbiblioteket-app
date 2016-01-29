// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http, $filter, $localForage, $q, $sce, $ionicPopup) {

      var searchResult = {}; // Datastructure like:
      /*
      {
        source: url for search,
        first: number search starts at,
        next: next search should start here, to retrieve more results,
        total_results: total available for this search,
        results: array of the actual books
      }
      */

      var platform = ionic.Platform.platform();
      var deviceInfo = ionic.Platform.device();
      var appVersion = '';

      if (navigator.appInfo !== undefined) {
        navigator.appInfo.getAppInfo(function(appInfo) {
          appVersion = appInfo.version;
        }, function(err) {
            console.log(err);
        });
      }

      var favorites = [];

      var factory = {
        search: search,
        lookUpGroup: lookUpGroup,
        searchResult: searchResult,
        favorites: favorites,
        loadFavorites: loadFavorites,
        toggleFavorite: toggleFavorite,
        isBookInFavorites: isBookInFavorites,
        getBookDetails: getBookDetails,
        getBookLocation: getBookLocation,
        updateBookInFavorites: updateBookInFavorites,
        checkInternetConnection: checkInternetConnection
      };

      return factory;

      /////

      function checkInternetConnection() {
        // Give the user a warning if we can't see an internet connection
        if(window.Connection) {
          if(navigator.connection.type == Connection.NONE) {
            $ionicPopup.confirm({
              title: "Ingen internettilgang",
              content: "Denne appen krever en aktiv internett-tilkobling for å fungere."
            })
            .then(function(result) {
              if(!result) {
                ionic.Platform.exitApp();
              }
            });
          }
        }
      }

      function search(query, start) {
        // Fetch records from API for the given query

        // Set default value for start
        start = typeof start !== 'undefined' ? start : 1;

        var deferred = $q.defer();

        $http({
          url: 'http://app.uio.no/ub/bdi/realfagsbiblioteket/search.php',
          method: 'GET',
          cache: true,
          params: {
            platform: platform,
            platform_version: deviceInfo.version,
            app_version: appVersion,
            device: deviceInfo.manufacturer + ' ' + deviceInfo.model,
            query: query,
            start: start
          }
        }).then(function(data) {

          var newResult = data.data;

          // Do some preprocessing for each book
          angular.forEach(newResult.results, function(book) {
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
          });

          // New search?
          if (start === 1) {
            factory.searchResult = newResult;
          } else {
            // Need to concat newResults and update variables
            factory.searchResult.results = factory.searchResult.results.concat(newResult.results);
            factory.searchResult.first = newResult.first;
            factory.searchResult.next = newResult.next;
          }

          // Resolve the promise. This will send the (new) search results to the success function in the controller
          deferred.resolve(newResult);

        }, function(error) {
          console.log('error in search factory');
          checkInternetConnection();
          deferred.reject(error);
        });

        return deferred.promise;
      }

      function lookUpGroup(id) {
        // @TODO: Remove? If not, update to use new factory.searchResult structure.

        // Fetch group records from API for the given id

        factory.searchResults = [];
        var deferred = $q.defer();

        // @TODO: Remove hard dependency on *.biblionaut.net by using `links.group` URL from search result
        $http({
          url: 'https://lsm.biblionaut.net/primo/groups/' + id,
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
          checkInternetConnection();
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

      function processPrintAvailability(record, localLibrary) {
        // Adds a view-friendly 'record.print' object based on
        // data from 'record.components', for showing print availability.

        var localHoldings = [],
          otherHoldings = [];

        record.components.forEach(function(component) {
          if (component.holdings) {
            component.holdings.forEach(function(holding) {
              if (holding.library === localLibrary) {
                localHoldings.push(holding);
              } else {
                otherHoldings.push(holding);
              }
            });
          }
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
        if (record.urls && record.urls.length) {
          // Trust for use in iframe
          // @TODO: Do we ever need more than the first URL?
          record.urls[0].url = $sce.trustAsResourceUrl(record.urls[0].url);
        }
      }

      function getBookDetails(id, localLibrary) {
        // Find details for the book(s) with given id

        // We'll return a promise, which will resolve with a book if found, or with an error if not.
        var deferred = $q.defer();

        // @TODO: Remove hard dependency on *.biblionaut.net by using `links.self` URL from search result
        $http.get('https://lsm.biblionaut.net/primo/records/' + id)
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
          checkInternetConnection();
          if (response.data && response.data.error) {
            deferred.reject(response.data.error);
          } else {
            deferred.reject(response.statusText);
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