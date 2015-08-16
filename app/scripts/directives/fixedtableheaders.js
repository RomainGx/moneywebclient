(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .directive('fixedTableHeaders', fixedTableHeaders);

  fixedTableHeaders.$inject = ['$timeout'];
  function fixedTableHeaders($timeout) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        $timeout(function() {
          var container = element.parentsUntil(attrs.fixedTableHeaders);
          element.stickyTableHeaders({ scrollableArea: container });
        }, 0);
      }
    };
  }
})();
