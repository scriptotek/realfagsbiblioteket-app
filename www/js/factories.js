// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('factories', []);

    // ------------------------------------------------------------------------

    function SearchFactory($http) {

      var searchResults = {};

      var factory = {
        search: search,
        searchResults: searchResults
      };

      return factory;

      /////

      // fetch results
      function search(query, ebook, start, appversion) {
        return $http({
          url: 'http://linode.biblionaut.net/app/',
          method: 'GET',
          params: {
            query: query,
            ebook: ebook,
            start: start,
            appversion: appversion
          }
        });
      };

    }

    // add it to our appFactories module
    angular
      .module('factories')
      .factory('SearchFactory', SearchFactory);

    // ------------------------------------------------------------------------

})();