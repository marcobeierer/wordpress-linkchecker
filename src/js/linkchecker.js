'use strict';

var linkCheckerApp = angular.module('linkCheckerApp', []);
var language = jQuery('html').attr('lang');

linkCheckerApp.controller('LinkCheckerController', ['$scope', '$http', '$timeout',
	function ($scope, $http, $timeout) {

		$scope.checkDisabled = false;
		$scope.limitReached = false;
		$scope.message = "The link checker was not started yet.";

		$scope.check= function() {

			if ($scope.linkCheckerForm.$valid) {

				$scope.checkDisabled = true;
				$scope.urlsCrawledCount = 0;

				$scope.message = "Your website is being checked. Please wait a moment.";
		
				var poller = function() {

					$http.get('admin-ajax.php?action=link_checker_proxy').
						success(function(data, status, headers, config) {

							if (data.Finished) { //successfull

								$scope.checkDisabled = false;
								$scope.message = "Your website was checked successfully. Please see the result below.";
								$scope.urlsCrawledCount = 0;
								$scope.limitReached = data.LimitReached; // TODO does this work?
							}
							else {
								$scope.urlsCrawledCount = data.URLsCrawledCount;
								$timeout(poller, 1000);
							}

							if (!jQuery.isEmptyObject(data.DeadLinks)) { // necessary for placeholder
								$scope.links = data.DeadLinks;
							}
						}).
						error(function(data, status, headers, config) {

							// TODO handle status 401 unauthorized

							$scope.checkDisabled = false;
							$scope.message = "The check of your website failed. Please try it again.";
						});
				}
				poller();
			}
		}
	}
]);
