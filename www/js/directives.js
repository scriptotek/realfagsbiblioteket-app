// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('directives', [])
      .directive('uboIframeOnload', ['$parse', iframeOnloadDirective])
      .directive('uboFocus', uboFocusDirective)
      .directive('uboExtLink', uboExtLinkDirective)
      .directive('uboGeoLink', uboGeoLinkDirective);

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

    // Directive to auto-focus an element
    function uboFocusDirective($parse, $timeout) {
        var directive = {
            link: link,
            restrict: 'A'
        };
        return directive;

        function link(scope, element, attrs) {
            var expr = $parse(attrs.uboFocus);
            var enabled = expr(scope);

            if (!enabled) {
                return;
            }

            $timeout(function () {
                element[0].focus();
            }, 350);
        }
    }

    // Directive to open external links using inAppBrowser
    // Source: https://forum.ionicframework.com/t/how-to-opening-links-in-content-in-system-browser-instead-of-cordova-browser-wrapper/2427/10
    function uboExtLinkDirective() {
        var directive = {
            link: link,
            restrict: 'A',
            scope: '='  // isolate scope
        };
        return directive;

        function link(scope, element, attrs) {
            var url = '';

            attrs.$observe('href', function(value) {
                if (value) {
                    url = value;
                }
            });

            element.on('click',function(e){
                // console.log('Opening url:', url);
                e.preventDefault();
                if(attrs.ngClick){
                    scope.$eval(attrs.ngClick);
                }
                window.open(encodeURI(url), '_system');
            });
        }
    }

    // Directive to open map in default map app
    function uboGeoLinkDirective() {
        var directive = {
            link: link,
            restrict: 'A',
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
                    coords = lat + ',' + lng,
                    query;

                e.preventDefault();
                if(attrs.ngClick){
                    scope.$eval(attrs.ngClick);
                }
                if (ionic.Platform.isIOS()) {
                    query = 'sll=' + coords + '&q=' + q + '&z=17';
                    url = 'maps:?' + query;
                } else {
                    query = 'q=' + q + '&z=16';
                    url = 'geo:' + coords + '?' + query;
                }
                window.open(encodeURI(url), '_system');
            });
        }
    }

})();
