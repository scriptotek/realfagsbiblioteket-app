// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http, $filter) {

      var searchResults = {};

      var factory = {
        search: search,
        searchResults: searchResults,
        getBook: getBook
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
        //   factory.searchResults = {};
        // });

        // fetch test data - REMOVE ME
        return $http({
          url: 'testdata.json',
          method: 'GET'
        }).success(function(data) {
          console.log('fetched test data');
          factory.searchResults = data.result.documents;
          console.log(factory.searchResults);
        }).error(function(err) {
          console.log('error in search: ' + err);
          factory.searchResults = {};
        });
      }

      function getBook(id) {
        // We should have the book in factory.searchResults at this point. Find it
        if (factory.searchResults.length) {
          var found = $filter('filter')(factory.searchResults, {recordId: id}, true);
          if (found.length) {
             console.log(found[0]);
             return found[0];
          } else {
             console.log('book not found in SearchFactory.getBook');
          }
        }else{
          console.log('no books found in SearchFactory.getBook');
        }
        return null;
      }

    }

    // add it to our appFactories module
    angular
      .module('factories')
      .factory('SearchFactory', SearchFactory);

    // ------------------------------------------------------------------------

})();