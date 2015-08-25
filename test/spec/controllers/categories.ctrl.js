'use strict';

describe('Controller: CategoriesCtrlCtrl', function () {

  // load the controller's module
  beforeEach(module('moneyWebClientApp'));

  var CategoriesCtrlCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CategoriesCtrlCtrl = $controller('CategoriesCtrlCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(CategoriesCtrlCtrl.awesomeThings.length).toBe(3);
  });
});
