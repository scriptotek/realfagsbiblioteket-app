// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('directives', [])
      .directive('uboIframeOnload', ['$parse', iframeOnloadDirective])
      .directive('uboHref', extLinkDirective)
      .directive('uboGeoLink', geoLinkDirective);

    function iframeOnloadDirective($parse) {
        var directive = {
            link: link,
            restrict: 'EA'
        };
        return directive;

        function link(scope, element, attrs){
            element.on('load', function(){
                var expr = $parse(attrs.uboIframeOnload);
                expr(scope);
                scope.$apply();
            });
            element.on('$destroy', function() {
                element.off('load');
            });
        }
    }

    // Directive to open external links using inAppBrowser
    // Source: https://forum.ionicframework.com/t/how-to-opening-links-in-content-in-system-browser-instead-of-cordova-browser-wrapper/2427/10
    function extLinkDirective() {
        var directive = {
            link: link,
            restrict: 'A'
        };
        return directive;

        function link(scope, element, attrs) {
            var url = '';

            attrs.$observe('uboHref', function(value) {
                if (value) {
                    url = value;
                }
            });

            element.on('click',function(e){
                console.log('Opening url:', url);
                e.preventDefault();
                if(attrs.ngClick){
                    scope.$eval(attrs.ngClick);
                }
                window.open(encodeURI(url), '_system');
            });
        }
    }

    // Directive to open map in default map app
    function geoLinkDirective() {
        var directive = {
            link: link,
            restrict: 'E',
            template: '<a href="#" ng-transclude></a>',
            transclude: true,
            replace: true,
            scope: '='  // isolate scope
        };
        return directive;

        function link(scope, element, attrs) {
            var lat = attrs.lat;
            var lng = attrs.lng;
            var q = attrs.query;

            // attrs.$observe('lat', function(value) {
            //     if (value) {
            //         lat = lat;
            //     }
            // });

            element.on('click',function(e){
                var url,
                    coords = encodeURIComponent(lat) + ',' + encodeURIComponent(lng),
                    query;

                e.preventDefault();
                if(attrs.ngClick){
                    scope.$eval(attrs.ngClick);
                }
                if (ionic.Platform.isIOS()) {
                    query = 'sll=' + coords + '&q=' + encodeURIComponent(q) + '&z=17';
                    url = 'maps:?' + query;
                } else {
                    query = 'q=' + encodeURIComponent(q) + '&z=16';
                    url = 'geo:' + coords + '?' + query;
                }
                window.open(encodeURI(url), '_system');
            });
        }
    }

})();
