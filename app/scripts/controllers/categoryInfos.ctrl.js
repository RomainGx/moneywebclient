(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('CategoryInfosCtrl', CategoryInfosCtrl);


  CategoryInfosCtrl.$inject = ['$scope', '$routeParams', '$q', '$filter', 'ngTableParams', 'Utils', 'Categories', 'SubCategories', 'DEFAULT_COLORS'];
  function CategoryInfosCtrl($scope, $routeParams, $q, $filter, ngTableParams, Utils, Categories, SubCategories, DEFAULT_COLORS)
  {
    var vm = this;

    vm.isCreating = false;
    vm.newSubCategory = undefined;
    /** Paramètres utilisés par ng-table pour la liste des opérations. */
    vm.tableParams = null;
    vm.category = {};
    vm.subCategoriesGraphActivation = undefined;
    vm.bankOperations = [];
    vm.chartConfig = undefined;
    vm.period = 'month';
    vm.duration = 6;
    /** Map liant une couleur à chaque sous-catégorie. */
    vm.subCategoryColors = {};
    /** Liste de couleurs utilisée par le graphe (change selon les catégories sélectionnées). */
    vm.graphColors = [];

    vm.startCreating = startCreating;
    vm.finishCreating = finishCreating;
    vm.cancelCreating = cancelCreating;
    vm.updateChart = updateChart;
    vm.toggleShowOnGraph = toggleShowOnGraph;
    vm.isSubCategoryShownOnGraph = isSubCategoryShownOnGraph;
    vm.getSubCategoryColor = getSubCategoryColor;


    loadData();
    Utils.scrollToEndOfTableWhenRendered($scope, $('#operationsList'));


    function loadData() {
      loadCategory()
        .then(function (category) {
          vm.category = category;

          loadCategoryColors();
        })
        .then(loadBankOperations)
        .then(function (bankOperations) {
          vm.bankOperations = bankOperations;
          vm.isEditing = false;
          vm.operationSelected = false;

          if (vm.tableParams) {
            vm.tableParams.reload();
          }
          else {
            configTableParams();
          }
        })
        .catch(function(handleReject) {
          alert('error ' + handleReject);
        });
    }

    function loadCategory() {
      var deferred = $q.defer();

      Categories.Common.get({categoryId: $routeParams.categoryId}, function (category) {
        if (!vm.subCategoriesGraphActivation) {
          vm.subCategoriesGraphActivation = {};

          for (var i=0 ; i < category.subCategories.length ; i++) {
            vm.subCategoriesGraphActivation[category.subCategories[i].id] = true;
          }
        }

        deferred.resolve(category);
      }, function () {
        deferred.reject('Failed getting category');
      });

      return deferred.promise;
    }

    function toggleShowOnGraph(subCategoryId) {
      vm.subCategoriesGraphActivation[subCategoryId] = !vm.subCategoriesGraphActivation[subCategoryId];
      updateChart();
    }

    function loadBankOperations() {
      var deferred = $q.defer();

      Categories.BankOperations.query({categoryId: $routeParams.categoryId}, function(bankOperations) {
        deferred.resolve(bankOperations);
      }, function () {
        deferred.reject('Failed getting bank operations');
      });

      return deferred.promise;
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
          updateChart();

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

    /**
     * Met à jour le graphe.
     */
    function updateChart() {
      var chartData = computeChartData();
      loadGraphColors();

      vm.chartConfig = {
        type: "SteppedAreaChart",
        displayed: true,
        data: arrayToDataTable(chartData),
        options: {
          isStacked: true,
          connectSteps: false,
          legend: {
            position: 'none'
          },
          selectionMode: 'multiple',
          tooltip: {
            trigger: 'selection'
          },
          aggregationTarget: 'auto',
          areaOpacity: 0.8,
          colors: vm.graphColors,
          chartArea: {
            width:'85%',
            height: '90%'
          },
          vAxis: {
            title: 'Montant (€)',
            textStyle: { fontSize: 12 },
            titleTextStyle: { fontSize: 12 }
          },
          hAxis: {
            textStyle: { fontSize: 12 }
          }
        }
      };
    }

    /**
     * Rassemble sous forme de tableau les données à afficher dans le graphe.
     * @returns {Array} Données à afficher dans le graphe.
     */
    function computeChartData() {
      var referenceMoment = getGraphStartingDate(),
        chartData = [],
        dataOfPeriod,
        nbPeriods = 0,
        operationIdx, columnIdx, subCategoriesColumnMap,
        startOfPeriod, endOfPeriod;

      subCategoriesColumnMap = addHeaders(chartData);

      // Crée la période initiale
      startOfPeriod = referenceMoment.startOf(vm.period).unix() * 1000;
      endOfPeriod = referenceMoment.endOf(vm.period).unix() * 1000;
      dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment, subCategoriesColumnMap);
      nbPeriods++;


      // Parcours des opérations dans le sens anti-chronologique
      operationIdx = vm.bankOperations.length - 1;
      while (operationIdx >= 0) {
        if (showOperationOnGraph(vm.bankOperations[operationIdx])) {
          if (isInPeriod(operationIdx, startOfPeriod, endOfPeriod)) {
            // L'opération est affectée à une sous-catégorie
            if (vm.bankOperations[operationIdx].subCategory) {
              columnIdx = subCategoriesColumnMap[vm.bankOperations[operationIdx].subCategory.id];
            }
            // Ou est sans sous-catégorie
            else {
              columnIdx = subCategoriesColumnMap[-1];
            }

            dataOfPeriod[columnIdx] += vm.bankOperations[operationIdx].amount;
            operationIdx--;
          }
          // Aucune opération n'entrera plus dans la période courante : on passe à la période suivante
          else {
            nbPeriods++;
            if (nbPeriods > vm.duration) {
              break;
            }
            else {
              referenceMoment = moment.unix(startOfPeriod / 1000).subtract(1, vm.period);
              startOfPeriod = referenceMoment.unix() * 1000;
              endOfPeriod = referenceMoment.endOf(vm.period).unix() * 1000;

              dataOfPeriod = initNewDataOfPeriod(chartData, referenceMoment, subCategoriesColumnMap);
            }
          }
        }
        // L'opération n'apparait pas sur le graphe, on passe à la suivante
        else {
          operationIdx--;
        }
      }

      return chartData;
    }

    /**
     * Détermine la date à partir de laquelle commencer le graphe.
     * Ce peut être la date d'aujourd'hui, ou la date d'une opération qui est planifiée dans le futur.
     * @returns {moment} Date de début du graphe.
     */
    function getGraphStartingDate() {
      var startingMoment = moment(), idx;

      if (vm.bankOperations.length > 0) {
        idx = vm.bankOperations.length - 1;

        while (idx >= 0) {
          // On cherche la 1ère opération qui sera visible sur le graphe
          if (showOperationOnGraph(vm.bankOperations[idx])) {
            // Si l'opération est dans le futur, c'est d'elle qu'on part
            if (vm.bankOperations[idx].operationDate > startingMoment.unix() * 1000) {
              startingMoment = moment.unix(vm.bankOperations[idx].operationDate / 1000);
            }
            break;
          }
          idx--;
        }
      }

      return startingMoment;
    }

    /**
     * Détermine si l'opération située à l'index operationIdx se situe dans une période donnée.
     * @param operationIdx Index de l'opération à tester.
     * @param startOfPeriod Timestamp de début de la période (en ms)
     * @param endOfPeriod Timestamp de fin de la période (en ms)
     * @returns {boolean} true si l'opération se situe dans la période, false si elle est en-dehors
     */
    function isInPeriod(operationIdx, startOfPeriod, endOfPeriod) {
      return vm.bankOperations[operationIdx].operationDate >= startOfPeriod && vm.bankOperations[operationIdx].operationDate <= endOfPeriod;
    }

    /**
     * Détermine si une opération doit apparaitre sur le graphe ou non.
     * @param bankOperation L'opération à tester.
     * @returns {boolean} true si l'opération doit apparaitre sur le graphe, false sinon.
     */
    function showOperationOnGraph(bankOperation) {
      // Aucune sous-catégorie
      return !bankOperation.subCategory ||
        // Ou alors la sous-catégorie est visible
        isSubCategoryShownOnGraph(bankOperation.subCategory);
    }

    /**
     * Détermine si une sous-catégorie est visible ou non sur le graphe.
     * @param subCategory Sous-catégorie à tester.
     * @returns {boolean} true si la sous-catégorie est visible, false sinon.
     */
    function isSubCategoryShownOnGraph(subCategory) {
      return subCategory && vm.subCategoriesGraphActivation[subCategory.id] === true;
    }

    function loadCategoryColors() {
      var i;
      vm.subCategoryColors = {};

      // Initialise la map liant une catégorie à une couleur
      for (i=0 ; i < vm.category.subCategories.length ; i++) {
        vm.subCategoryColors[vm.category.subCategories[i].id] = DEFAULT_COLORS[i];
      }
      vm.subCategoryColors[-1] = DEFAULT_COLORS[i];
    }

    function getSubCategoryColor(subCategoryId) {
      return vm.subCategoryColors[subCategoryId];
    }

    function loadGraphColors() {
      vm.graphColors = [];

      if (vm.category.subCategories.length > 0) {
        for (var i = 0; i < vm.category.subCategories.length ; i++) {
          if (isSubCategoryShownOnGraph(vm.category.subCategories[i])) {
            vm.graphColors.push(vm.subCategoryColors[vm.category.subCategories[i].id]);
          }
        }
      }

      // Couleur des opérations sans sous-catégorie
      vm.graphColors.push(vm.subCategoryColors[-1]);
    }

    function addHeaders(chartData) {
      var header = [vm.period === 'month' ? 'Mois' : 'Année'],
        categoryIdx;
      var subCategoriesColumnMap = {};

      if (vm.category.subCategories.length > 0) {
        categoryIdx = 1;
        for (var i = 0; i < vm.category.subCategories.length ; i++) {
          if (isSubCategoryShownOnGraph(vm.category.subCategories[i])) {
            header.push(vm.category.subCategories[i].name);
            subCategoriesColumnMap[vm.category.subCategories[i].id] = categoryIdx;
            categoryIdx++;
          }
        }
      }

      header.push('Aucune sous-catégorie');
      subCategoriesColumnMap[-1] = Object.keys(subCategoriesColumnMap).length + 1;

      chartData.push(header);

      return subCategoriesColumnMap;
    }

    function initNewDataOfPeriod(chartData, referenceMoment, subCategoriesColumnMap) {
      var dataOfPeriod = [];

      chartData.push(dataOfPeriod);
      dataOfPeriod.push(referenceMoment.format(vm.period === 'month' ? 'MM/YYYY' : 'YYYY'));

      for (var column=0 ; column < Object.keys(subCategoriesColumnMap).length ; column++) {
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

    function startCreating() {
      vm.isCreating = true;
      vm.newSubCategory = {
        category: vm.category
      };
    }

    function finishCreating() {
      SubCategories.save({categoryId: vm.category.id}, vm.newSubCategory, function (subCategory) {
        vm.category.subCategories.push(subCategory);
        vm.subCategoriesGraphActivation[subCategory.id] = false;

        cancelCreating();
        loadCategoryColors();
        updateChart();
      }, function () {
        alert('Failed saving sub category');
      });
    }

    function cancelCreating() {
      vm.isCreating = false;
      vm.newSubCategory = undefined;
    }
  }
})();
