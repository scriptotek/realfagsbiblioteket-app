// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http, $filter, $q, $sce, $ionicPopup, FavoriteFactory) {

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

      var factory = {
        search: search,
        lookUpGroup: lookUpGroup,
        searchResult: searchResult,
        getBookDetails: getBookDetails,
        addHoldingLocation: addHoldingLocation,
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

      function search(query, start, sort) {
        // Fetch records from API for the given query

        // Set default value for start
        start = typeof start !== 'undefined' ? start : 1;
        // Set default value for sortBy
        sort = typeof sort !== 'undefined' ? sort : "date";

        var deferred = $q.defer();

        $http({
          url: 'https://bibapp.biblionaut.net/search.php',
          method: 'GET',
          cache: true,
          params: {
            platform: platform,
            platform_version: deviceInfo.version,
            app_version: appVersion,
            device: deviceInfo.manufacturer + ' ' + deviceInfo.model,
            query: query,
            start: start,
            sort: sort
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
            };

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

      function getBestHoldings(holdings, config) {
        var localLibrary = config.libraries.local.code;
        var satelliteLibraries = _.map(config.libraries.satellites, 'code');

        var partitioned = _.partition(holdings, {status: 'available'});
        var available = partitioned[0];
        var unavailable = partitioned[1];
        var sel = [];
        var out = [];
        var avaCount = 0;

        if (!holdings.length) {
          return out;
        }
        // console.log(holdings);

        // 1.1 Available at local library
        sel = _.filter(available, {library: localLibrary});
        if (sel.length) {

          // - Open collections are preferred over closed ones
          // - 'UREAL Pensum' is less preferred than other open collections
          var oc = config.libraries.local.openStackCollections;
          sel.sort(function(a, b) {
            return oc.indexOf(b.collection_code) - oc.indexOf(a.collection_code);
          });

          sel[0].closed_stack = (oc.indexOf(sel[0].collection_code) == -1);
          sel[0].statusMessage = 'På hylla i ' + config.libraries.local.name;
          sel[0].available = true;

          out.push(sel[0]);
          avaCount += 1;
        } else {

          // 1.2 At local library, but not available
          if (!avaCount) {
            sel = _.find(unavailable, {library: localLibrary});
            if (sel) {
              sel.statusMessage = 'Utlånt fra ' + config.libraries.local.name;
              sel.available = false;
              out.push(sel);
            }
          }
        }

        // 2.1 Available at satellite library
        sel = _.filter(available, function(x) { return satelliteLibraries.indexOf(x.library) != -1; });
        if (sel.length) {
          sel[0].statusMessage = 'På hylla i ' + _.find(config.libraries.satellites, {code: sel[0].library}).name;
          sel[0].available = true;
          out.push(sel[0]);
          avaCount += 1;
        } else {

          // 2.2 At satellite library, but not available
          sel = _.find(unavailable, function(x) { return satelliteLibraries.indexOf(x.library) != -1; });
          if (sel) {
            sel.statusMessage = 'Utlånt fra ' + _.find(config.libraries.satellites, {code: sel.library}).name;
            sel.available = false;
            out.push(sel);
          }
        }

        // 3.1 Available at other UBO library
        if (!avaCount) {
          sel = _.find(available, {alma_instance: '47BIBSYS_UBO'});
          if (sel) {
            sel.statusMessage = 'På hylla i et annet UiO-bibliotek';
            sel.available = true;
            sel.lib_label = sel.library;
            out.push(sel);
          }
        } else {

          // 3.2 At other UBO library, but not available
          if (!out.length) {
            sel = _.find(unavailable, {alma_instance: '47BIBSYS_UBO'});
            if (sel) {
              sel.statusMessage = 'Utlånt fra et annet UiO-bibliotek';
              sel.available = false;
              out.push(sel);
            }
          }
        }

        // 4 Whatever
        if (!out.length) {
          holdings[0].statusMessage = 'Ikke tilgjengelig ved UiO';
          holdings[0].available = false;
          out.push(holdings[0]);
        }

        return out;
      }

      function processPrintAvailability(record, config) {
        // Adds a view-friendly 'record.print' object based on
        // data from 'record.components', for showing print availability.


        // Make a flat list of holdings
        var holdings = _.filter(_.flatten(_.map(record.components, 'holdings')), 'library');

        record.holdings = getBestHoldings(holdings, config);
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
          FavoriteFactory.get(book.id).then(function(res) {
            if (res) FavoriteFactory.put(book.id, book);
          });

          cacheBookCover(book.links.cover).then(function() {
            // Get location
            if (book.holdings.length && book.holdings[0].available && book.holdings[0].library == config.libraries.local.code) {
              factory.addHoldingLocation(book.holdings[0])
              .then(function() {
                // We got a holding location
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

      function addHoldingLocation(holding) {
        // Find the physical location of the given holding and add the results to the holding

        var deferred = $q.defer();

        $http.get('https://app.uio.no/ub/bdi/bibsearch/loc2.php', {
          params: {
            collection: holding.collection_code,
            callnumber: holding.callcode
          }
        }).then(function(data) {
          // Here I expect a return like "bottom  2". I need the number
          data = data.data.split("\t");

          // data[1] is either 1, 2, or undefined. Set floor_text:
          if (data[1]=="1") holding.floor_text = "1. messanin";
          else if (data[1]=="2") holding.floor_text = "Hangaren (2. etasje)";
          else holding.floor_text = "";

          // If we have a floor_text, we can store map_position and map_url_image
          if (holding.floor_text!=="") {
            holding.map_position = data[0];
            holding.map_url_image = encodeURI("https://app.uio.no/ub/bdi/bibsearch/new.php?collection=" + holding.collection_code + "&callnumber=" + holding.callcode);
          }else{
            holding.map_position = "";
            holding.map_url_image = "";
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

    function XisbnFactory($http, $q) {

      var factory = {
        getMetadata: getMetadata
      };

      return factory;

      /////

      function getMetadata(isbn) {

        var deferred = $q.defer();

        $http.get('http://xisbn.worldcat.org/webservices/xid/isbn/' + isbn + '?method=getMetadata&format=json&fl=*')
        .then(function(response) {
          deferred.resolve(response.data);
        }, function(response) {
          console.log("error in XisbnFactory.getMetadata");
          // checkInternetConnection();
          if (response.data && response.data.error) {
            deferred.reject(response.data.error);
          } else {
            deferred.reject(response.statusText);
          }
        });

        return deferred.promise;
      }
    }

    // add it to our factories module
    angular
      .module('factories')
      .factory('XisbnFactory', XisbnFactory);

    // ------------------------------------------------------------------------

    function FavoriteFactory($q, $timeout, $cordovaSQLite) {

      var db;
      var dbReady = false;

      var factory = {
        init: init,  // Initialize the connection, create tables if necessary
        get: get,    // Get a single row by mms_id
        put: put,    // Upsert a single row
        rm: rm,      // Delete a single row
        ls: ls       // Get all rows
      };

      return factory;

      /////

      /**
       * Be careful to not call this before deviceReady / $ionicPlatform.ready
       * to avoid a race condition.
       */
      function init() {
        if (!ionic.Platform.isWebView()) return;  // Not on a device

        db = $cordovaSQLite.openDB({ name: 'realfagsbiblioteket.db' });

        // Queries are queued
        $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY, mms_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, data BLOB)');
        $cordovaSQLite.execute(db, 'CREATE UNIQUE INDEX IF NOT EXISTS mms_id_idx ON favorites (mms_id)').then(function(res) {
          dbReady = true;
        }, function(err) {
          console.error('Query failed:', err);
        });
      }

      function query(queryStr, args) {
        var deferred = $q.defer();

        $cordovaSQLite.execute(db, queryStr, args).then(function(res) {
          deferred.resolve(res);
        }, function(err) {
          console.error('error in FavoriteFactory.query', err);
          deferred.reject();
        });

        return deferred.promise;
      }

      function get(mmsId) {
        var deferred = $q.defer();

        if (!ionic.Platform.isWebView()) {
          // Not on a device. Use SessionStorage for testing
          $timeout(function() {
            var q = sessionStorage.getItem(mmsId);
            if (q) q = {
              data: JSON.parse(sessionStorage.getItem(mmsId)),
              created_at: null
            };
            deferred.resolve(q);
          });
          return deferred.promise;
        }

        query('SELECT data, created_at FROM favorites WHERE mms_id=?', [mmsId]).then(function(res) {
          if (res.rows.length === 0) {
            return deferred.resolve(null);
          }
          deferred.resolve({
            data: JSON.parse(res.rows.item(0).data),
            created_at: res.rows.item(0).created_at
          });
        }, function(err) {
          deferred.reject();
        });

        return deferred.promise;
      }

      function ls() {
        var deferred = $q.defer();

        if (!ionic.Platform.isWebView()) {
          // Not on a device. Use SessionStorage for testing
          $timeout(function() {
            var rows = [];
            for (var i = 0; i < sessionStorage.length; i++){
                rows.push({
                  data: JSON.parse(sessionStorage.getItem(sessionStorage.key(i))),
                  created_at: null
                });
            }
            deferred.resolve(rows);
          });
          return deferred.promise;
        }

        query('SELECT data, created_at FROM favorites', []).then(function(res) {
          var rows = [];
          for (var i = 0; i < res.rows.length; i++) {
            rows.push({
              data: JSON.parse(res.rows.item(i).data),
              created_at: res.rows.item(i).created_at
            });
          }
          deferred.resolve(rows);
        }, function(err) {
          console.error('error in FavoriteFactory.ls', err);
          deferred.reject();
        });

        return deferred.promise;
      }

      function rm(mmsId) {
        var deferred = $q.defer();

        if (!ionic.Platform.isWebView()) {
          // Not on a device. Use SessionStorage for testing
          $timeout(function() { deferred.resolve(sessionStorage.removeItem(mmsId)); });
          return deferred.promise;
        }

        console.log('Delete:' , mmsId);
        query('DELETE FROM favorites WHERE mms_id=?', [mmsId]).then(function(res) {
          deferred.resolve(true);
        }, function(err) {
          console.error('error in FavoriteFactory.rm', err);
          deferred.reject();
        });

        return deferred.promise;
      }

      function put(mmsId, data) {
        var deferred = $q.defer();

        data = JSON.stringify(data);

        if (!ionic.Platform.isWebView()) {
          // Not on a device. Use SessionStorage for testing
          $timeout(function() { deferred.resolve(sessionStorage.setItem(mmsId, data)); });
          return deferred.promise;
        }

        get(mmsId).then(function(row) {
          if (row === null) {

            console.log('Insert:' , mmsId);
            query('INSERT INTO favorites (mms_id, data) VALUES (?, ?)', [mmsId, data]).then(function(res) {
              deferred.resolve(true);
            }, function(err) {
              console.error('error in FavoriteFactory.put.INSERT', err);
              deferred.reject();
            });

          } else {

            console.log('Update:' , mmsId);
            query('UPDATE favorites SET data=? WHERE mms_id=?', [data, mmsId]).then(function(res) {
              deferred.resolve(true);
            }, function(err) {
              console.error('error in FavoriteFactory.put.UPDATE', err);
              deferred.reject();
            });

          }

        });
        return deferred.promise;
      }

    }

    // add it to our factories module
    angular
      .module('factories')
      .factory('FavoriteFactory', FavoriteFactory);

    // ------------------------------------------------------------------------

})();
