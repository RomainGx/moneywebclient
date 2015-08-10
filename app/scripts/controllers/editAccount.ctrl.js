(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('EditAccountCtrl', EditAccountCtrl);


  EditAccountCtrl.$inject = ['Accounts', '$routeParams'];
  function EditAccountCtrl(Accounts, $routeParams)
  {
    var vm = this;

    this.account = {};

    this.save = save;

    getAccount();


    function getAccount() {
      if ($routeParams.accountId) {
        vm.account = Accounts.get({accountId: $routeParams.accountId});
      }
      else {
        vm.account = new Accounts();
      }
    }

    function save() {
      Accounts.save(vm.account, function () {
        alert('ok');
        // TODO Save
      }, function () {
        alert('error');
        // TODO Error
      });
    }
  }
})();
