(function() {

  angular
    .module('app.xisbn', [])
    .factory('XisbnFactory', XisbnFactory);

  // --------------------------------------------------------------------------

  function XisbnFactory($http, $q) {

    var factory = {
      getMetadata: getMetadata
    };

    return factory;

    /////

    function getMetadata(isbn) {

      var deferred = $q.defer();

      $http.get('https://ub-www01.uio.no/realfagsbiblioteket-app/xisbn/' + isbn)
      .then(function(response) {
        deferred.resolve(response.data);
      }, function(response) {
        console.log("error in XisbnFactory.getMetadata");
        // checkInternetConnection();
        if (response.data && response.data.error) {
          deferred.reject(response.data.error);
        } else {
          deferred.reject(response.statusText);
        }
      });

      return deferred.promise;
    }
  }

})();
