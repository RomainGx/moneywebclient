'use strict';

describe('Controller: AnalysisBalanceevolutionCtrl', function () {

  // load the controller's module
  beforeEach(module('moneyWebClientApp'));

  var AnalysisBalanceevolutionCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    AnalysisBalanceevolutionCtrl = $controller('AnalysisBalanceevolutionCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(AnalysisBalanceevolutionCtrl.awesomeThings.length).toBe(3);
  });
});
