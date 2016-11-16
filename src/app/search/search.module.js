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
    vm.searchQuerySort = "relevance";
    vm.showOptions = false;
    vm.searchScopes = [
      {value: 'UREAL',  label: 'Realfagsbibl, Inf og Tøyen'},
      {value: 'UBO',    label: 'Hele UiO'},
      {value: 'BIBSYS', label: 'Alle norske fagbibliotek'},
    ];
    vm.searchScope = 'UREAL';

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
    vm.setScope = setScope;
    vm.clearSearch = clearSearch;

    activate();

    /////

    function activate() {
      vm.noResults = false;
      vm.searchQuery = $stateParams.query;
      vm.searchScope = $stateParams.scope || 'UREAL';
      vm.search();
    }

    function clearSearch() {
      vm.searchQuery = '';
      vm.totalResults = undefined;
      vm.results = [];

      $timeout(function() {
        document.getElementById('searchInputField').focus();
      });
    }

    function setScope(scope) {
      vm.searchScope = scope;
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
      SearchFactory.search(vm.searchQuery, vm.searchScope, null, vm.results.length+1, vm.searchQuerySort)
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
      if (vm.searchQuery !== $stateParams.query || vm.searchScope != $stateParams.scope) {
        // Update the url without reloading, so that the user can go back in history to this search.
        $state.go('app.search', {
          query: vm.searchQuery,
          scope: vm.searchScope,
          sort: vm.searchQuerySort,
        }, {notify: false});
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
          id: book.id,
          scope: vm.searchScope,
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
    vm.searchScope = '';
    vm.results = [];
    vm.showEbooks = true;
    // Functions
    vm.retry = retry;
    vm.search = search;

    activate();

    /////

    function activate() {
      vm.searchId = $stateParams.id;
      vm.searchScope = $stateParams.scope;
      vm.search();
    }

    function retry() {
      vm.search();
    }

    function search() {
      if (!vm.searchId || 0 === vm.searchId.length) return;

      SearchFactory.lookUpGroup(vm.searchId, vm.searchScope)
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

  function SearchFactory($http, $filter, $timeout, $q, $sce, $ionicPopup, $ionicPlatform, $cordovaNetwork, _, FavoriteFactory, Book) {

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

    function request(endpoint, params) {
      var device = deviceInfo.manufacturer ? deviceInfo.manufacturer + ' ' + deviceInfo.model : null;
      params = params ? params : {};
      params.apiVersion = 2;
      if (device) {
        params.platform = platform;
        params.platform_version = deviceInfo.version;
        params.app_version = appVersion;
        params.device = device;
      }
      return $http({
        url: 'https://ub-www01.uio.no/realfagsbiblioteket-app/' + endpoint,
        // url: 'https://bibapp.biblionaut.net/search.php',
        method: 'GET',
        cache: true,
        params: params,
      });
    }

    function processSearchResults(results) {
      return results.map(function(bookData) {
        var book = new Book(bookData);

        return book;
      });
    }

    function search(query, scope, material, start, sort) {
      // Fetch records from API for the given query

      // Set default value for start
      start = typeof start !== 'undefined' ? start : 1;
      // Set default value for sortBy
      sort = typeof sort !== 'undefined' ? sort : "date";
      // Set default value for material
      material = typeof material !== 'undefined' ? material : "print-books";

      var deferred = $q.defer();

      request('search', {
        query: query,
        scope: scope,
        material: material,
        start: start,
        sort: sort,
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

    function lookUpGroup(id, scope) {
      // Fetch group records from API for the given id

      var deferred = $q.defer();

      request('groups/' + id, {scope: scope})
      .then(function(response) {

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

    function cacheBookCover(url) {
      var promiseResolved = false;
      var deferred = $q.defer();

      function resolve(fromTimer) {
        if (!promiseResolved) {
          if (fromTimer) {
            console.log('Took more than 2 sec to load cover.');
          } else {
            console.log('Cover loaded.');
          }
          promiseResolved = true;
          deferred.resolve();
        }
      }

      // Don't wait more than a short while
      console.log('Caching cover...');
      $timeout(function() {
        resolve(true);
      }, 2000);

      var img = new Image();
      img.src = url;
      img.onload = function() {
        // @TODO: We could test if we actually got a valid data, and
        // mark the cover as valid/invalid, see <http://stackoverflow.com/a/9809055/489916>
        $timeout(function() { resolve(); });
      };
      img.onerror = function() {
        $timeout(function() { resolve(); });
      };
      return deferred.promise;
    }

    function getBookDetails(id) {
      // Find details for the book(s) with given id

      // We'll return a promise, which will resolve with a book if found, or with an error if not.
      var deferred = $q.defer();

      request('records/' + id)
      .then(function(data) {
        var book = new Book(data.data.result);

        FavoriteFactory.get(book.id).then(function(res) {
          if (res) {
            // Since the book may have been updated in the backend since the last load,
            // update the local copy.
            FavoriteFactory.put(book);
          }
        });

        cacheBookCover(book.links.cover).then(function() {
          // Get location
          if (book.hasLocalHolding()) {
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

      $http.get('https://ub-www01.uio.no/realfagsbiblioteket-kart/loc.php', {
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
          holding.map_url_image = encodeURI("https://ub-www01.uio.no/realfagsbiblioteket-kart/map.php?collection=" + holding.collection_code + "&callnumber=" + holding.callcode);
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
