// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http, $filter, $localForage) {

      var searchResults = [];
      var favorites = [];

      var factory = {
        search: search,
        searchResults: searchResults,
        favorites: favorites,
        getBook: getBook,
        loadFavorites: loadFavorites,
        toggleFavorite: toggleFavorite,
        isBookInFavorites: isBookInFavorites
      };

      return factory;

      /////

      // search api
      function search(query, ebook, start, appversion) {
        // return $http({
        //   url: 'http://linode.biblionaut.net/app/',
        //   method: 'GET',
        //   params: {
        //     query: query,
        //     ebook: ebook,
        //     start: start,
        //     appversion: appversion
        //   }
        // }).success(function(data) {
        //   console.log('fetched test data');
        //   factory.searchResults = data.result.documents;
        // }).error(function(err) {
        //   console.log('error in search: ' + err);
        //   factory.searchResults = [];
        // });

        // fetch test data - REMOVE ME
        return $http({
          url: 'testdata.json',
          method: 'GET'
        }).success(function(data) {
          // console.log('fetched test data');
          factory.searchResults = data.result.documents;
          // console.log(factory.searchResults);
        }).error(function(err) {
          console.log('error in search: ' + err);
          factory.searchResults = [];
        });
      }

      function loadFavorites() {
        $localForage.getItem('favorites')
        .then(function(data) {
          if (data) {
            console.log('got favorites:' + data);
            factory.favorites = data;
          }else{
            console.log('no favorites to retrieve');
          }
        }, function() {
          console.log('error in loadFavorites');
        });
      }
      
      function toggleFavorite(book) {
        console.log(book);
        if (book.isFavorite) {
          // remove book from here
          factory.favorites.splice(factory.favorites.indexOf(book),1);
          console.log('book removed. favorites are now:');
          console.log(factory.favorites);
        }else{
          // add book
          factory.favorites.push(book);
          console.log('book added. favorites are now:');
          console.log(factory.favorites);
        }
        // update storage
        $localForage.setItem('favorites', factory.favorites);
      }

      function getBook(id) {
        // Is the book in searchResults?
        var found;
        if (factory.searchResults.length) {
          found = $filter('filter')(factory.searchResults, {id: id}, true);
          if (found.length) {
             // console.log(found[0]);
             return found[0];
          } else {
             console.log('book not found in searchResults in SearchFactory.getBook');
          }
        }
        // Is the book in favorites?
        if (factory.favorites.length){
          found = $filter('filter')(factory.favorites, {id: id}, true);
          if (found.length) {
             // console.log(found[0]);
             return found[0];
          } else {
             console.log('book not found in favorites in SearchFactory.getBook');
          }
        }

        console.log('no books found in SearchFactory.getBook');
        return null;
      }

      function isBookInFavorites(id) {
        console.log('trying to figure out if id='+id+' is a favorite. favorites are:');
        console.log(factory.favorites);
        if (factory.favorites.length){
          found = $filter('filter')(factory.favorites, {id: id}, true);
          console.log('book id='+id+' is a favorite from localForage');
          return true;
        }
        console.log('book id='+id+' is NOT favorite from localForage');
        return false;
      }

    }

    // add it to our appFactories module
    angular
      .module('factories')
      .factory('SearchFactory', SearchFactory);

    // ------------------------------------------------------------------------

})();