(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .factory('Categories', Categories);

  Categories.$inject = ['$resource'];
  function Categories($resource) {
    return {
      Charge: $resource('http://localhost:9090/chargeCategories/:categoryId', {categoryId: '@id'}, {
        update: {
          method: 'PUT'
        }
      }),
      Credit: $resource('http://localhost:9090/creditCategories/:categoryId', {categoryId: '@id'}, {
        update: {
          method: 'PUT'
        }
      })
    };
  }
})();
