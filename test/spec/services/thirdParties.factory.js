'use strict';

describe('Service: thirdParties', function () {

  // load the service's module
  beforeEach(module('moneyWebClientApp'));

  // instantiate service
  var thirdParties;
  beforeEach(inject(function (_thirdParties_) {
    thirdParties = _thirdParties_;
  }));

  it('should do something', function () {
    expect(!!thirdParties).toBe(true);
  });

});
