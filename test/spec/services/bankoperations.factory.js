'use strict';

describe('Service: bankOperationsSrc', function () {

  // load the service's module
  beforeEach(module('moneyWebClientApp'));

  // instantiate service
  var BankOperationsSrc;
  beforeEach(inject(function (_BankOperationsSrc_) {
    BankOperationsSrc = _BankOperationsSrc_;
  }));

  it('should do something', function () {
    expect(!!BankOperationsSrc).toBe(true);
  });

});
