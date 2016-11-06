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

  .run(function($ionicPlatform, $ionicPopup, $cordovaKeyboard, $cordovaStatusbar, FavoriteFactory, $http, $rootScope) {

    console.log('$$ app.run()');

    $ionicPlatform.ready(function() {

      console.log('$$ ionicPlatform ready');

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

      FavoriteFactory.init();

      // Create a global error handler function on the window
      // Instead of doing this, we might want to create a service that will handle logging. See http://www.bennadel.com/blog/2542-logging-client-side-errors-with-angularjs-and-stacktrace-js.htm for an example.
      // window.globalErrorHandler = function(error) {
      //   console.log("globalErrorHandler got something");
      //   // send to the server or something..
      // };

    });
  })

  .config(function($stateProvider, $urlRouterProvider, $provide) {

    // Decorate the default error handler to make use of the globalErrorHandler
    // $provide.decorator("$exceptionHandler", function($delegate){
    //   return function(exception, cause){
    //     // Our custom function on the window gets information about the exception:
    //     window.globalErrorHandler({message:"Exception", reason:exception});
    //     // Let the original $exceptionHandler do what it would do normally:
    //     $delegate(exception, cause);
    //   };
    // });

    // The angular $exceptionHandler will only get errors that happens within angular. To also catch exception outside of the normal angular exceptions we will use window.onerror:
    // window.onerror = function(message, url, line, col, error) {
    //   // Remember: if our scripts are minified, then the line number will not be very useful

    //   console.log("Error in window.onerror:", message);

    //   // Call our globalErrorHandler with the error object
    //   window.globalErrorHandler(error);
    // };

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
