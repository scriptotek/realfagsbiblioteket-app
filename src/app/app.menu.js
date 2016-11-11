(function() {

  angular
    .module('app.menu', [])
    .controller('MenuController', MenuController);

  // --------------------------------------------------------------------------


  // --------------------------------------------------------------------------

  function MenuController($state) {
    var vm = this;

    vm.go = go;

    /////

    function go(route) {
      console.log('Goto ', route);
      $state.go(route);
    }

  }

})();
