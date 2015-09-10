(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .factory('Utils', Utils);

  Utils.$inject = [];
  function Utils() {
    return {
      /**
       * Retourne la date correspondant au timestamp passé en paramètre, sous une forme lisible par un humain.
       * @param timestampMs Timestamp en ms.
       * @returns {string} Date dans un format lisible.
       */
      getHumanDateFromUnixTimestamp: function(timestampMs) {
        return moment.unix(timestampMs / 1000).format('DD/MM/YYYY');
      },

      /**
       * Retourne dans un tableau un objet dont l'ID est passé en paramètre.
       * @param array Tableau dans lequel rechercher.
       * @param objectId ID de l'opération à rechercher.
       * @returns {number} Index de l'objet trouvé, ou -1 si aucun objet ne correspond à l'ID passé en paramètre.
       */
      getPositionInArray: function(array, objectId) {
        for (var i=0 ; i < array.length ; i++) {
          if (array[i].id === objectId) {
            return i;
          }
        }

        return -1;
      },

      /**
       * Paramètre la clause order by en fonction du choix de l'utilisateur.
       * Si les opérations sont triées sur un autre élément que la date, alors on ajoute 2 critères de tri secondaires :
       * la date et l'ID.
       * @param {object} params Paramètres fournis par ng-table, qui contiennent la clause orderBy.
       * @returns {*[]} Clause orderBy à utiliser.
       */
      computeOrderBy: function(params) {
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
      },

      /**
       * Scroll en bas de la zone scrollView.
       * @param scope Scope
       * @param scrollView Zone contenant la scrollbar.
       */
      scrollToEndOfTableWhenRendered: function(scope, scrollView) {
        scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
          scrollView.animate({scrollTop: scrollView.get(0).scrollHeight});
        });
      },

      /**
       * Transforme un tableau de données en données formattées pour Google Charts.
       * @param data Exemple :
       * <code>var data = arrayToDataTable([
       * ['Director (Year)',  'Rotten Tomatoes', 'IMDB'],
       * ['Alfred Hitchcock (1935)', 8.4,         7.9],
       * ['Ralph Thomas (1959)',     6.9,         6.5],
       * ['Don Sharp (1978)',        6.5,         6.4],
       * ['James Hawes (2008)',      4.4,         6.2]
       * ]);</code>
       * @param types Tableau contenant les types de données de chaque colonne.
       * @returns {{cols: Array, rows: Array}}
       */
      arrayToDataTable: function(data, types) {
        var line = 0,
          column,
          cols = [],
          rows = [];

        for (column=0 ; column < data[line].length ; column++) {
          var col = {
            id: 'col-' + column,
            label: data[0][column],
            type: types[column],
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
              v: (types[column] === 'string' || types[column] === 'date') ?  data[line][column] : data[line][column].toFixed(2)
            };
            row.c.push(insideRow);
          }
          rows.push(row);
        }

        return {
          cols : cols,
          rows : rows
        };
      },

      /**
       * Détermine si l'opération située à l'index operationIdx se situe dans une période donnée.
       * @param {number} timestampMs Timestamp à tester (en ms).
       * @param {number} startOfPeriod Timestamp de début de la période (en ms)
       * @param {number} endOfPeriod Timestamp de fin de la période (en ms)
       * @returns {boolean} true si le timestamp se situe dans la période, false s'il est en-dehors
       */
      isInPeriod: function (timestampMs, startOfPeriod, endOfPeriod) {
        return timestampMs >= startOfPeriod && timestampMs <= endOfPeriod;
      }
    }
  }
})();
