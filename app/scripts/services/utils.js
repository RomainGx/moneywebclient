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
      }
    }
  }
})();
