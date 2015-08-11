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

    /**
     * Sauvegarde tous les éléments consistutifs de l'opération bancaire en cours, puis
     * l'opération elle-même.
     */
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

    /**
     * Sauvegarde le tiers sélectionné pour la nouvelle opération sur le serveur.
     * Si le tiers existe déjà sur le serveur, alors il est simplement renvoyé.
     * @returns {Function|promise} Le tiers sauvegardé ou déjà existant.
     */
    function saveThirdParty() {
      var deferred = $q.defer();

      if (!thirdPartyExistsOnServer()) {
        var tmpThirdParty = {name: vm.currentBankOperation.thirdParty};

        ThirdParties.save(tmpThirdParty, function (thirdParty) {
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

    /**
     * Sauvegarde la catégorie sélectionnée pour la nouvelle opération sur le serveur.
     * Si la catégorie existe déjà sur le serveur, alors elle est simplement renvoyée.
     * @param {ThirdParty} thirdParty Le tiers sauvegardé précédemment.
     * @returns {Function|promise} La catégorie sauvegardée ou déjà existante.
     */
    function saveCategory(thirdParty) {
      var deferred = $q.defer();

      if (!categoryExistsOnServer()) {
        var tmpCategory = {name: vm.currentBankOperation.category, type: vm.currentBankOperation.type};

        Categories.Common.save(tmpCategory, function (category) {
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

    /**
     * Sauvegarde la sous-catégorie sélectionnée pour la nouvelle opération sur le serveur.
     * Si la sous-catégorie existe déjà sur le serveur, alors elle est simplement renvoyée.
     * @param {Category} category La catégorie sauvegardée précédemment.
     * @returns {Function|promise} La sous-catégorie sauvegardée ou déjà existante.
     */
    function saveSubCategory(category) {
      var deferred = $q.defer();

      if (!subCategoryExistsOnServer()) {
        var tmpSubCategory = {name: vm.currentBankOperation.subCategory, category: category};

        SubCategories.save(tmpSubCategory, function (subCategory) {
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

    /**
     * Sauvegarde la nouvelle opération bancaire sur le serveur.
     * @param {SubCategory} subCategory La sous-catégorie sauvegardée précédemment.
     * @returns {Function|promise} La nouvelle opération bancaire.
     */
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

    /**
     * Indique si la catégorie sélectionnée dans {@link AccountDetailsCtrl#currentBankOperation} existe
     * sur le serveur ou non.
     * @returns {boolean} true si la catégorie existe sur le serveur, false sinon.
     */
    function categoryExistsOnServer() {
      return !!vm.currentBankOperation.category.name;
    }

    /**
     * Indique si la sous-catégorie sélectionnée dans {@link AccountDetailsCtrl#currentBankOperation} existe
     * sur le serveur ou non.
     * @returns {boolean} true si la sous-catégorie existe sur le serveur, false sinon.
     */
    function subCategoryExistsOnServer() {
      return !!vm.currentBankOperation.subCategory.name;
    }

    /**
     * Indique si le tiers sélectionné dans {@link AccountDetailsCtrl#currentBankOperation} existe
     * sur le serveur ou non.
     * @returns {boolean} true si le tiers existe sur le serveur, false sinon.
     */
    function thirdPartyExistsOnServer() {
      return !!vm.currentBankOperation.thirdParty.name;
    }
  }
})();
