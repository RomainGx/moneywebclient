(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('CategoryInfosCtrl', CategoryInfosCtrl);


  CategoryInfosCtrl.$inject = ['$scope', '$routeParams', '$filter', 'ngTableParams', 'Utils', 'Categories'];
  function CategoryInfosCtrl($scope, $routeParams, $filter, ngTableParams, Utils, Categories)
  {
    var vm = this;

    /** Paramètres utilisés par ng-table pour la liste des opérations. */
    vm.tableParams = null;
    vm.category = Categories.Common.get({categoryId: $routeParams.categoryId});
    vm.bankOperations = loadBankOperations();
    vm.chartConfig = undefined;
    vm.period = 'month';
    vm.duration = 6;

    vm.updateChart = updateChart;


    Utils.scrollToEndOfTableWhenRendered($scope, $('#operationsList'));


    function loadBankOperations() {
      return Categories.BankOperations.query({categoryId: $routeParams.categoryId}, function() {
        if (vm.tableParams) {
          vm.tableParams.reload();
        }
        else {
          configTableParams();
        }
      });
    }

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
          updateChart('month');

          var orderBy = Utils.computeOrderBy(params);
          var filteredOperations = params.sorting() ? $filter('orderBy')(vm.bankOperations, orderBy) : vm.bankOperations;

          $defer.resolve(filteredOperations);
        }
      });
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

    function updateChart() {
      var chartData = computeChartData();

      vm.chartConfig = {
        type: "SteppedAreaChart",
        displayed: true,
        data: arrayToDataTable(chartData),
        options: {
          isStacked: true,
          connectSteps: false,
          legend: {
            position: 'bottom',
            maxLines: 3
          },
          selectionMode: 'multiple',
          tooltip: {
            trigger: 'selection'
          },
          aggregationTarget: 'auto'
        }
      };
    }

    function computeChartData() {
      var referenceMoment = computeStartingReferenceMoment(),
        chartData = [],
        dataOfPeriod = [],
        operationIdx, columnIdx, subCategoriesColumnMap,
        startOfPeriod, endOfPeriod;

      subCategoriesColumnMap = addHeaders(chartData);

      startOfPeriod = referenceMoment.startOf(vm.period).unix() * 1000;
      endOfPeriod = referenceMoment.endOf(vm.period).unix() * 1000;

      // Parcours des opérations dans le sens anti-chronologique
      operationIdx = vm.bankOperations.length - 1;
      while (operationIdx >= 0) {
        // Si l'opération fait partie de la période actuellement scannée, on vérifie s'il faut créer un nouveau dataOfPeriod
        if (vm.bankOperations[operationIdx].operationDate >= startOfPeriod && vm.bankOperations[operationIdx].operationDate <= endOfPeriod) {
          if (dataOfPeriod.length == 0) {
            dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment, subCategoriesColumnMap);
          }
        }
        // Changement de période
        else {
          referenceMoment = moment.unix(startOfPeriod / 1000).subtract(1, vm.period);
          startOfPeriod = referenceMoment.unix() * 1000;
          endOfPeriod = referenceMoment.endOf(vm.period).unix() * 1000;

          dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment, subCategoriesColumnMap);
        }

        // Si l'opération fait partie de la période actuellement scannée, on l'ajoute aux données existantes
        if (vm.bankOperations[operationIdx].operationDate >= startOfPeriod && vm.bankOperations[operationIdx].operationDate <= endOfPeriod) {
          if (vm.bankOperations[operationIdx].subCategory) {
            columnIdx = subCategoriesColumnMap[vm.bankOperations[operationIdx].subCategory.id];
          }
          else {
            columnIdx = subCategoriesColumnMap[-1];
          }

          dataOfPeriod[columnIdx] += vm.bankOperations[operationIdx].amount;

          // On avance à l'opération suivante (dans l'ordre anti-chronologique)
          operationIdx--;
        }
      }

      return chartData;
    }

    function computeStartingReferenceMoment() {
      var lastOperationDate, referenceMoment = moment();

      if (vm.bankOperations.length > 0) {
        lastOperationDate = moment.unix(vm.bankOperations[vm.bankOperations.length - 1].operationDate / 1000);

        if (lastOperationDate.unix() > referenceMoment.unix()) {
          referenceMoment = lastOperationDate;
        }
      }

      return referenceMoment;
    }

    function addHeaders(chartData) {
      var header = [vm.period === 'month' ? 'Mois' : 'Année'];
      var subCategoriesColumnMap = {};

      if (vm.category.subCategories.length > 0) {
        for (var i = 0; i < vm.category.subCategories.length ; i++) {
          header.push(vm.category.subCategories[i].name);
          subCategoriesColumnMap[vm.category.subCategories[i].id] = i + 1;
        }
      }

      header.push('Aucune sous-catégorie');
      subCategoriesColumnMap[-1] = vm.category.subCategories.length + 1;

      chartData.push(header);

      return subCategoriesColumnMap;
    }

    function initNewDataOfPeriod(chartData, referenceMoment, headerMap) {
      var dataOfPeriod = [];

      chartData.push(dataOfPeriod);
      dataOfPeriod.push(referenceMoment.format(vm.period === 'month' ? 'MM/YYYY' : 'YYYY'));

      for (var column=0 ; column < Object.keys(headerMap).length ; column++) {
        dataOfPeriod.push(0);
      }

      return dataOfPeriod;
    }

    /**
     *
     * @param data Exemple :
     * <code>var data = arrayToDataTable([
     * ['Director (Year)',  'Rotten Tomatoes', 'IMDB'],
     * ['Alfred Hitchcock (1935)', 8.4,         7.9],
     * ['Ralph Thomas (1959)',     6.9,         6.5],
     * ['Don Sharp (1978)',        6.5,         6.4],
     * ['James Hawes (2008)',      4.4,         6.2]
     * ]);</code>
     * @returns {{cols: Array, rows: Array}}
     */
    function arrayToDataTable(data) {
      var line = 0,
        column,
        cols = [],
        rows = [];

      for (column=0 ; column < data[line].length ; column++) {
        var col = {
          id: 'col-' + column,
          label: data[0][column],
          type: column === 0 ? 'string' : 'number',
          p: {}
        };
        cols.push(col);
      }

      line++;

      for ( ; line < data.length ; line++) {
        var row = {
          c: []
        };

        for (column=0 ; column < data[line].length ; column++) {
          var insideRow = {
            v: column === 0 ? data[line][column] : data[line][column].toFixed(2)
          };
          row.c.push(insideRow);
        }
        rows.push(row);
      }

      return {
        cols : cols,
        rows : rows
      };
    }
  }
})();
