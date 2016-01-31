// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function(){

  angular.module('starter', [
    'ionic',
    'directives',
    'factories',
    'controllers',
    'constants',
    'LocalForageModule',
    'ngCordova'])

  .run(function($ionicPlatform, $ionicPopup) {
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
      // Get app information. This only works on devices. Use this to query server status.
      if (navigator.appInfo !== undefined) {
        navigator.appInfo.getAppInfo(function(appInfo) {
          console.log('identifier: %s', appInfo.identifier);
          console.log('version: %s', appInfo.version);
          console.log('build: %s', appInfo.build);
        }, function(err) {
            console.log(err);
        });
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
      .state('app.intro', {
        url: '/intro',
        views: {
          'menuContent': {
            templateUrl: 'templates/intro.html'
          }
        }
          
      })
      .state('app.home', {
          url: '/home',
          views: {
            'menuContent': {
              templateUrl: 'templates/home.html',
              controller: 'HomeCtrl',
              controllerAs: 'vm'
            }
          }
      })
      .state('app.information', {
          url: '/information',
          views: {
            'menuContent': {
              templateUrl: 'templates/information.html'
            }
          }
      })
      .state('app.isbn', {
        url: '/isbn',
        views: {
          'menuContent': {
            templateUrl: 'templates/isbn.html',
            controller: 'IsbnCtrl',
            controllerAs: 'vm'
          }
        }
      })
      .state('app.search', {
        url: '/search/:query',
        views: {
          'menuContent': {
            templateUrl: 'templates/search.html',
            controller: 'SearchCtrl',
            controllerAs: 'vm'
          }
        }
      })
      .state('app.group', {
        url: '/group/:id',
        views: {
          'menuContent': {
            templateUrl: 'templates/group.html',
            controller: 'GroupCtrl',
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