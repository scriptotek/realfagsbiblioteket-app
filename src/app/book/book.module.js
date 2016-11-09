(function() {

  angular
    .module('app.book', ['ngCordova', 'app.search', 'app.favorites'])
    .factory('Book', BookFactory)
    .controller('BookCtrl', BookCtrl);


  // --------------------------------------------------------------------------

  function BookFactory() {

    // Constructor
    function Book(data) {

      // Store a clone of the original data
      if (typeof data == 'string') {
        this._data = data;
      } else {
        this._data = JSON.stringify(data);
      }

      var bookData = JSON.parse(this._data);

      // Create a display-friendly authors-variable
      bookData.authors = bookData.creators.join(", ");

      function reduceMaterial(book) {
        if (book.type == 'group') {
          return 'flere utgaver';
        }
        if (book.material.indexOf('e-books') !== -1) {
          return 'e-bok';
        }
        if (book.material.indexOf('print-books') !== -1) {
          return 'trykt bok';
        }
      }

      if (typeof bookData.material == 'object') {
        bookData.material = reduceMaterial(bookData);
      }

      var that = this;
      Object.keys(bookData).forEach(function(key) {
        that[key] = bookData[key];
      });
      // console.log(this);
    }
    // Define the "instance" methods using the prototype
    // and standard prototypal inheritance.
    Book.prototype = {
      getData: function() {
        return JSON.parse(this._data);
      }
    };

    return Book;
  }

  // ------------------------------------------------------------------------

  function BookCtrl($stateParams, $ionicLoading, $ionicPopup, $ionicModal, $scope, $cordovaSocialSharing, $cordovaNetwork, SearchFactory, FavoriteFactory) {
    var vm = this;

    vm.books = [];
    vm.busy = true;
    vm.mapModal = mapModal;
    vm.shareBook = shareBook;
    vm.retry = retry;
    vm.onDevice = false;

    // List of local libraries in preferred order.
    // @TODO: Get from some global config
    var config = {
      libraries: {
        local: {
          code: 'UBO1030310',
          name: 'Realfagsbiblioteket',
          openStackCollections: [  // sorted in order of increasing preference ('Pensum' is less preferred than the rest)
            'k00471',  // UREAL Pensum
            'k00460',  // UREAL Laveregrad
            'k00413',  // UREAL Astr.
            'k00421',  // UREAL Biol.
            'k00447',  // UREAL Geo.
            'k00449',  // UREAL Geol.
            'k00426',  // UREAL Farm.
            'k00457',  // UREAL Kjem.
            'k00440',  // UREAL Fys.
            'k00465',  // UREAL Mat.
            'k00475',  // UREAL Samling 42
            'k00477',  // UREAL SciFi
            'k00423',  // UREAL Boksamling
          ]
        },
        satellites: [
          {code: 'UBO1030317', name: 'Informatikkbiblioteket'},
          {code: 'UBO1030500', name: 'Naturhistorisk museum'}
        ]
      }
    };
    vm.config = config;

    vm.toggleFavorite = toggleFavorite;

    activate();

    /////

    function shareBook(book) {
      if (vm.onDevice) {
        $cordovaSocialSharing.shareWithOptions({
          message: 'Sjekk ut denne boka: ' + book.title,  // not supported on some apps (Facebook, Instagram)
          subject: 'Sjekk ut denne boka',   // fi. for email
          url: book.links.primo,
        });
      } else {
        console.log('Not running on a device');
      }
    }

    function mapModal(holding) {

      vm.imageUrl = holding.map_url_image + '&orientation=f';
      vm.callcode = holding.callcode;

      $ionicModal.fromTemplateUrl('book-map-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function(modal) {
        $scope.modal = modal;

        $scope.openModal();
      });

      $scope.openModal = function() {
        $scope.modal.show();
      };
      $scope.closeModal = function() {
        $scope.modal.hide();
      };
      //Cleanup the modal when we're done with it!
      $scope.$on('$destroy', function() {
        $scope.modal.remove();
      });
      // Execute action on hide modal
      $scope.$on('modal.hidden', function() {
        // Execute action
      });
      // Execute action on remove modal
      $scope.$on('modal.removed', function() {
        // Execute action
      });

    }

    function retry() {
      if (!vm.busy) {
        activate();
      }
    }

    function activate() {
      $ionicLoading.show({
        template: '<ion-spinner icon="ripple" class="spinner-energized"></ion-spinner> Henter...',
        noBackdrop: true,
        delay: 300,
      });

      SearchFactory.getBookDetails($stateParams.id, config)
      .then(function(data) {
        $ionicLoading.hide();
        vm.busy = false;

        // Did we have the book stored in favorites?
        FavoriteFactory.get(data.id).then(function(res) {
          data.isFavorite = (res !== null);
        });

        vm.books = [data];
      }, function(error) {
        $ionicLoading.hide();
        vm.busy = false;

        if (window.cordova && $cordovaNetwork.isOffline()) {
          vm.error = 'Ingen internettforbindelse :(';
        } else {
          vm.error = error;
        }
      });

      // Helper variable
      if (window.cordova) {
        vm.onDevice = true;
      }
    }

    function toggleFavorite(book) {
      // Update view
      book.isFavorite = !book.isFavorite;

      // Update storage
      if (book.isFavorite) {
        FavoriteFactory.put(book);
      } else {
        FavoriteFactory.rm(book);
      }
    }
  }

})();
