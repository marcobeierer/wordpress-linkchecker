'use strict';

var linkCheckerApp = angular.module('linkCheckerApp', []);
var language = jQuery('html').attr('lang');

linkCheckerApp.controller('LinkCheckerController', ['$scope', '$http', '$timeout',
	function ($scope, $http, $timeout) {

		$scope.checkDisabled = false;
		//$scope.limitReached = false;
		$scope.message = "The link checker was not started yet.";
		$scope.links = null;

		$scope.check= function() {

			if ($scope.linkCheckerForm.$valid) {

				$scope.checkDisabled = true;
				$scope.urlsCrawledCount = 0;
				$scope.links = null;

				$scope.message = "Your website is being checked. Please wait a moment.";
		
				var poller = function() {

					$http.get('admin-ajax.php?action=link_checker_proxy').
						success(function(data, status, headers, config) {

							if (data.Finished) { //successfull

								$scope.checkDisabled = false;
								$scope.urlsCrawledCount = 0;

								if (data.LimitReached) {
									$scope.message = "The link limit was reached. The Link Checker has not checked your complete website. You could buy a token for the <a href=\"https://www.marcobeierer.com/wordpress-plugins/link-checker-professional\">Link Checker Professional</a> to check up to 50'000 links."
								} else {
									$scope.message = "Your website was checked successfully. Please see the result below.";
								}
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

							$scope.checkDisabled = false;

							if (status == 401) { // unauthorized
								$scope.message = "The validation of your token failed. The token is invalid or has expired. Please try it again or contact me if the token should be valid.";
							} else {
								$scope.message = "The check of your website failed. Please try it again.";
							}
						});
				}
				poller();
			}
		}
	}
]);

linkCheckerApp.filter("sanitize", ['$sce', function($sce) {
	return function(htmlCode){
		return $sce.trustAsHtml(htmlCode);
	}
}]);
