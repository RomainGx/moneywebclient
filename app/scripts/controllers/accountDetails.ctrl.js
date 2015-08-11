(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('AccountDetailsCtrl', AccountDetailsCtrl);


  AccountDetailsCtrl.$inject = ['Accounts', 'BankOperations', 'Categories', 'SubCategories', 'ThirdParties', '$routeParams', '$q'];
  function AccountDetailsCtrl(Accounts, BankOperations, Categories, SubCategories, ThirdParties, $routeParams, $q)
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

    // TODO Gérer le cas où on sélectionne une catégorie (ou si on marque le nom d'une nouvelle) : on doit vider la sous-catégorie
    // (sauf si la catégorie sélectionnée est identique à celle précédemment sélectionnée)


    function addNewOperation(type) {
      vm.currentBankOperation = {
        account: vm.account,
        type: type,
        operationDate: moment().format('DD/MM/YYYY'),
        balanceState: "NOT_BALANCED"
      };

      if (type === 'CHARGE') {
        if (vm.chargeCategories && vm.chargeCategories.length > 0) {
          vm.currentBankOperation.category = vm.chargeCategories[0];
          if (vm.currentBankOperation.category.subCategories && vm.currentBankOperation.category.subCategories.length > 0) {
            vm.currentBankOperation.subCategory = vm.currentBankOperation.category.subCategories[0];
          }
          else {
            vm.currentBankOperation.subCategory = "";
          }
        }
        else {
          vm.currentBankOperation.category = "";
          vm.currentBankOperation.subCategory = "";
        }
      }
      else {
        if (vm.creditCategories && vm.creditCategories.length > 0) {
          vm.currentBankOperation.category = vm.creditCategories[0];
          if (vm.currentBankOperation.category.subCategories && vm.currentBankOperation.category.subCategories.length > 0) {
            vm.currentBankOperation.subCategory = vm.currentBankOperation.category.subCategories[0];
          }
          else {
            vm.currentBankOperation.subCategory = "";
          }
        }
        else {
          vm.currentBankOperation.category = "";
          vm.currentBankOperation.subCategory = "";
        }
      }
    }

    function onChargeTab() {
      if (vm.chargeCategories && vm.chargeCategories.length > 0) {
        vm.currentBankOperation.category = vm.chargeCategories[0];
        if (vm.currentBankOperation.category.subCategories && vm.currentBankOperation.category.subCategories.length > 0) {
          vm.currentBankOperation.subCategory = vm.currentBankOperation.category.subCategories[0];
        }
        else {
          vm.currentBankOperation.subCategory = "";
        }
      }
      else {
        vm.currentBankOperation.category = "";
        vm.currentBankOperation.subCategory = "";
      }
      vm.currentBankOperation.charge = vm.currentBankOperation.credit;
      delete vm.currentBankOperation.credit;
    }

    function onCreditTab() {
      if (vm.creditCategories && vm.creditCategories.length > 0) {
        vm.currentBankOperation.category = vm.creditCategories[0];
        if (vm.currentBankOperation.category.subCategories && vm.currentBankOperation.category.subCategories.length > 0) {
          vm.currentBankOperation.subCategory = vm.currentBankOperation.category.subCategories[0];
        }
        else {
          vm.currentBankOperation.subCategory = "";
        }
      }
      else {
        vm.currentBankOperation.category = "";
        vm.currentBankOperation.subCategory = "";
      }
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

      // TODO Check si existe dans categories (+subcategory)

      saveThirdParty()
        .then(saveCategory)
        .then(saveSubCategory)
        .then(saveBankOperation)
        .catch(function(handleReject) {
          alert('error ' + handleReject);
        });
    }

    function saveThirdParty() {
      var deferred = $q.defer();

      if (!vm.currentBankOperation.thirdParty.name) {
        vm.currentBankOperation.thirdParty = {name: vm.currentBankOperation.thirdParty};

        ThirdParties.save(vm.currentBankOperation.thirdParty, function (thirdParty) {
          vm.currentBankOperation.thirdParty = thirdParty;
          deferred.resolve(thirdParty);
        }, function () {
          deferred.reject('Failed saving third party');
        });
      }
      else {
        deferred.resolve(vm.currentBankOperation.thirdParty);
      }

      return deferred.promise;
    }

    function saveCategory(thirdParty) {
      var deferred = $q.defer();

      if (!vm.currentBankOperation.category.name) {
        vm.currentBankOperation.category = {name: vm.currentBankOperation.category, type: vm.currentBankOperation.type};

        Categories.Common.save(vm.currentBankOperation.category, function (category) {
          vm.currentBankOperation.category = category;

          if (vm.currentBankOperation.category.type == 'CHARGE') {
            vm.chargeCategories.push(category);
          }
          else {
            vm.creditCategories.push(category);
          }
          deferred.resolve(category);
        }, function () {
          deferred.reject('Failed saving category');
        });
      }
      else {
        deferred.resolve(vm.currentBankOperation.category);
      }

      return deferred.promise;
    }

    function saveSubCategory(category) {
      var deferred = $q.defer();

      if (!vm.currentBankOperation.subCategory.name) {
        vm.currentBankOperation.subCategory = {name: vm.currentBankOperation.subCategory, category: category};

        SubCategories.save(vm.currentBankOperation.subCategory, function (subCategory) {
          vm.currentBankOperation.subCategory = subCategory;
          category.subCategories.push(subCategory);

          deferred.resolve(subCategory);
        }, function () {
          deferred.reject('Failed saving subcategory');
        });
      }
      else {
        deferred.resolve(vm.currentBankOperation.subCategory);
      }

      return deferred.promise;
    }

    function saveBankOperation(subCategory) {
      var deferred = $q.defer();

      BankOperations.save({accountId: vm.account.id}, vm.currentBankOperation, function (bankOperation) {
        vm.bankOperations.push(bankOperation);
        deferred.resolve(bankOperation);
      }, function () {
        deferred.reject('Failed saving bank operation');
      });

      return deferred.promise;
    }
  }
})();
