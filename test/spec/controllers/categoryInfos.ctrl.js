'use strict';

describe('Controller: CategoryinfosCtrl', function () {

  // load the controller's module
  beforeEach(module('moneyWebClientApp'));

  var CategoryinfosCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CategoryinfosCtrl = $controller('CategoryinfosCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(CategoryinfosCtrl.awesomeThings.length).toBe(3);
  });
});
