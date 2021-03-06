'use strict';

describe('Controller: AnalysisCalendarCtrl', function () {

  // load the controller's module
  beforeEach(module('moneyWebClientApp'));

  var AnalysisCalendarCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    AnalysisCalendarCtrl = $controller('AnalysisCalendarCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(AnalysisCalendarCtrl.awesomeThings.length).toBe(3);
  });
});
