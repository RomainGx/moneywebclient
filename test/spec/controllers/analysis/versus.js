'use strict';

describe('Controller: AnalysisVersusCtrl', function () {

  // load the controller's module
  beforeEach(module('moneyWebClientApp'));

  var AnalysisVersusCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    AnalysisVersusCtrl = $controller('AnalysisVersusCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(AnalysisVersusCtrl.awesomeThings.length).toBe(3);
  });
});
