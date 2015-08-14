'use strict';

/**
 * @ngdoc overview
 * @name moneyWebClientApp
 * @description
 * # moneyWebClientApp
 *
 * Main module of the application.
 */
angular
  .module('moneyWebClientApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ngTable',
    'ui.bootstrap',
    'door3.css'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      //.when('/', {
      //  templateUrl: 'views/main.html',
      //  controller: 'MainCtrl',
      //  controllerAs: 'main'
      //})
      .when('/editAccount', {
        templateUrl: 'views/editAccount.html',
        controller: 'EditAccountCtrl',
        controllerAs: 'EditAccountCtrl'
      })
      .when('/accounts', {
        templateUrl: 'views/accounts.html',
        controller: 'AccountsCtrl',
        controllerAs: 'AccountsCtrl'
      })
      .when('/accounts/:accountId', {
        templateUrl: 'views/accountDetails.html',
        controller: 'AccountDetailsCtrl',
        controllerAs: 'AccountDetailsCtrl',
        css: 'styles/accountDetails.css'
      })
      .otherwise({
        redirectTo: '/accounts'
      });
  });


/**
 * @typedef {Object} Account
 * @property {number} id Identifiant du compte.
 * @property {string} name Nom du compte.
 * @property {string} bankName Nom de la banque.
 * @property {string} number Numéro de compte.
 * @property {number} startingBalance Solde initial.
 * @property {number} finalBalance Solde final.
 */

/**
 * @typedef {Object} ThirdParty
 * @property {number} id Identifiant du tiers.
 * @property {string} name Nom du tiers.
 */

/**
 * @typedef {Object} SubCategory
 * @property {number} id Identifiant de la sous-catégorie.
 * @property {string} name Nom de la catégorie.
 */

/**
 * @typedef {Object} Category
 * @property {number} id Identifiant de la catégorie.
 * @property {string} name Nom de la catégorie.
 * @property {string} type Type de catégorie ("CHARGE" ou "CREDIT").
 * @property {SubCategory[]} Liste de sous-catégories.
 */

/**
 * @typedef {Object} BankOperation
 * @property {number} id Identifiant de l'opération bancaire.
 * @property {Account} account Compte sur lequel a été effectuée l'opération.
 * @property {string} bankNoteNum Numéro de chèque.
 * @property {number} operationDate Date (au format UNIX en ms) à laquelle est passée l'opération.
 * @property {string} operationDateHuman Date dans un format lisible par un humain.
 * @property {string} balanceState Etat de l'opération parmis "NOT_BALANCED", "PENDING", "BALANCED".
 * @property {ThirdParty} thirdParty Tiers à l'origine ou à destination de l'opération.
 * @property [number} charge Montant du débit.
 * @property [number} credit Montant du crédit.
 * @property {Category} category Catégorie associée à l'opération.
 * @property {SubCategory} subCategory Sous-catégorie associée à l'opération.
 * @property {string} notes Note libre associée à l'opération.
 */
