'use strict';

describe('Service: subcategories', function () {

  // load the service's module
  beforeEach(module('moneyWebClientApp'));

  // instantiate service
  var subcategories;
  beforeEach(inject(function (_subcategories_) {
    subcategories = _subcategories_;
  }));

  it('should do something', function () {
    expect(!!subcategories).toBe(true);
  });

});
