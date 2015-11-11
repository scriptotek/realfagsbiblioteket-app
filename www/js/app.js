// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function(){

  angular.module('starter', [
    'ionic',
    'factories',
    'controllers',
    'LocalForageModule'])

  .run(function($ionicPlatform) {
    $ionicPlatform.ready(function() {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);

      }
      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }
    });
  })

  .config(function($stateProvider, $urlRouterProvider) {

    // set default route
    $urlRouterProvider.otherwise('/app/home');

    $stateProvider
      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html',
        controller: 'AppCtrl',
        controllerAs: 'vm',
        resolve: {
          loadFavorites: function(SearchFactory) {
              // load any favorites stored
              return SearchFactory.loadFavorites();
          }
        }
      })
      .state('app.home', {
          url: '/home',
          views: {
            'menuContent': {
              templateUrl: 'templates/home.html'
            }
          }
      })
      .state('app.search', {
        url: '/search',
        views: {
          'menuContent': {
            templateUrl: 'templates/search.html',
            controller: 'SearchCtrl',
            controllerAs: 'vm'
          }
        }
      })
      .state('app.favorites', {
        url: '/favorites',
        views: {
          'menuContent': {
            templateUrl: 'templates/favorites.html',
            controller: 'FavoritesCtrl',
            controllerAs: 'vm'
          }
        }
      })
      .state('app.single', {
        url: '/view/:id',
        views: {
          'menuContent': {
            templateUrl: 'templates/book.html',
            controller: 'BookCtrl',
            controllerAs: 'vm'
          }
        }
      });
    
  });

})();