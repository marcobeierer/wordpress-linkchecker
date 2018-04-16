<?php
/*
 * @copyright  Copyright (C) 2015 - 2016 Marco Beierer. All rights reserved.
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU/GPL
 */
defined('ABSPATH') or die('Restricted access.');

if (!function_exists('tokenCheck')) {
	function tokenCheck($service, $url) {
		$token = get_option('link-checker-token');
		if ($token == '') { ?>
			<div class="notice notice-error below-h2">
			<p>The scheduler is only available if you have deposited a valid token for the <?php echo $service; ?> Professional in the settings. You could purchase the <a href="https://www.marcobeierer.com/wordpress-plugins/<?php echo $url; ?>-professional"><?php echo $service; ?> Professional</a> on my website</p>
			</div>


		<?php }
	}
}

if (!function_exists('localhostCheck')) {
	function localhostCheck() {

		if (preg_match('/^https?:\/\/(?:localhost|127\.0\.0\.1)/i', get_home_url()) === 1): // TODO implement a better localhost detection ?>

			<div class="notice notice-error below-h2">
				<p>It is not possible to use this plugin in a local development environment. The backend service needs to crawl your website and this is just possible if your site is reachable from the internet.</p>
			</div>

		<?php endif;
	}
}

// do not comment this because it is still used by the Sitemap Generator
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
?>
