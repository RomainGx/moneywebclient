(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .factory('Accounts', Accounts);

  Accounts.$inject = ['$resource'];
  function Accounts($resource) {
    return $resource('http://localhost:9090/accounts/:accountId', {accountId: '@id'}, {
      update: {
        method: 'PUT'
      }
    });
  }
})();
