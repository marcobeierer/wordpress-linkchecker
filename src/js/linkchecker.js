'use strict';

var linkCheckerApp = angular.module('linkCheckerApp', []);
var language = jQuery('html').attr('lang');

linkCheckerApp.controller('LinkCheckerController', ['$scope', '$http', '$timeout',
	function ($scope, $http, $timeout) {

		var resultsMessage = 'Link check not started yet.';

		$scope.checkDisabled = false;

		$scope.urlsCrawledCount = 0;
		$scope.checkedLinksCount = 0;

		$scope.message = "The link checker was not started yet.";
		$scope.resultsMessage = resultsMessage;

		$scope.links = null;
		$scope.urlsWithDeadImages = null;

		$scope.check = function() {

			if ($scope.linkCheckerForm.$valid) {

				$scope.checkDisabled = true;

				$scope.urlsCrawledCount = 0;
				$scope.checkedLinksCount = 0;

				$scope.links = null;
				$scope.urlsWithDeadImages = null;

				$scope.message = "Your website is being checked. Please wait a moment.";
				$scope.resultsMessage = 'Please wait until the check has finished.';

				var poller = function() {

					$http.get('admin-ajax.php?action=link_checker_proxy').
						success(function(data, status, headers, config) {

							$scope.urlsCrawledCount = data.URLsCrawledCount;
							$scope.checkedLinksCount = data.CheckedLinksCount;

							if (data.Finished) { //successfull

								$scope.checkDisabled = false;

								if (data.LimitReached) {
									$scope.message = "The link limit was reached. The Link Checker has not checked your complete website. You could buy a token for the <a href=\"https://www.marcobeierer.com/wordpress-plugins/link-checker-professional\">Link Checker Professional</a> to check up to 50'000 links."
								} else {
									$scope.message = "Your website has been checked successfully. Please see the result below.";

									if (headers('X-Used-Token') != 1) {
										$scope.message += " If you additionally like to check your site for <strong>broken images</strong>, then check out the <a href=\"https://www.marcobeierer.com/wordpress-plugins/link-checker-professional\">Link Checker Professional</a>.";
									}
								}

								$scope.resultsMessage = 'No broken links found.';
							}
							else {
								$timeout(poller, 1000);
							}

							if (!jQuery.isEmptyObject(data.DeadLinks)) { // necessary for placeholder
								$scope.links = data.DeadLinks;
							}

							if (!jQuery.isEmptyObject(data.DeadEmbeddedImages)) { // necessary for placeholder
								$scope.urlsWithDeadImages = data.DeadEmbeddedImages;
							}
						}).
						error(function(data, status, headers, config) {

							$scope.checkDisabled = false;

							if (status == 401) { // unauthorized
								$scope.message = "The validation of your token failed. The token is invalid or has expired. Please try it again or contact me if the token should be valid.";
							} else if (status == 500) {
								if (data == '') {
									$scope.message = "The check of your website failed. Please try it again.";
								} else {
									$scope.message = "The check of your website failed with the error:<br/><strong>" + JSON.parse(data) + "</strong>.";
								}
							} else if (status == 503) {
								$scope.message = "The backend server is temporarily unavailable. Please try it again later.";
							} else if (status == 504 && headers('X-CURL-Error') == 1) {
								var message = JSON.parse(data);
								if (message == '') {
									$scope.message = "A cURL error occurred. Please contact the developer of the extensions.";
								} else {
									$scope.message = "A cURL error occurred with the error message:<br/><strong>" + message + "</strong>.";
								}
							} else {
								$scope.message = "The check of your website failed. Please try it again or contact the developer of the extensions.";
							}

							$scope.resultsMessage = resultsMessage;
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
