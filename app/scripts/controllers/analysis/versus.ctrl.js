(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('VersusAnalysisCtrl', VersusAnalysisCtrl);


  VersusAnalysisCtrl.$inject = ['Accounts', 'BankOperations', 'Categories', 'Utils', '$q'];
  function VersusAnalysisCtrl(Accounts, BankOperations, Categories, Utils, $q)
  {
    var vm = this;

    /** Operations bancaires du compte. */
    this.bankOperations = [];
    /** Liste des categories de debit. */
    vm.chargeCategories = Categories.Charge.query();
    /** Liste des categories de credit. */
    vm.creditCategories = Categories.Credit.query();
    /** Etat des cases a cocher des categories (charges et credits confondus) */
    vm.checkedCategories = {};
    /** Etat des cases a cocher des sous-categories (charges et credits confondus) */
    vm.checkedSubCategories = {};
    /** Etat des cases a cocher des sous-categories 'Aucune sous-categorie' (charges et credits confondus) */
    vm.checkedUnSubcategorised = {};
    /** Debut de la periode sur laquelle effectuer le rendu et les calculs. */
    vm.startPeriod = moment().startOf('month').toDate();
    /** Fin de la periode sur laquelle effectuer le rendu et les calculs. */
    vm.endPeriod = moment().toDate();
    /** Montant total des charges pour les categories selectionnees. */
    vm.chargesAmount = 0;
    /** Montant total des credits pour les categories selectionnees. */
    vm.creditsAmount = 0;
    /** Montants par categories. */
    vm.categoryAmounts = {};
    /** Montants par sous-categories. */
    vm.subCategoryAmounts = {};

    /** Comptes selectionnes et sur lesquels effectuer les calculs */
    vm.selectedAccounts = [];
    /** Liste des comptes */
    vm.accounts = [];
    /** Configuration du graphique. */
    vm.chartConfig = undefined;

    /** Etat de la case a cocher globale 'Credits' */
    vm.displayAllCredits;
    /** Etat de la case a cocher globale 'Charges' */
    vm.displayAllCharges;

    vm.onAccountChanged = onAccountChanged;
    vm.onCategoryChange = onCategoryChange;
    vm.onSubCategoryChange = onSubCategoryChange;
    vm.onUnSubcategorisedChange = onUnSubcategorisedChange;
    vm.onGlobalCheckboxClick = onGlobalCheckboxClick;
    vm.getBalance = getBalance;
    vm.getBalanceRate = getBalanceRate;
    vm.updateStartingPeriod = updateStartingPeriod;
    vm.updateEndingPeriod = updateEndingPeriod;
    vm.updateChart = updateChart;
    vm.getCategoryAmount = getCategoryAmount;
    vm.getCategoryAmountRate = getCategoryAmountRate;
    vm.getSubCategoryAmount = getSubCategoryAmount;
    vm.getSubCategoryAmountRate = getSubCategoryAmountRate;


    loadAccounts();


    /**
     * Charge la liste des comptes disponibles.
     */
    function loadAccounts() {
      vm.accounts = Accounts.query(function (accounts) {
        if (accounts.length > 0) {
          vm.selectedAccounts = [vm.accounts[0]];
          onAccountChanged();
        }
      });
    }

    /**
     * Methode appelee lorsque l'utilisateur change de compte.
     * Charge les operations bancaires du compte puis met a jour le graphe.
     */
    function onAccountChanged() {
      loadBankOperations().then(function () {
        var event = {
          target: {
            checked: true
          }
        };
        onGlobalCheckboxClick(event, false);
        onGlobalCheckboxClick(event, true);
      });
    }

    /**
     * Met a jour toutes les categories du type concerne (credit ou charge).
     * @param {Event} event Evenement cree lors du clic sur la checkbox.
     * @param {Boolean} isCharge true si la checkbox est celle des charges, false si c'est celle des credits.
     */
    function onGlobalCheckboxClick(event, isCharge) {
      var i, isChecked = event.target.checked,
        categories = Utils.isValidEquals(isCharge, true) ? vm.chargeCategories : vm.creditCategories,
        numCategories = categories.length;

      for (i=0 ; i < numCategories ; i++) {
        vm.checkedCategories[categories[i].id] = isChecked;
        onCategoryChange(event, categories[i], i === numCategories - 1);
      }
    }

    /**
     * Selectionne ou deselectionne une categorie dans les operations.
     * @param {Event} event Evenement cree lors du clic sur la checkbox.
     * @param {Category} category Categorie cliquee.
     * @param {Boolean} refreshChart true si le graphe doit etre mis a jour, false sinon.
     */
    function onCategoryChange(event, category, refreshChart) {
      var i, operation, isCharge = Utils.isValidEquals(category.type, 'CHARGE'), isChecked = event.target.checked;

      // Mise a jour des checkboxes des sous-categories
      for (i=0 ; i < category.subCategories.length ; i++) {
        vm.checkedSubCategories[category.subCategories[i].id] = isChecked;
      }
      vm.checkedUnSubcategorised[category.id] = isChecked;

      // Mise a jour des operations (categorie checkee ou non, sous-categorie decheckee)
      for (i=0 ; i < vm.bankOperations.length ; i++) {
        operation = vm.bankOperations[i];

        if (operation.category.id === category.id) {
          operation.category.checked = isChecked;

          if (Utils.isValid(operation.subCategory)) {
            operation.subCategory.checked = false;
          }
        }
      }

      if (!isChecked) {
        setDisplayAllState(isCharge, false);
      }
      else {
        updateGlobalCheckbox(isCharge);
      }

      if (!Utils.isValid(refreshChart) || refreshChart === true) {
        updateChart();
      }
    }

    /**
     * Met a jour l'etat de la checkbox globale selon l'etat des checkboxes de ses categories.
     * @param {Boolean} isCharge true si la checkbox globale est celle des charges, false si
     * c'est celle des credits.
     */
    function updateGlobalCheckbox(isCharge) {
      var i, categories = isCharge ? vm.chargeCategories : vm.creditCategories;

      for (i=0 ; i < categories.length ; i++) {
        if (!Utils.isValidEquals(vm.checkedCategories[categories[i].id], true)) {
          setDisplayAllState(isCharge, false);
          return;
        }
      }

      setDisplayAllState(isCharge, true);
    }

    /**
     * Met a jour l'etat de la checkbox globale.
     * @param {Boolean} isCharge true si la checkbox globale est celle des charges, false si
     * c'est celle des credits.
     * @param {Boolean} state Nouvel etat de la checkbox globale.
     */
    function setDisplayAllState(isCharge, state) {
      if (isCharge) {
        vm.displayAllCharges = state;
      }
      else {
        vm.displayAllCredits = state;
      }
    }

    /**
     * Selectionne ou deselectionne une sous-categorie dans les operations.
     * @param {Event} event Evenement cree lors du clic sur la checkbox.
     * @param {Category} category Categorie a laquelle appartient la sous-categorie.
     * @param {SubCategory} subCategory Sous-categorie cliquee.
     */
    function onSubCategoryChange(event, category, subCategory) {
      var i, operation, isChecked = event.target.checked,
        isCharge = Utils.isValidEquals(category.type, 'CHARGE');

      // Mise a jour les operations (sous-categorie checkee ou non, categorie decheckee)
      for (i=0 ; i < vm.bankOperations.length ; i++) {
        operation = vm.bankOperations[i];

        if (Utils.isValid(operation.subCategory) && operation.subCategory.id === subCategory.id) {
          operation.category.checked = false;
          operation.subCategory.checked = isChecked;
        }
      }

      if (!isChecked) {
        vm.checkedCategories[category.id] = false;
        setDisplayAllState(isCharge, false);
      }
      else {
        if (isCategoryFull(category)) {
          vm.checkedCategories[category.id] = true;
        }

        updateGlobalCheckbox(isCharge);
      }

      updateChart();
    }

    /**
     * Selectionne ou deselectionne la sous-categorie 'Aucune sous-categorie' dans les operations.
     * @param {Event} event Evenement cree lors du clic sur la checkbox.
     * @param {Category} category Categorie a laquelle appartient la sous-categorie 'Aucune sous-categorie'.
     */
    function onUnSubcategorisedChange(event, category) {
      var i, isChecked = event.target.checked,
        isCharge = Utils.isValidEquals(category.type, 'CHARGE');

      for (i=0 ; i < vm.bankOperations.length ; i++) {
        if (!Utils.isValid(vm.bankOperations[i].subCategory)) {
          vm.bankOperations[i].category.checked = false;
        }
      }

      if (!isChecked) {
        vm.checkedCategories[category.id] = false;
        setDisplayAllState(isCharge, false);
      }
      else {
        if (isCategoryFull(category)) {
          vm.checkedCategories[category.id] = true;
        }

        updateGlobalCheckbox(isCharge);
      }

      updateChart();
    }

    /**
     * Indique si toutes les sous-categories de la categorie passee en parametre sont cochees ou non.
     * @param {Category} category Categorie a verifier.
     * @returns {boolean} true si toutes les sous-categories sont cochees, false sinon.
     */
    function isCategoryFull(category) {
      var i, isCategoryFull, subCategoryEntry;

      isCategoryFull = true;
      for (i=0 ; i < category.subCategories.length ; i++) {
        subCategoryEntry = vm.checkedSubCategories[category.subCategories[i].id];

        if (!Utils.isValid(subCategoryEntry) || subCategoryEntry === false) {
          isCategoryFull = false;
          break;
        }
      }

      return isCategoryFull && Utils.isValidEquals(vm.checkedUnSubcategorised[category.id], true);
    }

    /**
     * @returns {Number} Balance (credits - charges)
     */
    function getBalance() {
      return vm.creditsAmount - vm.chargesAmount;
    }

    /**
     * Calcule le taux de charges ou de credits par rapport a la somme des 2.
     * @param {Boolean} isCharge true si on doit calculer le taux des charges, false pour le taux des credits.
     * @returns {Number} Taux de charges ou de credits par rapport au total.
     */
    function getBalanceRate(isCharge) {
      var total = vm.creditsAmount + vm.chargesAmount;

      if (total === 0) {
        return 0;
      }
      return isCharge ? vm.chargesAmount / total : vm.creditsAmount / total;
    }

    /**
     * Modifie le debut de la periode de reference.
     * @param {Number} delta 0 pour aller au debut de la periode, 31 pour aller a la fin, et tout autre nombre
     * pour incrementer/decrementer la periode.
     * @param {String} period day, month ou year.
     */
    function updateStartingPeriod(delta, period) {
      if (delta === 0 && !Utils.isValid(period)) {
        vm.startPeriod = moment().toDate();
      }
      else if (delta === 0) {
        vm.startPeriod = moment(vm.startPeriod).startOf(period).toDate();
      }
      else if (delta === 31) {
        vm.startPeriod = moment(vm.startPeriod).endOf(period).toDate();
      }
      else if (delta > 0) {
        vm.startPeriod = moment(vm.startPeriod).add(delta, period).toDate();
      }
      else {
        vm.startPeriod = moment(vm.startPeriod).subtract(-delta, period).toDate();
      }

      updateChart();
    }

    /**
     * Modifie la fin de la periode de reference.
     * @param {Number} delta 0 pour aller au debut de la periode, 31 pour aller a la fin, et tout autre nombre
     * pour incrementer/decrementer la periode.
     * @param {String} period day, month ou year.
     */
    function updateEndingPeriod(delta, period) {
      if (delta === 0 && !Utils.isValid(period)) {
        vm.endPeriod = moment().toDate();
      }
      else if (delta === 0) {
        vm.endPeriod = moment(vm.endPeriod).startOf(period).toDate();
      }
      else if (delta === 31) {
        vm.endPeriod = moment(vm.endPeriod).endOf(period).toDate();
      }
      else if (delta > 0) {
        vm.endPeriod = moment(vm.endPeriod).add(delta, period).toDate();
      }
      else {
        vm.endPeriod = moment(vm.endPeriod).subtract(-delta, period).toDate();
      }

      updateChart();
    }

    /**
     * Charge les operations bancaires.
     * @returns {Function|promise}
     */
    function loadBankOperations() {
      var deferred = $q.defer();

      BankOperations.query({accountId: vm.selectedAccounts[0].id}, function (bankOperations) {
        vm.bankOperations = bankOperations;

        for (var i=0 ; i < vm.bankOperations.length ; i++) {
          vm.bankOperations[i].category.checked = false;
          if (Utils.isValid(vm.bankOperations[i].subCategory)) {
            vm.bankOperations[i].subCategory.checked = false;
          }
        }

        deferred.resolve(bankOperations);
      }, function () {
        deferred.reject('Failed loading bank operations');
      });

      return deferred.promise;
    }

    /**
     * Met a jour le graphique d'evolution du solde.
     */
    function updateChart() {
      var chartData, types = ['string', 'number', 'number'];

      chartData = computeChartData();

      vm.chartConfig = {
        type: "BarChart",
        displayed: true,
        data: Utils.arrayToDataTable(chartData, types),
        options: {
          legend: {
            position: 'bottom'
          },
          chartArea: {
            top: 20,
            bottom: 0
          },
          hAxis: {
            minValue: 0,
            format: 'decimal'
          },
          colors: ['red', 'green']
        }
      };
    }

    /**
     * Calcule les donnees a afficher sur le graphe.
     * @returns {Array} Tableau de donnees a afficher.
     */
    function computeChartData() {
      var operation, categoryId, subCategoryId, operationIdx = 0, chartData = [], totalCharges = 0, totalCredits = 0;

      chartData.push(['Nature', 'Dépenses', 'Revenus']);
      vm.categoryAmounts = {};
      vm.subCategoryAmounts = {};

      while (operationIdx < vm.bankOperations.length) {
        operation = vm.bankOperations[operationIdx];

        if (isOperationDisplayed(operation)) {
          categoryId = operation.category.id;
          subCategoryId = checkAmountArraysInit(operation, categoryId);

          if (Utils.isValid(operation.credit)) {
            totalCredits += operation.credit;
            vm.categoryAmounts[categoryId] += operation.credit;
            vm.subCategoryAmounts[categoryId][subCategoryId] += operation.credit;
          }
          else {
            totalCharges += operation.charge;
            vm.categoryAmounts[categoryId] -= operation.charge;
            vm.subCategoryAmounts[categoryId][subCategoryId] -= operation.charge;
          }
        }
        operationIdx++;
      }

      chartData.push(["", totalCharges, totalCredits]);

      vm.creditsAmount = totalCredits;
      vm.chargesAmount = totalCharges;

      return chartData;
    }

    /**
     * Verifie que les tableaux contenant les montants par categorie et sous-categorie
     * sont correctement initialises.
     * @param {BankOperation} operation Operation bancaire.
     * @param {Number} categoryId Identifiant d'une categorie.
     * @returns {Number} Identifiant de la sous-categorie de l'operation bancaire.
     */
    function checkAmountArraysInit(operation, categoryId) {
      var subCategoryId;

      if (!Utils.isValid(vm.categoryAmounts[categoryId])) {
        vm.categoryAmounts[categoryId] = 0;
      }

      if (Utils.isValid(operation.subCategory)) {
        subCategoryId = operation.subCategory.id;
      }
      else {
        subCategoryId = 0;
      }

      if (!Utils.isValid(vm.subCategoryAmounts[categoryId])) {
        vm.subCategoryAmounts[categoryId] = {};
      }
      if (!Utils.isValid(vm.subCategoryAmounts[categoryId][subCategoryId])) {
        vm.subCategoryAmounts[categoryId][subCategoryId] = 0;
      }

      return subCategoryId;
    }

    /**
     * Retourne le montant de la categorie passee en parametre.
     * @param {Number} categoryId Identifiant de la categorie.
     * @returns {Number} Montant de la sous-categorie passee en parametre.
     */
    function getCategoryAmount(categoryId) {
      if (Utils.isValid(vm.categoryAmounts[categoryId])) {
        return vm.categoryAmounts[categoryId];
      }
      return 0;
    }

    /**
     * Retourne le taux du montant de la categorie passee en parametre par rapport
     * au total des charges ou des credits.
     * @param {Category} category Categorie.
     * @returns {Number} Taux.
     */
    function getCategoryAmountRate(category) {
      var total = category.type === 'CHARGE' ? vm.chargesAmount : vm.creditsAmount;

      if (total === 0) {
        return 0;
      }
      return Math.abs(getCategoryAmount(category.id)) / total;
    }

    /**
     * Retourne le montant de la sous-categorie passee en parametre.
     * @param categoryId Identifiant de la categorie associee a la sous-categorie.
     * @param subCategoryId Identifiant de la sous-categorie.
     * @returns {Number} Montant de la sous-categorie passee en parametre.
     */
    function getSubCategoryAmount(categoryId, subCategoryId) {
      if (Utils.isValid(vm.subCategoryAmounts[categoryId]) && Utils.isValid(vm.subCategoryAmounts[categoryId][subCategoryId])) {
        return vm.subCategoryAmounts[categoryId][subCategoryId];
      }
      return 0;
    }

    /**
     * Retourne le taux du montant de la sous-categorie passee en parametre par rapport
     * au total des charges ou des credits.
     * @param {Category} category Categorie associee a la sous-categorie.
     * @param {Number} subCategoryId Identifiant de la sous-actegorie.
     * @returns {Number} Taux.
     */
    function getSubCategoryAmountRate(category, subCategoryId) {
      var total = category.type === 'CHARGE' ? vm.chargesAmount : vm.creditsAmount;

      if (total === 0) {
        return 0;
      }
      return Math.abs(getSubCategoryAmount(category.id, subCategoryId)) / total;
    }

    /**
     * Indique si l'operation passee en parametre est a prendre en compte ou non.
     * @param {BankOperation} operation Operation bancaire a tester.
     * @returns {Boolean} true si l'operation doit etre prise en compte, ou false sinon.
     */
    function isOperationDisplayed(operation) {
      return operation.operationDate >= vm.startPeriod && operation.operationDate <= vm.endPeriod &&
        (operation.category.checked === true ||
        (Utils.isValid(operation.subCategory) && operation.subCategory.checked === true) ||
        (!Utils.isValid(operation.subCategory) && Utils.isValidEquals(vm.checkedUnSubcategorised[operation.category.id], true)));
    }
  }
})();
