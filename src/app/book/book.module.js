(function() {

  angular
    .module('app.book', ['ngCordova', 'app.search', 'app.favorites'])
    .factory('Book', BookFactory)
    .controller('BookCtrl', BookCtrl);

  // --------------------------------------------------------------------------

  function BookFactory(_, $sce, gettextCatalog) {

    function processHoldings(record) {
      // console.log(' > processHoldings');
      // Adds a view-friendly 'record.print' object based on
      // data from 'record.components', for showing print availability.
      if (record.holdings) {
        record.holdings.forEach(function (holding) {
          if (holding.status == 'available') {
            holding.icon = 'ion-checkmark-circled balanced';
            if (holding.library_zone == 'other') {
              holding.statusMessage = gettextCatalog.getString('Can be requested from another library');
              holding.icon = 'ion-cube balanced';
            } else {
              holding.statusMessage = gettextCatalog.getString('On shelf in {{library}}', {library: holding.library_name});
            }
            holding.available = true;

          } else {
            holding.icon = 'ion-close-circled assertive';
            holding.statusMessage = gettextCatalog.getString('On loan from {{library}}', {library: holding.library_name});
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
          return gettextCatalog.getString('multiple editions');
        }
        if (book.material == 'e-books') {
          return gettextCatalog.getString('e-book');
        }
        if (book.material == 'print-books') {
          return gettextCatalog.getString('print book');
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
        this.statusMessage = gettextCatalog.getString('{{numberOfEditions}} editions', {numberOfEditions: bookData.number_of_editions});

      } else if (this.holdings.length) {
        this.available = true;
        this.icon = this.holdings[0].icon;
        this.statusMessage = this.holdings[0].statusMessage;

      } else if (this.urls.length) {
        this.available = true;
        this.icon = 'ion-checkmark-circled';
        this.statusMessage = gettextCatalog.getString('Available as e-book');

      } else if (this.material == 'e-bok') {
        this.available = false;
        this.icon = 'ion-close-circled';
        this.statusMessage = gettextCatalog.getString('E-book (no access)');
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

  function BookCtrl($stateParams, $ionicLoading, $ionicPopup, $ionicModal, $scope, $cordovaSocialSharing, $cordovaNetwork, SearchFactory, FavoriteFactory, gettextCatalog) {
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
          message: gettextCatalog.getString('Check out this book: {{title}} by {{author}}', {title: book.title, author: book.authors}),  // not supported on some apps (Facebook, Instagram)
          subject: gettextCatalog.getString('Check out this book'),   // fi. for email
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
      vm.busy = true;
      $ionicLoading.show({
        template: '<ion-spinner icon="ripple" class="spinner-energized"></ion-spinner> ' + gettextCatalog.getString('Fetching data...'),
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
          vm.error = gettextCatalog.getString('No internet connection.');
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
