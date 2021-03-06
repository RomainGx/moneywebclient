(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .factory('BankOperations', BankOperations);

  BankOperations.$inject = ['$resource'];
  function BankOperations($resource) {
    return $resource('http://localhost:9090/accounts/:accountId/bankOperations/:operationId', {}, {
      update: {
        method: 'PUT'
      }
    });
  }
})();
