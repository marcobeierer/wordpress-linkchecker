<?php
/*
 * @copyright  Copyright (C) 2015 Marco Beierer. All rights reserved.
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU/GPL
 */
defined('ABSPATH') or die('Restricted access.');

if (!function_exists('cURLCheck')) {
	function cURLCheck() {

		if (!function_exists('curl_version')): ?>

			<div class="notice notice-error below-h2">
				<p>cURL is not activated on your webspace. Please activate it in your web hosting control panel. This plugin will not work without cURL activated.</p>
			</div>

		<?php else: // curl is installed

			$curlVersion = curl_version(); // temp var necessary for PHP 5.3
			if (version_compare($curlVersion['version'], '7.18.1', '<')): ?>

				<div class="notice notice-error below-h2">
					<p>You have an outdated version of cURL installed. Please update to cURL 7.18.1 or higher in your web hosting control panel. A compatible version should be provided by default with PHP 5.4 or higher. This plugin will not work with the currently installed cURL version.</p>
				</div>

			<?php endif;
		endif;
	}
}

if (!function_exists('localhostCheck')) {
	function localhostCheck() {

		if (preg_match('/^https?:\/\/(?:localhost|127\.0\.0\.1)/i', get_site_url()) === 1): ?>

			<div class="notice notice-error below-h2">
				<p>It is not possible to use this plugin in a local development environment. The backend service needs to crawl your website and this is just possible if your site is reachable from the internet.</p>
			</div>

		<?php endif;
	}
}
?>
