(function () {
  'use strict';

  // --------------------------------------------------------------------------

  angular
  .module('app', [
    'ionic',
    'ionic.contrib.ui.cards',
    'ngCordova',
    'ngAnimate',

    'app.core',
    'app.menu',
    'app.home',
    'app.about',
    'app.directions',
    'app.favorites',
    'app.isbn',
    'app.search',
    'app.directives',  // @TODO: Split into several files

    // 'directives',
    // 'factories',
    // 'controllers',
    // 'constants',
  ])
  // Lodash: allow DI for use in controllers, unit tests
  .constant('_', window._)
  .run(runBlock)
  .config(routes);

  // --------------------------------------------------------------------------

  function runBlock($ionicPlatform, $ionicPopup, $cordovaKeyboard, $cordovaStatusbar, $cordovaNetwork, $http, $rootScope, FavoriteFactory) {

    console.log('$$ app.run()');

    $ionicPlatform.ready(function() {

      console.log('$$ ionicPlatform ready');

      // Hide the accessory bar by default (remove this to show the accessory
      // bar above the keyboard for form inputs)
      if ($cordovaKeyboard.hideKeyboardAccessoryBar) {
        $cordovaKeyboard.hideKeyboardAccessoryBar(true);
        $cordovaKeyboard.disableScroll(true);
      }

      if ($cordovaStatusbar.styleDefault) {
        $cordovaStatusbar.styleDefault();
      }

      FavoriteFactory.init();

      // Create a global error handler function on the window
      // Instead of doing this, we might want to create a service that will handle logging. See http://www.bennadel.com/blog/2542-logging-client-side-errors-with-angularjs-and-stacktrace-js.htm for an example.
      // window.globalErrorHandler = function(error) {
      //   console.log("globalErrorHandler got something");
      //   // send to the server or something..
      // };

    });
  }

  // --------------------------------------------------------------------------

  function routes($stateProvider, $urlRouterProvider) {

    // set default route
    $urlRouterProvider.otherwise('/');

    $stateProvider
    .state('app', {
      url: '',
      abstract: true,
      templateUrl: 'app/app.html',
      controller: 'MenuController',
      controllerAs: 'vm',
    })
    /*
    .state('app.intro', {
      url: '/intro',
      views: {
        'menuContent': {
          templateUrl: 'app/intro/intro.html'
        }
      }

    })*/
    .state('app.home', {
      url: '/',
      views: {
        'menuContent': {
          templateUrl: 'app/home/home.html',
          controller: 'HomeCtrl',
          controllerAs: 'vm'
        }
      }
    })
    .state('app.about', {
      url: '/about',
      views: {
        'menuContent': {
          templateUrl: 'app/about/about.html',
          controller: 'AboutCtrl',
          controllerAs: 'vm'
        }
      }
    })
    .state('app.directions', {
      url: '/directions',
      views: {
        'menuContent': {
          templateUrl: 'app/directions/directions.html'
        }
      }
    })
    .state('app.isbn', {
      url: '/isbn',
      views: {
        'menuContent': {
          templateUrl: 'app/isbn/isbn.html',
          controller: 'IsbnCtrl',
          controllerAs: 'vm'
        }
      }
    })
    .state('app.search', {
      url: '/search?query&scope&sort',
      views: {
        'menuContent': {
          templateUrl: 'app/search/search.html',
          controller: 'SearchCtrl',
          controllerAs: 'vm'
        }
      }
    })
    .state('app.editions', {
      url: '/editions/:id?scope',
      views: {
        'menuContent': {
          templateUrl: 'app/search/editions.html',
          controller: 'EditionsCtrl',
          controllerAs: 'vm'
        }
      }
    })
    .state('app.favorites', {
      url: '/favorites',
      views: {
        'menuContent': {
          templateUrl: 'app/favorites/favorites.html',
          controller: 'FavoritesCtrl',
          controllerAs: 'vm'
        }
      }
    })
    .state('app.book', {
      url: '/book/:id',
      views: {
        'menuContent': {
          templateUrl: 'app/book/book.html',
          controller: 'BookCtrl',
          controllerAs: 'vm'
        }
      }
    });
  }

})();
