// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('directives', [])
      .directive('uboIframeOnload', ['$parse', iframeOnloadDirective])
      .directive('uboHref', anchorDirective);

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
    function anchorDirective() {
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

})();
