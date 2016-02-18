// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function(){

  angular.module('starter', [
    'ionic',
    'directives',
    'factories',
    'controllers',
    'constants',
    'ngCordova'])

  .run(function($ionicPlatform, $ionicPopup, $cordovaKeyboard, $cordovaStatusbar, FavoriteFactory, $http) {
    $ionicPlatform.ready(function() {

      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if ($cordovaKeyboard.hideKeyboardAccessoryBar) {
        $cordovaKeyboard.hideKeyboardAccessoryBar(true);
        $cordovaKeyboard.disableScroll(true);

      }

      if ($cordovaStatusbar.styleDefault) {
        console.log('cordovaStatusbar.styleDefault');
        $cordovaStatusbar.styleDefault();
      }

      // Give the user a warning if we can't see an internet connection
      if(navigator.connection) {
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

      // Get app information. This only works on devices.
      // @TODO: Use this to query server status.
      if (navigator.appInfo) {
        navigator.appInfo.getAppInfo(function(appInfo) {
          // console.log('identifier: %s', appInfo.identifier);
          // console.log('version: %s', appInfo.version);
          // console.log('build: %s', appInfo.build);
          // console.log('platform: %s', device.platform);

          // appInfo.version device.platform

          $http({
            url: 'https://app.uio.no/ub/bdi/realfagsbiblioteket/status.php',
            method: 'GET',
            cache: false,
            params: {
              platform: device.platform,
              version: appInfo.version
            }
          }).then(function(data) {
            console.log("success in appjs checkstatus:");
            console.log(data.data.message);
          }, function(error) {
            console.log("error in appjs checkstatus:");
            console.log(error);
            $ionicPopup.confirm({
              title: "Server error",
              content: "Det har oppstått en feil på serveren. Vennligst prøv igjen senere."
            })
            .then(function(result) {
              if(!result) {
                ionic.Platform.exitApp();
              }
            });
          });
        }, function(err) {
            console.log(err);
        });
      }

      FavoriteFactory.init();

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
        controllerAs: 'vm'
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