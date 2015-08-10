'use strict';

describe('Controller: AccountDetailsCtrl', function () {

  // load the controller's module
  beforeEach(module('moneyWebClientApp'));

  var AccountDetailsCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    AccountDetailsCtrl = $controller('AccountDetailsCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(AccountDetailsCtrl.awesomeThings.length).toBe(3);
  });
});
