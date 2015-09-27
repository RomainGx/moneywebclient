(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .filter('percentage', percentage);

  percentage.$inject = ['$filter'];
  /** Source : https://gist.github.com/jeffjohnson9046/9470800 */
  function percentage($filter) {
    return function (input, decimals) {
      return $filter('number')(input * 100, decimals) + '%';
    };
  }
})();
