(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('AccountsCtrl', AccountsCtrl);


  AccountsCtrl.$inject = ['Accounts'];
  function AccountsCtrl(Accounts)
  {
    var vm = this;

    this.accounts = Accounts.query();
  }
})();
