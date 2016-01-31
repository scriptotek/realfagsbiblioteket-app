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

      function getBestHolding(holdings, config) {
        var localLibrary = config.libraries.local.code;
        var satelliteLibraries = _.map(config.libraries.satellites, 'code');

        var available = _.filter(holdings, {status: 'available'});
        var sel = [];

        if (!holdings.length) {
          return;
        }

        // 1.1 Available at local library
        sel = _.filter(available, {library: localLibrary});
        if (sel.length) {
          // @TODO: Rather than just returning the first one, we
          //        should prioritize open stack collections over closed stack.
          sel[0].statusMessage = 'På hylla i ' + config.libraries.local.name;
          sel[0].statusCode = 'available_local';
          return sel[0];
        }

        // 1.2 Available at satellite library
        sel = _.filter(available, function(x) { return satelliteLibraries.indexOf(x.library) != -1; });
        if (sel.length) {
          sel[0].statusMessage = 'På hylla i ' + _.find(config.libraries.satellites, {code: sel[0].library}).name;
          sel[0].statusCode = 'available';
          return sel[0];
        }

        // 1.3 Available at other UBO library
        sel = _.find(available, {alma_instance: '47BIBSYS_UBO'});
        if (sel) {
          sel.statusMessage = 'På hylla i et annet UiO-bibliotek';
          sel.statusCode = 'available';
          return sel;
        }

        // 2.1 At local library, but not available
        sel = _.find(holdings, {library: localLibrary});
        if (sel) {
          sel.statusMessage = 'Utlånt fra ' + config.libraries.local.name;
          sel.statusCode = 'request_needed';
          return sel;
        }

        // 2.2 At satellite library, but not available
        sel = _.find(holdings, function(x) { return satelliteLibraries.indexOf(x.library) != -1; });
        if (sel) {
          sel.statusMessage = 'Utlånt fra ' + _.find(config.libraries.satellites, {code: sel.library}).name;
          sel.statusCode = 'request_needed';
          return sel;
        }

        // 2.3 At other UBO library, but not available
        sel = _.find(holdings, {alma_instance: '47BIBSYS_UBO'});
        if (sel) {
          sel.statusMessage = 'Utlånt fra et annet UiO-bibliotek';
          sel.statusCode = 'request_needed';
          return sel;
        }

        // 3 Whatever
        holdings[0].statusMessage = 'Ikke tilgjengelig ved UiO';
        holdings[0].statusCode = 'request_needed';
        return holdings[0];
      }

      function processPrintAvailability(record, config) {
        // Adds a view-friendly 'record.print' object based on
        // data from 'record.components', for showing print availability.


        // Make a flat list of holdings
        var holdings = _.filter(_.flatten(_.map(record.components, 'holdings')), 'library');

        record.print = getBestHolding(holdings, config);

        if (record.print) {
          record.print.available = record.print.statusCode == 'available' || record.print.statusCode == 'available_local';
        }
      }

      function processElectronicAvailability(record) {
        if (record.urls && record.urls.length) {
          // Trust for use in iframe
          // @TODO: Do we ever need more than the first URL?
          record.urls[0].url = $sce.trustAsResourceUrl(record.urls[0].url);
        }
      }

      function cacheBookCover(url) {
        var promiseResolved = false;
        var deferred = $q.defer();

        function resolve() {
          if (!promiseResolved) {
            promiseResolved = true;
            deferred.resolve();
          }
        }

        // Don't wait more than a second
        setTimeout(function() {
          resolve();
        }, 1000);

        var img = new Image();
        img.src = url;
        img.onload = function(q) {
          // @TODO: We could test if we actually got a valid data, and
          // mark the cover as valid/invalid, see <http://stackoverflow.com/a/9809055/489916>
          resolve();
        };
        img.onerror = function(q) {
          resolve();
        };
        return deferred.promise;
      }

      function getBookDetails(id, config) {
        // Find details for the book(s) with given id

        // We'll return a promise, which will resolve with a book if found, or with an error if not.
        var deferred = $q.defer();

        // @TODO: Remove hard dependency on *.biblionaut.net by using `links.self` URL from search result
        $http.get('https://lsm.biblionaut.net/primo/records/' + id)
        .then(function(data) {
          book = data.data.result;

          // Add display-friendly variables for displaying availability
          processPrintAvailability(book, config);
          processElectronicAvailability(book);

          // Create display-friendly authors-variable
          book.authors = book.creators.join(", ");

          // Since the book may have been updated in the backend since the last load, update the book in localForage.favorites if it's a favorite
          if (isBookInFavorites(book.id)) updateBookInFavorites(book);

          cacheBookCover(book.links.cover).then(function() {
            // Get location
            if (book.print && book.print.library == config.libraries.local.code) {
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
          });

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