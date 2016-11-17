(function() {

  angular
    .module('app.services.memorystorage', [])
    .factory('MemoryStorage', Factory);

  // --------------------------------------------------------------------------

  function Factory() {

    var factory = {
      data: {},
      get: get,
      put: put,
    };

    console.log('Factory.init');

    return factory;

    /////

    function get(key, defaultValue) {
      console.log('GET', key, factory.data[key]);
      return factory.data[key] || defaultValue;
    }

    function put(key, value) {
      console.log('PUT', key, value);
      factory.data[key] = value;
    }
  }

})();
