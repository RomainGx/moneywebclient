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
    'ui.bootstrap'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      //.when('/', {
      //  templateUrl: 'views/main.html',
      //  controller: 'MainCtrl',
      //  controllerAs: 'main'
      //})
      .when('/editAccount', {
        templateUrl: 'views/accounts/editAccount.html',
        controller: 'EditAccountCtrl',
        controllerAs: 'EditAccountCtrl'
      })
      .when('/accounts', {
        templateUrl: 'views/accounts/accounts.html',
        controller: 'AccountsCtrl',
        controllerAs: 'AccountsCtrl'
      })
      .when('/accounts/:accountId', {
        templateUrl: 'views/accounts/accountDetails.html',
        controller: 'AccountDetailsCtrl',
        controllerAs: 'AccountDetailsCtrl'
      })
      .otherwise({
        redirectTo: '/accounts'
      });
  });
