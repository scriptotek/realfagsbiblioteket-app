(function() {

  angular
    .module('app.favorites', ['ngCordova', 'app.book'])
    .controller('FavoritesCtrl', FavoritesCtrl)
    .factory('FavoriteFactory', FavoriteFactory);

  // --------------------------------------------------------------------------

  function FavoritesCtrl($scope, FavoriteFactory) {
    var vm = this;
    vm.results = [];

    $scope.$on('$ionicView.enter', activate);

    function activate() {
      FavoriteFactory.ls().then(function(results) {
        vm.results = results.map(function(row) { return row.book; });
      });
    }
  }

  // --------------------------------------------------------------------------

  function FavoriteFactory($q, $timeout, $cordovaSQLite, Book) {

    var db;

    var factory = {
      init: init,  // Initialize the connection, create tables if necessary
      get: get,    // Get a single row by mms_id
      put: put,    // Upsert a single row
      rm: rm,      // Delete a single row
      ls: ls       // Get all rows
    };

    return factory;

    /////

    /**
     * Be careful to not call this before deviceReady / $ionicPlatform.ready
     * to avoid a race condition.
     */
    function init() {
      if (!ionic.Platform.isWebView()) return;  // Not on a device

      db = $cordovaSQLite.openDB({ location: 'default', name: 'realfagsbiblioteket.db' });

      // Queries are queued
      $cordovaSQLite.execute(db, 'CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY, mms_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, data BLOB)');
      $cordovaSQLite.execute(db, 'CREATE UNIQUE INDEX IF NOT EXISTS mms_id_idx ON favorites (mms_id)').then(function() {

      }, function(err) {
        console.error('Query failed:', err);
      });
    }

    function query(queryStr, args) {
      var deferred = $q.defer();

      $cordovaSQLite.execute(db, queryStr, args).then(function(res) {
        deferred.resolve(res);
      }, function(err) {
        console.error('error in FavoriteFactory.query', err);
        deferred.reject();
      });

      return deferred.promise;
    }

    function get(mmsId) {
      var deferred = $q.defer();

      if (!ionic.Platform.isWebView()) {
        // Not on a device. Use SessionStorage for testing
        $timeout(function() {
          var q = sessionStorage.getItem(mmsId);
          if (q) q = {
            book: new Book(sessionStorage.getItem(mmsId)),
            created_at: null
          };
          deferred.resolve(q);
        });
        return deferred.promise;
      }

      query('SELECT data, created_at FROM favorites WHERE mms_id=?', [mmsId]).then(function(res) {
        if (res.rows.length === 0) {
          return deferred.resolve(null);
        }
        deferred.resolve({
          book: new Book(res.rows.item(0).data),
          created_at: res.rows.item(0).created_at
        });
      }, function() {
        deferred.reject();
      });

      return deferred.promise;
    }

    function ls() {
      var deferred = $q.defer();

      if (!ionic.Platform.isWebView()) {
        // Not on a device. Use SessionStorage for testing
        $timeout(function() {
          var rows = [];
          for (var i = 0; i < sessionStorage.length; i++){
            rows.push({
              book: new Book(sessionStorage.getItem(sessionStorage.key(i))),
              created_at: null
            });
          }
          deferred.resolve(rows);
        });
        return deferred.promise;
      }

      query('SELECT data, created_at FROM favorites', []).then(function(res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
          rows.push({
            book: new Book(res.rows.item(i).data),
            created_at: res.rows.item(i).created_at
          });
        }
        deferred.resolve(rows);
      }, function(err) {
        console.error('error in FavoriteFactory.ls', err);
        deferred.reject();
      });

      return deferred.promise;
    }

    function rm(book) {
      var deferred = $q.defer();

      if (!ionic.Platform.isWebView()) {
        // Not on a device. Use SessionStorage for testing
        $timeout(function() { deferred.resolve(sessionStorage.removeItem(book.id)); });
        return deferred.promise;
      }

      console.log('Favorites: Delete:' , book.id);
      query('DELETE FROM favorites WHERE mms_id=?', [book.id]).then(function() {
        deferred.resolve(true);
      }, function(err) {
        console.error('error in FavoriteFactory.rm', err);
        deferred.reject();
      });

      return deferred.promise;
    }

    function put(book) {
      var deferred = $q.defer();
      var data = JSON.stringify(book.getData());

      if (!ionic.Platform.isWebView()) {
        // Not on a device. Use SessionStorage for testing
        $timeout(function() { deferred.resolve(sessionStorage.setItem(book.id, data)); });
        return deferred.promise;
      }

      get(book.id).then(function(row) {
        if (row === null) {

          console.log('Insert:' , book.id);
          query('INSERT INTO favorites (mms_id, data) VALUES (?, ?)', [book.id, data]).then(function() {
            deferred.resolve(true);
          }, function(err) {
            console.error('error in FavoriteFactory.put.INSERT', err);
            deferred.reject();
          });

        } else {

          console.log('Update:' , book.id);
          query('UPDATE favorites SET data=? WHERE mms_id=?', [data, book.id]).then(function() {
            deferred.resolve(true);
          }, function(err) {
            console.error('error in FavoriteFactory.put.UPDATE', err);
            deferred.reject();
          });

        }

      });
      return deferred.promise;
    }

  }

})();
