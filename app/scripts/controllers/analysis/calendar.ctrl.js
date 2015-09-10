(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('CalendarAnalysisCtrl', CalendarAnalysisCtrl);


  CalendarAnalysisCtrl.$inject = ['Accounts', 'BankOperations', 'Utils', '$q'];
  function CalendarAnalysisCtrl(Accounts, BankOperations, Utils, $q)
  {
    var vm = this;

    /** Operations bancaires du compte. */
    this.bankOperations = [];

    vm.viewTypes = {diff: "Revenus - Dépenses", charges: "Dépenses", credits: "Revenus"};
    vm.selectedViewType = Object.keys(vm.viewTypes)[0];
    /** Liste des comptes */
    vm.accounts = [];
    /** Compte pour lequel afficher l'evolution du solde. */
    vm.account;
    /** Configuration du graphique. */
    vm.chartConfig = undefined;

    vm.onAccountChanged = onAccountChanged;
    vm.onViewTypeChanged = onViewTypeChanged;


    loadAccounts();


    /**
     * Charge la liste des comptes disponibles.
     */
    function loadAccounts() {
      vm.accounts = Accounts.query(function (accounts) {
        if (accounts.length > 0) {
          vm.account = vm.accounts[0];
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
        updateChart();
      });
    }

    /**
     * Methode appelee lorsque l'utilisateur change de type de vue.
     * Recharge le graphe.
     */
    function onViewTypeChanged() {
      updateChart();
    }

    /**
     * Charge les operations bancaires.
     * @returns {Function|promise}
     */
    function loadBankOperations() {
      var deferred = $q.defer();

      BankOperations.query({accountId: vm.account.id}, function (bankOperations) {
        vm.bankOperations = bankOperations;

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
      var chartData, colorAxisOption = {}, types = ['date', 'number'];

      chartData = computeChartData();

      if (vm.selectedViewType === 'charges') {
        colorAxisOption.minValue = -500;
        colorAxisOption.maxValue = 0;
      }
      else if (vm.selectedViewType === 'credits') {
        colorAxisOption.minValue = 0;
        colorAxisOption.maxValue = 500;
      }
      else {
        colorAxisOption.minValue = -100;
        colorAxisOption.maxValue = 100;
      }

      vm.chartConfig = {
        type: "Calendar",
        displayed: true,
        data: Utils.arrayToDataTable(chartData, types),
        options: {
          legend: {
            position: 'none'
          },
          calendar: {
            daysOfWeek: 'DLMMJVS'
          },
          colorAxis: colorAxisOption
        }
      };
    }

    /**
     * Calcule les donnees a afficher sur le graphe.
     * @returns {Array} Tableau de donnees a afficher.
     */
    function computeChartData() {
      var operationIdx = 0, referenceMoment, startOfPeriod, endOfPeriod, chartData = [], dataOfPeriod, totalChargesInPeriod = 0, totalCreditsInPeriod = 0;

      chartData.push(['Date', 'Solde']);

      referenceMoment = moment.unix(vm.bankOperations[0].operationDate / 1000);

      startOfPeriod = referenceMoment.startOf('day').unix() * 1000;
      endOfPeriod = referenceMoment.endOf('day').unix() * 1000;
      dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment);

      while (operationIdx < vm.bankOperations.length) {
        if (Utils.isInPeriod(vm.bankOperations[operationIdx].operationDate, startOfPeriod, endOfPeriod)) {
          if (vm.selectedViewType === 'charges' && vm.bankOperations[operationIdx].charge) {
            dataOfPeriod[1] -= vm.bankOperations[operationIdx].charge;
          }
          else if (vm.selectedViewType === 'credits' && vm.bankOperations[operationIdx].credit) {
            dataOfPeriod[1] += vm.bankOperations[operationIdx].credit;
          }
          else if (vm.selectedViewType === 'diff') {
            if (vm.bankOperations[operationIdx].credit) {
              totalCreditsInPeriod += vm.bankOperations[operationIdx].credit;
            }
            else if (vm.bankOperations[operationIdx].charge) {
              totalChargesInPeriod += vm.bankOperations[operationIdx].charge;
            }

            dataOfPeriod[1] = totalCreditsInPeriod - totalChargesInPeriod;
          }
          operationIdx++;
        }
        // Aucune opération n'entrera plus dans la période courante : on passe à la période suivante
        else {
          referenceMoment = moment.unix(startOfPeriod / 1000).add(1, 'day');
          startOfPeriod = referenceMoment.unix() * 1000;
          endOfPeriod = referenceMoment.endOf('day').unix() * 1000;

          dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment);
          totalChargesInPeriod = 0;
          totalCreditsInPeriod = 0;
        }
      }

      return removeNoDataPoints(chartData);
    }

    /**
     * Supprime les data sets des jours sans donnee.
     * @param chartData Tableau de donnees du graphique.
     * @returns {Array} Tableau de donnees du graphique, sans data sets vides.
     */
    function removeNoDataPoints(chartData) {
      for (var i=1 ; i < chartData.length ; i++) {
        var dataSet = chartData[i];

        if (dataSet[1] === 0) {
          chartData.splice(i, 1);
          i--;
        }
      }

      return chartData;
    }

    /**
     * Crée et initialise un nouveau tableau de donnees pour une nouvelle periode.
     * Ce tableau est ajoute a chartData.
     * @param chartData Tableau contenant toutes les infos du graphe.
     * @param referenceMoment Date de reference de la periode.
     * @returns {Array} Tableau de donnees de la periode.
     */
    function initNewDataOfPeriod(chartData, referenceMoment) {
      var dataOfPeriod = [];

      chartData.push(dataOfPeriod);
      dataOfPeriod.push(referenceMoment.toDate());
      dataOfPeriod.push(0);

      return dataOfPeriod;
    }
  }
})();
