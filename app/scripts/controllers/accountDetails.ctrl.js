(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('AccountDetailsCtrl', AccountDetailsCtrl);


  AccountDetailsCtrl.$inject = ['Accounts', 'BankOperations', 'Categories', 'SubCategories', 'ThirdParties', 'Utils', 'ngTableParams', '$routeParams', '$filter', '$q', '$scope', '$timeout'];
  function AccountDetailsCtrl(Accounts, BankOperations, Categories, SubCategories, ThirdParties, Utils, ngTableParams, $routeParams, $filter, $q, $scope, $timeout)
  {
    var vm = this;

    /** Fonction permettant d'annuler le watch sur la catégorie de {@link currentBankOperation}. */
    this.categoryUnwatcher = null;
    /** Fonction permettant d'annuler le watch sur le filtre de recherche des opérations. */
    this.filterUnwatcher = null;
    /**
     * @type {boolean}
     * true si l'onglet actif est l'onglet "Charge"
     */
    vm.chargeTab = true;
    /**
     * @type {boolean}
     * true si l'onglet actif est l'onglet "Crédit"
     */
    vm.creditTab = false;
    /** Paramètres utilisés par ng-table pour la liste des opérations. */
    vm.tableParams = null;
    /**
     * @type {number}
     * Timestamp courant en ms
     */
    vm.today = moment().unix() * 1000;
    /**
     * @type {number}
     * Nombre total d'opérations bancaires contenues dans {@link bankOperations}, avant filtrage.
     */
    vm.totalNumOperations = 0;

    /**
     * @type {BankOperation}
     * Opération à visualiser ou à éditer.
     */
    vm.currentBankOperation = { type: 'CHARGE', category: '' };
    /**
     * @type {boolean}
     * true si l'utilisateur a accès au formulaire pour créer un nouvelle opération ou en modifier une existante.
     */
    vm.isEditing = false;
    /**
     * @type {boolean}
     * true si une opération bancaire a été sélectionnée par l'utilisateur, et est affichée dans le formulaire.
     */
    vm.operationSelected = false;
    /**
     * @type {Account}
     * Compte auquel sont rattachées toutes les opérations bancaires.
     */
    vm.account = Accounts.get({accountId: $routeParams.accountId});
    /**
     * @type {Array}
     * Liste des opérations bancaires liées au compte {@link account}
     */
    vm.bankOperations = BankOperations.query({accountId: $routeParams.accountId}, function() {
      configTableParams();
    });
    /**
     * @type {Array}
     * Liste des tiers.
     */
    vm.thirdParties = ThirdParties.query();
    /**
     * @type {Array}
     * Liste des catégories de débit.
     */
    vm.chargeCategories = Categories.Charge.query();
    /**
     * @type {Array}
     * Liste des catégories de crédit.
     */
    vm.creditCategories = Categories.Credit.query();

    vm.addNewOperation = addNewOperation;
    vm.cancelEditing = cancelEditing;
    vm.onChargeTab = onChargeTab;
    vm.onCreditTab = onCreditTab;
    vm.selectOperation = selectOperation;
    vm.editCurrentOperation = editCurrentOperation;
    vm.handleDateChangeByKeyboard = handleDateChangeByKeyboard;
    vm.save = save;
    vm.watchFilter = watchFilter;
    vm.unwatchFilter = unwatchFilter;
    vm.onTypeaheadFocus = onTypeaheadFocus;
    vm.typeaheadStateComparator = typeaheadStateComparator;


    scrollToEndOfTableWhenRendered();


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
          computeReadableDatesOnBankOperations();
          computeBalanceOnBankOperations();

          vm.totalNumOperations = vm.bankOperations.length;

          var orderBy = getOrderBy(params);
          var filteredOperations = [];
          filteredOperations = params.sorting() ? $filter('orderBy')(vm.bankOperations, orderBy) : vm.bankOperations;

          if (vm.search) {
            vm.search = vm.search.toLowerCase();
            filteredOperations = $filter('filter')(filteredOperations, searchFilter);
          }

          $defer.resolve(filteredOperations);
          //$defer.resolve(vm.bankOperations.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
      });
    }

    //noinspection JSUnusedLocalSymbols
    /**
     * Filtre une opération bancaire en fonction de la saisie de l'utilisateur dans le champ Recherche.
     * @param {BankOperation} bankOperation Opération pour laquelle déterminer si elle passe le filtre.
     * @param {number} index Index de l'opération dans le tableau.
     * @param {BankOperation[]} bankOperations Liste des opérations bancaires.
     * @returns {boolean} true si bankOperation passe le filtre, false sinon.
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
        vm.bankOperations[i].operationDateHuman = Utils.getHumanDateFromUnixTimestamp(vm.bankOperations[i].operationDate);
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

      watchCategoryValue();
      vm.isEditing = true;
      vm.operationSelected = false;
    }

    function cancelEditing() {
      vm.isEditing = false;
      vm.operationSelected = false;
    }

    function onChargeTab() {
      var oldCredit, oldThirdParty, oldNotes, copyOldFields = false;

      if (!vm.operationSelected) {
        oldCredit = vm.currentBankOperation.credit;
        oldThirdParty = vm.currentBankOperation.thirdParty;
        oldNotes = vm.currentBankOperation.notes;
        copyOldFields = true;
      }

      addNewOperation('CHARGE');

      if (copyOldFields === true) {
        vm.currentBankOperation.charge = oldCredit;
        vm.currentBankOperation.thirdParty = oldThirdParty;
        vm.currentBankOperation.notes = oldNotes;
      }

      vm.chargeTab = true;
    }

    function onCreditTab() {
      var oldCharge, oldThirdParty, oldNotes, copyOldFields = false;

      if (!vm.operationSelected) {
        oldCharge = vm.currentBankOperation.charge;
        oldThirdParty = vm.currentBankOperation.thirdParty;
        oldNotes = vm.currentBankOperation.notes;
        copyOldFields = true;
      }

      addNewOperation('CREDIT');

      if (copyOldFields === true) {
        vm.currentBankOperation.charge = oldCharge;
        vm.currentBankOperation.thirdParty = oldThirdParty;
        vm.currentBankOperation.notes = oldNotes;
      }

      vm.creditTab = true;
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
        .then(function () {
          vm.isEditing = false;
          vm.operationSelected = false;
        })
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

    //noinspection JSUnusedLocalSymbols
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

      if (vm.currentBankOperation.subCategory && !subCategoryExistsOnServer()) {
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

    //noinspection JSUnusedLocalSymbols
    /**
     * Sauvegarde la nouvelle opération bancaire sur le serveur.
     * @param {SubCategory} subCategory La sous-catégorie sauvegardée précédemment.
     * @returns {Function|promise} La nouvelle opération bancaire.
     */
    function saveBankOperation(subCategory) {
      var deferred = $q.defer();

      if (vm.currentBankOperation.id) {
        BankOperations.update({accountId: vm.account.id, operationId: vm.currentBankOperation.id}, vm.currentBankOperation, function (bankOperation) {
          var oldBankOperationIdx = Utils.getPositionInArray(vm.bankOperations, bankOperation.id);
          if (oldBankOperationIdx > -1) {
            bankOperation.operationDateHuman = Utils.getHumanDateFromUnixTimestamp(bankOperation.operationDate);
            vm.bankOperations[oldBankOperationIdx] = bankOperation;
            vm.account = bankOperation.account;

            vm.tableParams.reload();
          }

          deferred.resolve(bankOperation);
        }, function () {
          deferred.reject('Failed updating bank operation');
        });
      }
      else {
        BankOperations.save({accountId: vm.account.id}, vm.currentBankOperation, function (bankOperation) {
          vm.bankOperations.push(bankOperation);
          vm.tableParams.reload();

          deferred.resolve(bankOperation);
        }, function () {
          deferred.reject('Failed saving bank operation');
        });
      }

      return deferred.promise;
    }

    /**
     * Sélectionne une opération et l'affiche dans la zone d'édition.
     * @param {BankOperation} operation Opération à afficher dans la zone d'édition.
     */
    function selectOperation(operation) {
      vm.chargeTab = operation.category.type === 'CHARGE';
      vm.creditTab = operation.category.type === 'CREDIT';

      angular.copy(operation, vm.currentBankOperation);
      vm.currentBankOperation.type = operation.category.type;
      vm.currentBankOperation.operationDate = Utils.getHumanDateFromUnixTimestamp(operation.operationDate);
      vm.operationSelected = true;
    }

    function editCurrentOperation() {
      vm.isEditing = true;
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

    /**
     * Scrute la valeur de la catégorie afin de reseter la sous-catégorie si on supprime la catégorie.
     */
    function watchCategoryValue() {
      //noinspection JSUnusedLocalSymbols
      vm.categoryUnwatcher = $scope.$watch('AccountDetailsCtrl.currentBankOperation.category', function(current, original) {
        if (!current) {
          delete vm.currentBankOperation.subCategory;
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

    function scrollToEndOfTableWhenRendered() {
      $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
        var operationsList = $('#operationsList');
        operationsList.animate({scrollTop: operationsList.get(0).scrollHeight});
      });
    }

    function onTypeaheadFocus(event) {
      $timeout(function () {
        $(event.target).trigger('input');
        $(event.target).trigger('change'); // for IE
      });
    }

    function typeaheadStateComparator(state, viewValue) {
      return viewValue === '[$empty$]' || (''+state).toLowerCase().indexOf((''+viewValue).toLowerCase()) > -1;
    }
  }
})();
