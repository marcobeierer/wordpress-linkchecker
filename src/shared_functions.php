<?php
/*
 * @copyright  Copyright (C) 2015 - 2019 Marco Beierer. All rights reserved.
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

if (!function_exists('wordfenceCheck')) {
	// $toolName is 'Link Checker' or 'Sitemap Generator'
	function wordfenceCheck($toolName, $settingsPageURL) {
		if (defined('WORDFENCE_VERSION')): ?>
			<div class="notice notice-warning below-h2 is-dismissible">
				<p>The <?php echo $toolName; ?> detected that you have Wordfence installed. Wordfence may rate limit the <?php echo $toolName; ?> crawler and as a result of this behavior you might see lots of timeouts<?php if ($toolName == 'Link Checker'): ?> (status code 504) in the results<?php endif; ?>.</p>
				<p>To make the <?php echo $toolName; ?> work as expected, you can try to set the number of concurrent connections to 1 in the <a href="admin.php?page=<?php echo $settingsPageURL; ?>"><?php echo $toolName; ?> settings</a> and optionally increase or disable the rate limits in the <em>Rate Limiting</em> section in the <a href="admin.php?page=WordfenceOptions">Wordfence options</a>. But please keep in mind, that the Wordfence options apply for all crawlers and not just the <?php echo $toolName; ?>.</p>
				<p>Alternatively you can whitelist the <?php echo $toolName; ?> in the <a href="admin.php?page=WordfenceOptions">Wordfence options</a> with the option <em>Whitelisted IP addresses that bypass all rules</em>. However, general whitelisting isn't the best solution from a security point of view. It would be better to whitelist the <?php echo $toolName; ?> just for rate limiting, but Wordfence doesn't provide such an option at the time. The IP addresses of the <?php echo $toolName; ?> are:</p>
				<p>195.201.127.2</br>
2a01:4f8:1c1c:70c::1</p>
			</div>
		<?php endif;
	}
}
?>
