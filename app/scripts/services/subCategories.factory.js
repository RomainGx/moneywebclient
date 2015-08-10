(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .factory('SubCategories', SubCategories);

  SubCategories.$inject = ['$resource'];
  function SubCategories($resource) {
    return $resource('http://localhost:9090/subCategories/:subCategoryId', {subCategoryId: '@id'}, {
      update: {
        method: 'PUT'
      }
    });
  }
})();
