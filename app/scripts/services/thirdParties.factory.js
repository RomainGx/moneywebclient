(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .factory('ThirdParties', ThirdParties);

  ThirdParties.$inject = ['$resource'];
  function ThirdParties($resource) {
    return $resource('http://localhost:9090/thirdParties/:thirdPartyId', {thirdPartyId: '@id'}, {
      update: {
        method: 'PUT'
      }
    });
  }
})();
