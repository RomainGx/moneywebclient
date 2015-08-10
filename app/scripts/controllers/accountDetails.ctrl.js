(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('AccountDetailsCtrl', AccountDetailsCtrl);


  AccountDetailsCtrl.$inject = ['Accounts', 'BankOperations', 'Categories', 'ThirdParties', '$routeParams'];
  function AccountDetailsCtrl(Accounts, BankOperations, Categories, ThirdParties, $routeParams)
  {
    var vm = this;

    this.currentBankOperation = {};
    this.account = Accounts.get({accountId: $routeParams.accountId});
    this.bankOperations = BankOperations.query({accountId: $routeParams.accountId});
    this.thirdParties = ThirdParties.query();
    this.chargeCategories = Categories.Charge.query();
    this.creditCategories = Categories.Credit.query();

    this.addNewOperation = addNewOperation;
    this.onChargeTab = onChargeTab;
    this.onCreditTab = onCreditTab;
    this.save = save;
    this.saveBankOperation = saveBankOperation;
    this.saveThirdParty = saveThirdParty;


    function addNewOperation(type) {
      var today = new Date();

      vm.currentBankOperation = {
        account: vm.account,
        type: type,
        operationDate: moment().format('DD/MM/YYYY'),
        balanceState: {id: 0}
      };
    }

    function onChargeTab() {
      vm.currentBankOperation.category = {};
      vm.currentBankOperation.charge = vm.currentBankOperation.credit;
      delete vm.currentBankOperation.credit;
    }

    function onCreditTab() {
      vm.currentBankOperation.category = {};
      vm.currentBankOperation.credit = vm.currentBankOperation.charge;
      delete vm.currentBankOperation.charge;
    }

    function save() {
      // TODO Check si existe dans thirdParties
      if (!vm.currentBankOperation.thirdParty.name) {
        for (var i=0 ; i < vm.thirdParties.length ; i++) {
          if (vm.thirdParties[i].name === vm.currentBankOperation.thirdParty) {
            vm.currentBankOperation.thirdParty = vm.thirdParties[i];
            break;
          }
        }
      }

      if (vm.currentBankOperation.thirdParty.name) {
        vm.saveBankOperation();
      }
      else {
        vm.saveThirdParty();
      }
    }

    function saveBankOperation() {
      BankOperations.save({accountId: vm.account.id}, vm.currentBankOperation, function () {
        alert('ok bank op');
      }, function () {
        alert('error bank op');
      });
    }

    function saveThirdParty() {
      vm.currentBankOperation.thirdParty = {name: vm.currentBankOperation.thirdParty};

      ThirdParties.save(vm.currentBankOperation.thirdParty, function (data) {
        alert('ok TP');

        vm.currentBankOperation.thirdParty = data;
        saveBankOperation();
      }, function () {
        alert('error TP');
      });
    }
  }
})();
