(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('AccountDetailsCtrl', AccountDetailsCtrl);


  AccountDetailsCtrl.$inject = ['Accounts', 'BankOperations', 'Categories', 'SubCategories', 'ThirdParties', 'ngTableParams', '$routeParams', '$filter', '$q', '$scope'];
  function AccountDetailsCtrl(Accounts, BankOperations, Categories, SubCategories, ThirdParties, ngTableParams, $routeParams, $filter, $q, $scope)
  {
    var vm = this;

    this.tableParams = null;
    this.categoryUnwatcher = null;
    this.filterUnwatcher = null;
    this.today = moment().unix() * 1000;
    this.totalNumOperations = 0;

    this.currentBankOperation = {};
    this.account = Accounts.get({accountId: $routeParams.accountId});
    this.bankOperations = [];
    this.thirdParties = ThirdParties.query();
    this.chargeCategories = Categories.Charge.query();
    this.creditCategories = Categories.Credit.query();

    this.addNewOperation = addNewOperation;
    this.onChargeTab = onChargeTab;
    this.onCreditTab = onCreditTab;
    this.save = save;
    this.saveBankOperation = saveBankOperation;
    this.saveThirdParty = saveThirdParty;
    this.editOperation = editOperation;
    this.handleDateChangeByKeyboard = handleDateChangeByKeyboard;
    this.watchFilter = watchFilter;
    this.unwatchFilter = unwatchFilter;


    configTableParams();


    /**
     * Configure ng-table pour l'affichage des opérations bancaires.
     */
    function configTableParams() {
      vm.tableParams = new ngTableParams({
        page: 1,
        sorting: {
          operationDate: 'asc'
        }
      }, {
        counts: [],
        defaultSort: 'asc',
        getData: function($defer, params) {
          vm.bankOperations = BankOperations.query({accountId: $routeParams.accountId}, function() {
            computeReadableDatesOnBankOperations();
            computeBalanceOnBankOperations();

            vm.totalNumOperations = vm.bankOperations.length;

            var orderBy = getOrderBy(params);
            vm.bankOperations = params.sorting() ? $filter('orderBy')(vm.bankOperations, orderBy) : vm.bankOperations;

            if (vm.search) {
              vm.search = vm.search.toLowerCase();
              vm.bankOperations = $filter('filter')(vm.bankOperations, searchFilter);
            }

            $defer.resolve(vm.bankOperations);
            //$defer.resolve(vm.bankOperations.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          });
        }
      });
    }

    /**
     * Filtre une opération bancaire en fonction de la saisie de l'utilisateur dans le champ Recherche.
     * @param {BankOperation} bankOperation Opération pour laquelle déterminer si elle passe le filtre.
     * @param {number} index Index de l'opération dans le tableau.
     * @param {BankOperation[]} bankOperations Liste des opérations bancaires.
     * @returns {string|boolean|*|ThirdParty}
     */
    function searchFilter(bankOperation, index, bankOperations) {
      return ((bankOperation.bankNoteNum && bankOperation.bankNoteNum.toLowerCase().indexOf(vm.search) > -1) ||
        (bankOperation.operationDateHuman && bankOperation.operationDateHuman.toLowerCase().indexOf(vm.search) > -1) ||
        (bankOperation.thirdParty && bankOperation.thirdParty.name && bankOperation.thirdParty.name.toLowerCase().indexOf(vm.search) > -1));
    }

    /**
     * Paramètre la clause order by en fonction du choix de l'utilisateur.
     * Si les opérations sont triées sur un autre élément que la date, alors on ajoute 2 critères de tri secondaires :
     * la date et l'ID.
     * @param {object} params Paramètres fournis par ng-table, qui contiennent la clause orderBy.
     * @returns {*[]} Clause orderBy à utiliser.
     */
    function getOrderBy(params) {
      var orderBy = [params.orderBy()[0]];

      if (orderBy[0] === '-operationDate') {
        orderBy.push('-id');
      }
      else if (orderBy[0] === '+operationDate') {
        orderBy.push('+id');
      }
      else {
        orderBy.push('+operationDate');
        orderBy.push('+id');
      }

      return orderBy;
    }

    /**
     * Ajoute, pour chaque opération, la date dans un format lisible par un humain et par le filtre
     * de recherche.
     */
    function computeReadableDatesOnBankOperations() {
      for (var i=0 ; i < vm.bankOperations.length ; i++) {
        vm.bankOperations[i].operationDateHuman = moment.unix(vm.bankOperations[i].operationDate / 1000).format('DD/MM/YYYY');
      }
    }

    /**
     * Calcule, pour chaque opération, le solde associé.
     * Ce calcul est lié à l'ordre dans lequel les opérations sont triées.
     */
    function computeBalanceOnBankOperations() {
      var balance = vm.account.startingBalance;
      var currentBalance = 0;

      for (var i=0 ; i < vm.bankOperations.length ; i++) {
        balance += vm.bankOperations[i].credit;
        balance -= vm.bankOperations[i].charge;
        vm.bankOperations[i].balance = balance;

        if (vm.bankOperations[i].operationDate <= vm.today) {
          currentBalance = balance;
        }
      }

      vm.account.currentBalance = currentBalance;
    }

    /**
     * Prépare le modèle pour la saisie d'une nouvelle opération.
     * @param type Type d'opération à saisir (débit ou crédit).
     */
    function addNewOperation(type) {
      vm.currentBankOperation = {
        account: vm.account,
        type: type,
        operationDate: moment().format('DD/MM/YYYY'),
        balanceState: "NOT_BALANCED"
      };

      if (type === 'CHARGE') {
        selectFirstAvailableChargeCategories();
      }
      else {
        selectFirstAvailableCreditCategories();
      }

      watchCategoryValue();
    }

    function onChargeTab() {
      vm.currentBankOperation.charge = vm.currentBankOperation.credit;
      delete vm.currentBankOperation.credit;
      vm.currentBankOperation.category = "";
      vm.currentBankOperation.subCategory = "";
    }

    function onCreditTab() {
      vm.currentBankOperation.credit = vm.currentBankOperation.charge;
      delete vm.currentBankOperation.charge;
      vm.currentBankOperation.category = "";
      vm.currentBankOperation.subCategory = "";
    }

    /**
     * Sauvegarde tous les éléments consistutifs de l'opération bancaire en cours, puis
     * l'opération elle-même.
     */
    function save() {
      unwatchCategoryValue();

      selectExistingThirdPartyIfExists();
      selectExistingCategoryIfExists();
      selectExistingSubCategoryIfExists();

      saveThirdParty()
        .then(saveCategory)
        .then(saveSubCategory)
        .then(saveBankOperation)
        .catch(function(handleReject) {
          alert('error ' + handleReject);
        });
    }

    /**
     * Cette méthode vérifie si l'utilisateur a entré le nom d'un tiers sans le sélectionner via l'autocomplete.
     * Dans ce cas, il cherche si le tiers existe déjà sur le serveur (ie. existe dans {@link AccountDetailsCtrl#thirdParties}).
     */
    function selectExistingThirdPartyIfExists() {
      if (vm.currentBankOperation.thirdParty && !thirdPartyExistsOnServer()) {
        for (var i=0 ; i < vm.thirdParties.length ; i++) {
          if (vm.thirdParties[i].name === vm.currentBankOperation.thirdParty) {
            vm.currentBankOperation.thirdParty = vm.thirdParties[i];
            break;
          }
        }
      }
    }

    /**
     * Cette méthode vérifie si l'utilisateur a entré le nom d'une catégorie sans la sélectionner via l'autocomplete.
     * Dans ce cas, il cherche si la catégorie existe déjà sur le serveur (ie. existe dans {@link AccountDetailsCtrl#chargeCategories}
     * ou {@link AccountDetailsCtrl#creditCategories} selon le type d'opération).
     */
    function selectExistingCategoryIfExists() {
      if (vm.currentBankOperation.category && !categoryExistsOnServer()) {
        var categories = vm.currentBankOperation.type === 'CHARGE' ? vm.chargeCategories : vm.creditCategories;

        for (var i=0 ; i < categories.length ; i++) {
          if (categories[i].name === vm.currentBankOperation.category) {
            vm.currentBankOperation.category = categories[i];
            break;
          }
        }
      }
    }

    /**
     * Cette méthode vérifie si l'utilisateur a entré le nom d'une sous-catégorie sans la sélectionner via l'autocomplete.
     * Dans ce cas, il cherche si la sous-catégorie existe déjà sur le serveur (ie. existe parmi les sous-catégories de
     * {@link AccountDetailsCtrl#chargeCategories} ou de {@link AccountDetailsCtrl#creditCategories} selon le type d'opération).
     */
    function selectExistingSubCategoryIfExists() {
      if (vm.currentBankOperation.subCategory && !subCategoryExistsOnServer()) {
        var categories = vm.currentBankOperation.type === 'CHARGE' ? vm.chargeCategories : vm.creditCategories;

        for (var i=0 ; i < categories.subCategories.length ; i++) {
          if (categories.subCategories[i].name === vm.currentBankOperation.subCategory) {
            vm.currentBankOperation.subCategory = categories.subCategories[i];
            break;
          }
        }
      }
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
     *
     * @param {BankOperation} operation Opération à modifier.
     */
    function editOperation(operation) {
      vm.currentBankOperation = operation;
      vm.currentBankOperation.operationDate = moment.unix(operation.operationDate / 1000).format('DD/MM/YYYY');
    }

    /**
     * Ajoute ou retire un jour à la date en appuyant sur les touches '+' ou '-' du clavier.
     * Le modèle n'est pas mis à jour avec le caractère '+' ou '*', car la méthode appelle event.preventDefault().
     * @param event Evénement déclencheur, qui contient le code de la touche tapée.
     * @returns {boolean} false pour empêcher la saisie du '+' ou du '-'
     */
    function handleDateChangeByKeyboard(event) {
      var code = event.which ? event.which : event.keyCode;

      if (code === 43 || code == 61) {
        vm.currentBankOperation.operationDate = moment(vm.currentBankOperation.operationDate, 'DD/MM/YYYY').add('1', 'day').format('DD/MM/YYYY');
        event.preventDefault();
        return false;
      }
      else if (code === 45 || code == 54) {
        vm.currentBankOperation.operationDate = moment(vm.currentBankOperation.operationDate, 'DD/MM/YYYY').add('-1', 'day').format('DD/MM/YYYY');
        event.preventDefault();
        return false;
      }
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

    function selectFirstAvailableChargeCategories() {
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

    function selectFirstAvailableCreditCategories() {
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

    /**
     * Scrute la valeur de la catégorie afin de reseter la sous-catégorie si on supprime la catégorie.
     */
    function watchCategoryValue() {
      vm.categoryUnwatcher = $scope.$watch('AccountDetailsCtrl.currentBankOperation.category', function(current, original) {
        if (!current) {
          vm.currentBankOperation.subCategory = "";
        }
      });
    }

    /**
     * Annule la scrutation de la catégorie.
     */
    function unwatchCategoryValue() {
      if (vm.categoryUnwatcher) {
        vm.categoryUnwatcher();
        vm.categoryUnwatcher = null;
      }
    }

    /**
     * Scrute la valeur du filtre de recherche afin de mettre à jour les opérations bancaires affichées.
     */
    function watchFilter() {
      vm.filterUnwatcher = $scope.$watch("AccountDetailsCtrl.search", function () {
        vm.tableParams.reload();
      });
    }

    /**
     * Annule la scrutation du filtre de recherche.
     */
    function unwatchFilter() {
      if (vm.filterUnwatcher) {
        vm.filterUnwatcher();
        vm.filterUnwatcher = null;
      }
    }
  }
})();
