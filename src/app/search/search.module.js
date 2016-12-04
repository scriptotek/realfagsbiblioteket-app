(function() {

  angular
    .module('app.search', ['app.favorites', 'app.book', 'app.services.memorystorage'])
    .factory('SearchFactory', SearchFactory)
    .controller('SearchCtrl', SearchCtrl)
    .controller('EditionsCtrl', EditionsCtrl);

  // --------------------------------------------------------------------------

  function SearchCtrl(SearchFactory, $state, $stateParams, $ionicLoading, $scope, $timeout, $cordovaNetwork, $ionicHistory, MemoryStorage) {

    /**
     * Note that
     * - the controller *is* re-initialized when a new search is carried out.
     * - the controller is *not* re-initialized when the view is reached using the back button.
     */

    console.log('>>> SearchCtrl.init(query=' + $stateParams.query +')');

    var vm = this;
    var helpCards = [
      'Som standard søker du i samlingene til Realfagsbiblioteket (inkludert Informatikkbiblioteket og Naturhistorisk museum), men du kan utvide søket til å gå mot alle bibliotek ved UiO eller alle fagbibliotek i Norge.',
      'Selv om du bare søker i Realfagsbiblioteket vil appen vise tilgjengelige eksemplarer fra andre bibliotek hvis eksemplarene i Realfagsbiblioteket er utlånt.',
    ];

    // State variables : default values
    var defaultValues = {
      sort: MemoryStorage.get('search.defaultSort', 'relevance'),
      query: '',
      scope: 'UREAL',
    };
    vm.state = {};

    // View variables
    vm.showOptions = MemoryStorage.get('search.showOptions', false);
    vm.error = null;
    vm.showHelpCards = true;
    vm.showEbooks = true;

    // Helper variable for ionic-infinite-scroll. Set to false when there are no new books.
    vm.canLoadMoreResults = false;

    vm.searchScopes = {
      UREAL: {menuName: 'Realfagsbibl, Inf og Tøyen', name: 'Realfagsbiblioteket, Informatikkbiblioteket eller Naturhistorisk museum'},
      UBO: {menuName: 'Hele UiO', name: 'bibliotek ved UiO'},
      BIBSYS: {menuName: 'Alle norske fagbibliotek', name: 'norske fagbibliotek'},
    };

    // Functions
    vm.clickResult = clickResult;
    vm.loadMoreResults = loadMoreResults;
    vm.searchQueryUpdated = searchQueryUpdated;
    vm.sortBy = sortBy;
    vm.setScope = setScope;
    vm.cardSwiped = nextCard;
    vm.cardDestroyed = cardDestroyed;
    vm.clearSearch = clearSearch;
    vm.submitSearchForm = submitSearchForm;
    vm.toggleShowOptions = toggleShowOptions;

    // Init
    $scope.$on('$ionicView.beforeEnter', beforeEnter);
    $scope.$on('$ionicView.enter', enter);
    activate();

    /////

    function activate() {

      // Set state defaults
      Object.keys(defaultValues).forEach(function(k) {
        console.log(k);
        vm.state[k] = defaultValues[k];
      });

      // We need to get the state params injected early.
      // No problem if this method is called twice, since
      // it should be idempotent.
      beforeEnter();

      firstCard();
    }

    function getStateParam(name) {
      return $stateParams[name] || defaultValues[name];
    }

    function beforeEnter() {
      // beforeEnter() is called after activate()

      console.log('>>> SearchCtrl.beforeEnter()', $stateParams.query, vm.state.query);

      // console.log($stateParams);
      if (getStateParam('query') != vm.state.query || getStateParam('scope') != vm.state.scope || getStateParam('sort') != vm.state.sort) {

        console.log('    Params changed, do new search: ', getStateParam('query'), vm.state.query, ' -- ', getStateParam('scope'), vm.state.scope, ' -- ', getStateParam('sort'), vm.state.sort);

        vm.state.query = getStateParam('query');
        vm.state.scope = getStateParam('scope');
        vm.state.sort = getStateParam('sort');

        startNewSearch();
      }
    }

    function enter() {
      var h = $ionicHistory.viewHistory();
      console.log($stateParams);
      console.log(h.currentView.index, h.histories.ion1.stack);
    }

    function clearSearch() {
      vm.canLoadMoreResults = false;
      vm.state.query = '';
      vm.totalResults = undefined;
      vm.results = [];
      vm.showHelpCards = true;
      vm.error = null;

      // Setting focus sometimes fails... Let's make two attempts
      $timeout(function() {
        document.getElementById('searchInputField').focus();
      });
      $timeout(function() {
        document.getElementById('searchInputField').focus();
      }, 350);
    }

    function firstCard() {
      vm.activeCardIndex = -1;
      vm.cards = [];
      nextCard();
    }

    function cardDestroyed(index) {
      vm.cards.splice(index, 1);
    }

    function nextCard() {
      vm.activeCardIndex++;
      if (helpCards[vm.activeCardIndex] === undefined) {
        vm.activeCardIndex = 0;
      }
      vm.cards.push({id: Math.random(), text: helpCards[vm.activeCardIndex]});
    }

    function setScope(scope) {
      vm.state.scope = scope;
      vm.submitSearchForm();
    }

    function sortBy(sort) {
      // Let's the user sort search results. This does not mean sorting the
      // results already displayed. This performs a new search with the sort
      // parameter updates
      if (vm.state.sort !== sort) {
        vm.state.sort = sort;
        MemoryStorage.put('search.defaultSort', vm.state.sort);
        vm.submitSearchForm();
      }
    }

    function toggleShowOptions() {
      vm.showOptions = !vm.showOptions;
      MemoryStorage.put('search.showOptions', vm.showOptions);
    }

    function searchQueryUpdated() {
      // Perhaps hide "no results" message
    }

    function searchCompleted() {
      // Can we load more books?
      vm.canLoadMoreResults = vm.totalResults === undefined || vm.results.length < SearchFactory.searchResult.total_results;
      console.log('    .searchCompleted() ', vm.results.length, '/', SearchFactory.searchResult.total_results, vm.totalResults, vm.canLoadMoreResults);
      $ionicLoading.hide();
      $scope.$broadcast('scroll.infiniteScrollComplete');
    }

    function loadMoreResults() {
      if (!vm.state.query) {
        return;
      }

      console.log('... loadMore, starting from ' + (vm.results.length+1));

      vm.error = null;
      SearchFactory.search(vm.state.query, vm.state.scope, null, vm.results.length+1, vm.state.sort)
      .then(function(data) {
        // console.log(data.results);
        vm.results = data.results;
        vm.totalResults = data.total_results;

        searchCompleted();
      }, function(error) {
        console.log("error in search ctrl: ", error);
        if (window.cordova && $cordovaNetwork.isOffline()) {
          vm.error = 'Ingen internettforbindelse.';
        } else if (error.status == -1) {
          vm.error = 'Mistet internettforbindelsen.';
        } else {
          vm.error = error.statusText ? error.statusText : 'Det oppsto en ukjent feil.';
        }
        searchCompleted();
      });

    }

    function submitSearchForm() {
      if (!vm.state.query) return;

      // Unfocus the input field to hide keyboard
      document.activeElement.blur();

      if (vm.state.query == getStateParam('query') && vm.state.scope == getStateParam('scope') && vm.state.sort == getStateParam('sort')) {
        // This can happen if 
        // 1. I search for some term "test"
        // 2. I clear the search field
        // 3. I search for exactly the same test
        // The state has now not changed, but we need to get the results back 
        // that was cleared when we pressed the clear button.
        console.log('submitSearchForm: No changes to state.');
        startNewSearch();
        return;
      }

      vm.showHelpCards = false;

      $ionicLoading.show({
        template: '<ion-spinner icon="ripple" class="spinner-energized"></ion-spinner> Søker...',
        noBackdrop: true,
        delay: 0,
      });

      // Update the url so that the user can go back in history to this search,
      // but without a transition animation

      $ionicHistory.nextViewOptions({
        disableAnimate: true,
      });

      $state.go('.', {
        query: vm.state.query,
        scope: vm.state.scope,
        sort: vm.state.sort,
      });
    }

    function startNewSearch() {
      if (!vm.state.query) {
        vm.showHelpCards = true;
        return;
      }

      console.log('    .startNewSearch(' + vm.state.query + ', ' + vm.state.scope + ', ' + vm.state.sort + ')');

      vm.showHelpCards = false;
      vm.totalResults = undefined;
      vm.results = [];
      loadMoreResults();
    }

    function clickResult(book) {
      if (book.type === "group") {
        // Multiple editions for this book. Navigate to group (search)view
        $state.go('app.editions', {
          id: book.id,
          scope: vm.state.scope,
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

  function EditionsCtrl(SearchFactory, $stateParams, $cordovaNetwork, $ionicLoading) {
    var vm = this;

    // Variables
    vm.state = {
      id: '',
      scope: '',
    };
    vm.results = [];
    vm.showEbooks = true;

    // Functions
    vm.retry = retry;
    vm.search = search;

    activate();

    /////

    function activate() {
      $ionicLoading.show({
        template: '<ion-spinner icon="ripple" class="spinner-energized"></ion-spinner> Henter...',
        noBackdrop: true,
        delay: 300,
      });

      vm.state.id = $stateParams.id;
      vm.state.scope = $stateParams.scope;
      vm.search();
    }

    function retry() {
      vm.search();
    }

    function search() {
      if (!vm.state.id || 0 === vm.state.id.length) return;

      SearchFactory.lookUpGroup(vm.state.id, vm.state.scope)
      .then(function(data) {
        // console.log("got data in search controller");
        $ionicLoading.hide();
        vm.results = data;
      }, function(error) {
        $ionicLoading.hide();
        console.log("error in group search ctrl: ", error.status);
        if (window.cordova && $cordovaNetwork.isOffline()) {
          vm.error = 'Ingen internettforbindelse.';
        } else if (error.status == -1) {
          vm.error = 'Mistet internettforbindelsen.';
        } else {
          vm.error = 'Det oppsto en ukjent feil.';
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
          deferred.reject('Ingen internettforbindelse.');
        } else if (response.status == -1) {
          deferred.reject('Mistet internettforbindelsen.');
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
