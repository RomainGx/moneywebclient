'use strict';

describe('Service: accountsSrc', function () {

  // load the service's module
  beforeEach(module('moneyWebClientApp'));

  // instantiate service
  var accountsSrc;
  beforeEach(inject(function (_accountsSrc_) {
    accountsSrc = _accountsSrc_;
  }));

  it('should do something', function () {
    expect(!!accountsSrc).toBe(true);
  });

});
