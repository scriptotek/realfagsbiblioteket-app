// To avoid polluting the global scope with our function declarations, we wrap
// everything inside an IIFE
(function() {

    // define the module that will hold all the factories we're gonna use
    angular.module('directives', [])
      .directive('uboIframeOnload', ['$parse', iframeOnloadDirective]);

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

})();
