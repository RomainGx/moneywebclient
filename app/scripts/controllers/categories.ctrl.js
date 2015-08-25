(function() {
  'use strict';

  angular
    .module('moneyWebClientApp')
    .controller('CategoriesCtrl', CategoriesCtrl);


  CategoriesCtrl.$inject = ['Categories', 'SubCategories'];
  function CategoriesCtrl(Categories, SubCategories)
  {
    var vm = this;

    /** Contient des informations sur la catégorie ou la sous-catégorie actuellement en mode édition. */
    this.editedElement = {};

    /** Liste des catégories de débit. */
    vm.chargeCategories = Categories.Charge.query();
    /** Liste des catégories de crédit. */
    vm.creditCategories = Categories.Credit.query();
    /** Label actuel de la zone d'édition. */
    vm.editedLabel = '';

    vm.startEditingCategory = startEditingCategory;
    vm.startEditingSubCategory = startEditingSubCategory;
    vm.isCategoryConcernedByEdit = isCategoryConcernedByEdit;
    vm.isSubCategoryConcernedByEdit = isSubCategoryConcernedByEdit;
    vm.validateCategoryEdit = validateCategoryEdit;
    vm.validateSubCategoryEdit = validateSubCategoryEdit;
    vm.handleInputKeyPress = handleInputKeyPress;


    /**
     * Met à jour le modèle afin de pré-remplir le label avec le nom actuel de la catégorie.
     * @param {number} categoryIdx Index de la catégorie dans le tableau.
     * @param {string} type Type de catégorie (débit ou crédit).
     */
    function startEditingCategory(categoryIdx, type) {
      vm.editedElement = {categoryIdx: categoryIdx, type: type};

      if (type === 'credit') {
        vm.editedLabel = vm.creditCategories[categoryIdx].name;
      }
      else {
        vm.editedLabel = vm.chargeCategories[categoryIdx].name;
      }
    }

    /**
     * Met à jour le modèle afin de pré-remplir le label avec le nom actuel de la sous-catégorie.
     * @param {number} categoryIdx Index de la catégorie dans le tableau.
     * @param {number} subCategoryIdx Index de la sous-catégorie dans le tableau.
     * @param {string} type Type de catégorie (débit ou crédit).
     */
    function startEditingSubCategory(categoryIdx, subCategoryIdx, type) {
      vm.editedElement = {categoryIdx: categoryIdx, subCategoryIdx: subCategoryIdx, type: type};

      if (type === 'credit') {
        vm.editedLabel = vm.creditCategories[categoryIdx].subCategories[subCategoryIdx].name;
      }
      else {
        vm.editedLabel = vm.chargeCategories[categoryIdx].subCategories[subCategoryIdx].name;
      }
    }

    /**
     * Indique si la catégorie est actuellement en mode lecture ou en mode édition.
     * @param {number} categoryIdx Index de la catégorie dans le tableau.
     * @param {string} type Type de catégorie (débit ou crédit).
     * @returns {boolean} true si la catégorie est en mode édition, false si elle est en mode lecture.
     */
    function isCategoryConcernedByEdit(categoryIdx, type) {
      return vm.editedElement && vm.editedElement.categoryIdx === categoryIdx && vm.editedElement.type === type && vm.editedElement.subCategoryIdx === undefined;
    }

    /**
     * Indique si la sous-catégorie est actuellement en mode lecture ou en mode édition.
     * @param {number} categoryIdx Index de la catégorie dans le tableau.
     * @param {number} subCategoryIdx Index de la sous-catégorie dans le tableau.
     * @param {string} type Type de catégorie (débit ou crédit).
     * @returns {boolean} true si la sous-catégorie est en mode édition, false si elle est en mode lecture.
     */
    function isSubCategoryConcernedByEdit(categoryIdx, subCategoryIdx, type) {
      return vm.editedElement && vm.editedElement.categoryIdx === categoryIdx && vm.editedElement.type === type && vm.editedElement.subCategoryIdx === subCategoryIdx;
    }

    /**
     * Valide le changement de nom de la catégorie aurpès du serveur.
     * @param {number} categoryIdx Index de la catégorie dans le tableau.
     * @param {string} type Type de catégorie (débit ou crédit).
     */
    function validateCategoryEdit(categoryIdx, type) {
      if (vm.editedLabel) {
        var category = type === 'credit' ? vm.creditCategories[categoryIdx] : vm.chargeCategories[categoryIdx];
        category.name = vm.editedLabel;

        Categories.Common.update({categoryId: category.id}, category, function (category) {
          if (type === 'credit') {
            vm.creditCategories[categoryIdx] = category;
          }
          else {
            vm.chargeCategories[categoryIdx] = category;
          }

          vm.editedLabel = '';
          vm.editedElement = {};
        }, function () {
          alert('Failed updating categories');
        });
      }
    }

    /**
     * Valide le changement de nom de la sous-catégorie aurpès du serveur.
     * @param {number} categoryIdx Index de la catégorie dans le tableau.
     * @param {number} subCategoryIdx Index de la sous-catégorie dans le tableau.
     * @param {string} type Type de catégorie (débit ou crédit).
     */
    function validateSubCategoryEdit(categoryIdx, subCategoryIdx, type) {
      if (vm.editedLabel) {
        var category = type === 'credit' ? vm.creditCategories[categoryIdx] : vm.chargeCategories[categoryIdx];
        var subCategory = category.subCategories[subCategoryIdx];
        subCategory.name = vm.editedLabel;
        subCategory.category = {id: category.id};

        SubCategories.update({categoryId: category.id, subCategoryId: subCategory.id}, subCategory, function (category) {
          if (type === 'credit') {
            vm.creditCategories[categoryIdx].subCategories[subCategoryIdx] = category;
          }
          else {
            vm.chargeCategories[categoryIdx].subCategories[subCategoryIdx] = category;
          }

          vm.editedLabel = '';
          vm.editedElement = {};
        }, function () {
          alert('Failed updating categories');
        });
      }
    }

    /**
     * Gère les appuis sur la touche entrée et echap afin de provoquer la mise à jour du modèle et
     * l'annulation des changements, respectivement.
     * @param {Event} event Evénement lancé lors de l'appui sur une touche.
     */
    function handleInputKeyPress(event) {
      var code = event.which ? event.which : event.keyCode;

      if (code === 13) {
        event.target.blur();
      }
      else if (code == 27) {
        vm.editedElement = {};
        vm.editedLabel = '';
      }
    }
  }
})();
