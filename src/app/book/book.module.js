(function() {

  angular
    .module('app.book', ['ngCordova', 'app.search', 'app.favorites'])
    .factory('Book', BookFactory)
    .controller('BookCtrl', BookCtrl);

  // --------------------------------------------------------------------------

  function BookFactory(_, $sce) {

    function processHoldings(record) {
      // console.log(' > processHoldings');
      // Adds a view-friendly 'record.print' object based on
      // data from 'record.components', for showing print availability.
      if (record.holdings) {
        record.holdings.forEach(function (holding) {
          if (holding.status == 'available') {
            holding.icon = 'ion-checkmark-circled balanced';
            if (holding.library_zone == 'other') {
              holding.statusMessage = 'Kan bestilles fra annet bibliotek';
              holding.icon = 'ion-cube balanced';
            } else {
              holding.statusMessage = 'På hylla i ' + holding.library_name;
            }
            holding.available = true;

          } else {
            holding.icon = 'ion-close-circled assertive';
            holding.statusMessage = 'Utlånt fra ' + holding.library_name;
            holding.available = false;
          }
        });
      }
    }

    function processElectronicAvailability(record) {
      // console.log(' > processElectronicAvailability');
      if (record.urls && record.urls.length) {
        // Trust for use in iframe
        // @TODO: Do we ever need more than the first URL?
        record.urls[0].url = $sce.trustAsResourceUrl(record.urls[0].url);
      }
    }


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
        if (book.material == 'e-books') {
          return 'e-bok';
        }
        if (book.material == 'print-books') {
          return 'trykt bok';
        }
      }

      bookData.material = reduceMaterial(bookData);

      var that = this;
      Object.keys(bookData).forEach(function(key) {
        that[key] = bookData[key];
      });

      processHoldings(this);
      processElectronicAvailability(this);

      // console.log(this.holdings);

      if (this.type == 'group') {
        this.icon = 'ion-arrow-right-c balanced';
        this.statusMessage = 'Flere utgaver';

      } else if (this.holdings.length) {
        this.available = true;
        this.icon = this.holdings[0].icon;
        this.statusMessage = this.holdings[0].statusMessage;

      } else if (this.urls.length) {
        this.available = true;
        this.icon = 'ion-checkmark-circled';
        this.statusMessage = 'Tilgjengelig som e-bok';

      } else if (this.material == 'e-bok') {
        this.available = false;
        this.icon = 'ion-close-circled';
        this.statusMessage = 'E-bok (ingen tilgang)';
      }

      // console.log(this);
    }

    // Define the "instance" methods using the prototype
    // and standard prototypal inheritance.
    Book.prototype = {
      getData: function() {
        return JSON.parse(this._data);
      },
      hasLocalHolding: function() {
        return (this.holdings.length && this.holdings[0].available && this.holdings[0].library_zone == 'local');
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

      SearchFactory.getBookDetails($stateParams.id)
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
