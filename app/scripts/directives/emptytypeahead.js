(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .directive('emptyTypeahead', emptyTypeahead);

  emptyTypeahead.$inject = [];
  /** Source : http://stackoverflow.com/a/24767467/615882 */
  function emptyTypeahead() {
    return {
      require: 'ngModel',
      link: function (scope, element, attrs, modelCtrl) {
        // this parser run before typeahead's parser
        modelCtrl.$parsers.unshift(function (inputValue) {
          var value = (inputValue ? inputValue : '[$empty$]'); // replace empty string with secretEmptyKey to bypass typeahead-min-length check
          modelCtrl.$viewValue = value; // this $viewValue must match the inputValue pass to typehead directive
          return value;
        });

        // this parser run after typeahead's parser
        modelCtrl.$parsers.push(function (inputValue) {
          return inputValue === '[$empty$]' ? '' : inputValue; // set the secretEmptyKey back to empty string
        });
      }
    }
  }
})();
