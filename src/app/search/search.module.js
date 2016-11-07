(function() {

  angular
    .module('app.search', ['app.favorites', 'app.book'])
    .factory('SearchFactory', SearchFactory)
    .controller('SearchCtrl', SearchCtrl)
    .controller('EditionsCtrl', EditionsCtrl);

  // --------------------------------------------------------------------------

  function SearchCtrl(SearchFactory, $state, $stateParams, $ionicLoading, $scope, $cordovaNetwork) {
    var vm = this;

    // Variables
    vm.error = null;
    vm.searchQuery = '';
    vm.results = [];
    vm.search = search;
    vm.showEbooks = true;
    vm.searchQuerySort = "date";

    // Total number of results (undefined until search carried out)
    vm.totalResults = undefined;

    // Helper variable to show/hide "no results" error message
    vm.noResults = false;

    // Helper variable for ionic-infinite-scroll. Set to false when there are no new books.
    vm.canLoadMoreResults = false;

    // On android loadMore() fires instantly even though immediate-check="false" on the ion-infinite-scroll element. Therefore use this helper variable:
    vm.initialSearchCompleted = false;

    // Functions
    vm.clickResult = clickResult;
    vm.loadMore = loadMore;
    vm.searchQueryUpdated = searchQueryUpdated;
    vm.sortBy = sortBy;

    activate();

    /////

    function activate() {
      vm.searchQuery = $stateParams.query;
      vm.search();
    }

    function sortBy(sort) {
      // Let's the user sort search results. This does not mean sorting the
      // results already displayed. This performs a new search with the sort
      // parameter updates
      if (vm.searchQuerySort !== sort) {
        vm.searchQuerySort = sort;
        vm.search();
      }
    }

    function searchQueryUpdated() {
      vm.noResults = false;
    }

    function searchCompleted() {
      // Can we load more books?
      // console.log('::', SearchFactory.searchResult.total_results, vm.results.length, SearchFactory.searchResult.total_results);
      vm.canLoadMoreResults = vm.totalResults === undefined || vm.results.length < SearchFactory.searchResult.total_results;
      $ionicLoading.hide();
      $scope.$broadcast('scroll.infiniteScrollComplete');
    }

    function loadMore() {
      // console.log('> loadMore, starting from ' + (vm.results.length+1));

      vm.error = null;
      SearchFactory.search(vm.searchQuery, vm.results.length+1, vm.searchQuerySort)
      .then(function(data) {
        vm.results = data.results;
        vm.totalResults = data.total_results;

        vm.noResults = (vm.results.length===0);
        searchCompleted();
      }, function(error) {
        console.log("error in search ctrl: ", error);
        if (window.cordova && $cordovaNetwork.isOffline()) {
          vm.error = 'Ingen internettforbindelse :(';
        } else if (error.status == -1) {
          vm.error = 'Mistet forbindelsen :(';
        } else {
          vm.error = error.statusText ? error.statusText : 'Det oppsto en ukjent feil :(';
        }
        searchCompleted();
      });

    }

    function search() {
      if (!vm.searchQuery) return;

      // Unfocus the input field to hide keyboard
      document.activeElement.blur();

      $ionicLoading.show({
        template: '<ion-spinner icon="ripple" class="spinner-energized"></ion-spinner> Søker...',
        noBackdrop: true,
        delay: 0,
      });

      // If the url is not currently set to this query, update it
      if (vm.searchQuery !== $stateParams.query) {
        // Update the url without reloading, so that the user can go back in history to this search.
        $state.go('app.search', {query: vm.searchQuery}, {notify: false});
        $stateParams.query = vm.searchQuery; // Is this needed??
      }

      vm.totalResults = undefined;
      vm.results = [];
      loadMore();
    }

    function clickResult(book) {
      if (book.type === "group") {
        // Multiple editions for this book. Navigate to group (search)view
        $state.go('app.editions', {
          id: book.id
        });
      } else {
        // Just a single edition for this book. Navigate straight to it.
        $state.go('app.book', {
          id: book.id
        });
      }
    }

  }

  // ------------------------------------------------------------------------

  function EditionsCtrl(SearchFactory, $stateParams, $cordovaNetwork) {
    var vm = this;

    // Variables
    vm.searchId = '';
    vm.results = [];
    vm.showEbooks = true;
    // Functions
    vm.retry = retry;
    vm.search = search;

    activate();

    /////

    function activate() {
      vm.searchId = $stateParams.id;
      vm.search();
    }

    function retry() {
      vm.search();
    }

    function search() {
      if (!vm.searchId || 0 === vm.searchId.length) return;

      SearchFactory.lookUpGroup(vm.searchId)
      .then(function(data) {
        // console.log("got data in search controller");
        vm.results = data;
      }, function(error) {
        console.log("error in group search ctrl: ", error.status);
        if (window.cordova && $cordovaNetwork.isOffline()) {
          vm.error = 'Ingen internettforbindelse :(';
        } else if (error.status == -1) {
          vm.error = 'Mistet forbindelsen :(';
        } else {
          vm.error = 'Det oppsto en ukjent feil :(';
        }
      });
    }

  }


  // --------------------------------------------------------------------------

  function SearchFactory($http, $filter, $q, $sce, $ionicPopup, $ionicPlatform, $cordovaNetwork, _, FavoriteFactory, Book) {

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
    var platform, deviceInfo = {}, appVersion;

    var factory = {
      search: search,
      lookUpGroup: lookUpGroup,
      searchResult: searchResult,

      // @TODO: Move to book.module.js
      getBookDetails: getBookDetails,
      addHoldingLocation: addHoldingLocation,
    };

    activate();

    return factory;

    /////

    function activate() {
      $ionicPlatform.ready(function() {
        platform = ionic.Platform.platform();
        deviceInfo = ionic.Platform.device();
        if (navigator.appInfo !== undefined) {
          navigator.appInfo.getAppInfo(function(appInfo) {
            appVersion = appInfo.version;
          }, function(err) {
            console.log(err);
          });
        }
      });
    }

    function processSearchResults(results) {
      return results.map(function(bookData) {
        return new Book(bookData);
      });
    }

    function search(query, start, sort) {
      // Fetch records from API for the given query

      // Set default value for start
      start = typeof start !== 'undefined' ? start : 1;
      // Set default value for sortBy
      sort = typeof sort !== 'undefined' ? sort : "date";

      var deferred = $q.defer();

      var device = deviceInfo.manufacturer ? deviceInfo.manufacturer + ' ' + deviceInfo.model : null;

      $http({
        // url: 'https://ub-www01.uio.no/realfagsbiblioteket-app/search',
        url: 'https://bibapp.biblionaut.net/search.php',
        method: 'GET',
        cache: true,
        params: {
          platform: platform,
          platform_version: deviceInfo.version,
          app_version: appVersion,
          device: device,
          query: query,
          start: start,
          sort: sort
        }
      }).then(function(response) {

        var results = processSearchResults(response.data.results);

        // New search?
        if (start === 1) {
          factory.searchResult = {
            total_results: response.data.total_results,
            results: results,
            first: response.data.first,
            next: response.data.next,
          };
        } else {
          // Need to concat newResults and update variables
          factory.searchResult.results = factory.searchResult.results.concat(results);
          factory.searchResult.first = response.data.first;
          factory.searchResult.next = response.data.next;
        }

        // Resolve the promise. This will send the (new) search results to the success function in the controller
        deferred.resolve(factory.searchResult);

      }, function(error) {
        console.log('error in search factory');
        deferred.reject(error);
      });

      return deferred.promise;
    }

    function lookUpGroup(id) {
      // Fetch group records from API for the given id

      var deferred = $q.defer();

      var url = 'https://lsm.biblionaut.net/primo/groups/' + id;
      // var url = 'https://ub-lsm.uio.no/primo/groups/' + id;

      $http({
        url: url,
        method: 'GET',
        cache: true,
      }).then(function(response) {

        var results = processSearchResults(response.data.result.records);

        factory.searchResult = {
          results: results
        };

        // Resolve the promise. This will send the search results to the success function in the controller
        deferred.resolve(results);

      }, function(error) {
        console.log('error in search factory');
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
      img.onload = function() {
        // @TODO: We could test if we actually got a valid data, and
        // mark the cover as valid/invalid, see <http://stackoverflow.com/a/9809055/489916>
        resolve();
      };
      img.onerror = function() {
        resolve();
      };
      return deferred.promise;
    }

    function getBookDetails(id, config) {
      // Find details for the book(s) with given id

      var url = 'https://lsm.biblionaut.net/primo/records/' + id;
      // var url = 'https://ub-lsm.uio.no/primo/records/' + id;

      // We'll return a promise, which will resolve with a book if found, or with an error if not.
      var deferred = $q.defer();

      $http.get(url)
      .then(function(data) {
        var book = new Book(data.data.result);

        // Add display-friendly variables for displaying availability
        processPrintAvailability(book, config);
        processElectronicAvailability(book);

        FavoriteFactory.get(book.id).then(function(res) {
          if (res) {
            // Since the book may have been updated in the backend since the last load,
            // update the local copy.
            FavoriteFactory.put(book);
          }
        });

        cacheBookCover(book.links.cover).then(function() {
          // Get location
          if (book.holdings.length && book.holdings[0].available && book.holdings[0].library == config.libraries.local.code) {
            factory.addHoldingLocation(book.holdings[0])
            .then(function() {
              // We got a holding location
              deferred.resolve(book);
            }, function() {
              // We didn't get book location, but resolve promise anyway.
              deferred.resolve(book);
            });
          } else {
            // Resolve without location information
            deferred.resolve(book);
          }
        });

      }, function(response) {
        console.log("Error in getBookDetails factory: ", response.status);
        if (window.cordova && $cordovaNetwork.isOffline()) {
          deferred.reject('Ingen internettforbindelse :(');
        } else if (response.status == -1) {
          deferred.reject('Mistet forbindelsen :(');
        } else if (response.data && response.data.error) {
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

        deferred.resolve(holding);
      }, function(error) {
        // console.log("error in factory.getBookLocation")
        deferred.reject(error);
      });

      return deferred.promise;
    }

  }

})();
