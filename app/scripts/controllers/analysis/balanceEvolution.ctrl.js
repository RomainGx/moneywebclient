(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('BalanceEvolutionAnalysisCtrl', BalanceEvolutionAnalysisCtrl);


  BalanceEvolutionAnalysisCtrl.$inject = ['Accounts', 'BankOperations', 'Utils', '$q'];
  function BalanceEvolutionAnalysisCtrl(Accounts, BankOperations, Utils, $q)
  {
    var vm = this;

    /** Operations bancaires du compte. */
    this.bankOperations = [];

    /** Liste des comptes */
    vm.accounts = [];
    /** Compte pour lequel afficher l'evolution du solde. */
    vm.account;
    /** Configuration du graphique. */
    vm.chartConfig = undefined;

    vm.onAccountChanged = onAccountChanged;


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
      var chartData, types;

      chartData = computeChartData();
      types = ['string'];

      for (var i=1 ; i < chartData[0].length ; i++) {
        types.push('number');
      }

      vm.chartConfig = {
        type: "AreaChart",
        displayed: true,
        data: Utils.arrayToDataTable(chartData, types),
        options: {
          legend: {
            position: 'none'
          },
          pointSize: 2,
          colors: ['#ffda00'],
          vAxis: {
            title: 'Solde en fin de mois (€)',
            textStyle: { fontSize: 12 },
            titleTextStyle: { fontSize: 12 },
            minorGridlines: {
              count: 2
            }
          },
          hAxis: {
            textStyle: { fontSize: 12 }
          }
        }
      };
    }

    /**
     * Calcule les donnees a afficher sur le graphe.
     * @returns {Array} Tableau de donnees a afficher.
     */
    function computeChartData() {
      var operationIdx = 0, referenceMoment, startOfPeriod, endOfPeriod, chartData = [], dataOfPeriod, balance;

      chartData.push(['Mois', 'Solde en fin de mois']);

      balance = vm.account.startingBalance;
      referenceMoment = moment.unix(vm.bankOperations[0].operationDate / 1000);

      startOfPeriod = referenceMoment.startOf('month').unix() * 1000;
      endOfPeriod = referenceMoment.endOf('month').unix() * 1000;
      dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment);

      while (operationIdx < vm.bankOperations.length) {
        if (Utils.isInPeriod(vm.bankOperations[operationIdx].operationDate, startOfPeriod, endOfPeriod)) {
          balance += vm.bankOperations[operationIdx].amount;
          dataOfPeriod[1] = balance;
          operationIdx++;
        }
        // Aucune opération n'entrera plus dans la période courante : on passe à la période suivante
        else {
          referenceMoment = moment.unix(startOfPeriod / 1000).add(1, 'month');
          startOfPeriod = referenceMoment.unix() * 1000;
          endOfPeriod = referenceMoment.endOf('month').unix() * 1000;

          dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment);
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
      dataOfPeriod.push(referenceMoment.format('MM/YYYY'));
      dataOfPeriod.push(0);

      return dataOfPeriod;
    }
  }
})();
