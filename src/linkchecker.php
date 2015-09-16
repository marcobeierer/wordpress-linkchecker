<?php
/*
 * @package    LinkChecker
 * @copyright  Copyright (C) 2015 Marco Beierer. All rights reserved.
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU/GPL
 */

/*
Plugin Name: Link Checker
Plugin URI: https://www.marcobeierer.com/wordpress-plugins/link-checker
Description: An easy to use Link Checker for WordPress to detect broken internal and external links on your website.
Version: 1.0.0-beta.3
Author: Marco Beierer
Author URI: https://www.marcobeierer.com
License: GPL v3
Text Domain: Marco Beierer
*/

add_action('admin_menu', 'register_link_checker_page');
function register_link_checker_page() {
	add_menu_page('Link Checker', 'Link Checker', 'manage_options', 'link-checker', 'link_checker_page', '', '132132002');
}

function link_checker_page() {
?>
	<div class="wrap" id="linkchecker-widget" ng-app="linkCheckerApp" ng-strict-di>
		<div ng-controller="LinkCheckerController">
			<form name="linkCheckerForm">
				<h2>Link Checker <button type="submit" class="add-new-h2" ng-click="check()" ng-disabled="checkDisabled">Check your website</button></h2>
			</form>
			<h3>Check your website for broken internal and external links.</h3>
			<p>{{ message }} <span ng-if="urlsCrawledCount > 0">{{ urlsCrawledCount }} URLs already checked.</span> <span ng-if="limitReached">The URL limit was reached. The crawler has not checked your complete website.</span></p>

			<table class="wp-list-table widefat fixed striped posts">
				<thead>
					<tr>
						<th style="width: 35%;">URL where the broken link was found</th>
						<th>Broken URL</th>
						<th style="width: 6em;">Status Code</th>
					</tr>
				</thead>
				<tbody>
					<tr ng-if="!links">
						<td>No broken links found yet.</td>
						<td></td>
						<td></td>
					</tr>
					<tr ng-repeat="(foundOnURL, deadLinks) in links">
						<td><a href="{{ foundOnURL }}">{{ foundOnURL }}</a></td>
						<td colspan="2">
							<table class="wp-list-table widefat fixed">
								<tr ng-repeat="deadLink in deadLinks">
									<td>{{ deadLink.URL }}</td>
									<td style="width: 5em;">{{ deadLink.StatusCode }}</td>
								</tr>
							</table>
						</td>
					</tr>
				</tbody>
				<tfoot>
					<tr>
						<th>URL where the broken link was found</th>
						<th>Broken URL</th>
						<th>Status Code</th>
					</tr>
				</tfoot>
			</table>
		</div>
	</div>
<?
}

add_action('admin_enqueue_scripts', 'load_link_checker_admin_scripts');
function load_link_checker_admin_scripts($hook) {

	if ($hook == 'toplevel_page_link-checker') {

		$angularURL = plugins_url('js/angular.min.js', __FILE__);
		$linkcheckerURL = plugins_url('js/linkchecker.js?v=1', __FILE__);

		wp_enqueue_script('link_checker_angularjs', $angularURL);
		wp_enqueue_script('link_checker_linkcheckerjs', $linkcheckerURL);
	}
}

add_action('wp_ajax_link_checker_proxy', 'link_checker_proxy_callback');
function link_checker_proxy_callback() {

	$baseurl = get_site_url();
	$baseurl64 = strtr(base64_encode($baseurl), '+/', '-_');

	$ch = curl_init();

	curl_setopt($ch, CURLOPT_URL, 'https://api.marcobeierer.com/linkchecker/v1/' . $baseurl64 . '?origin_system=wordpress');
	curl_setopt($ch, CURLOPT_HEADER, 0);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

	$response = curl_exec($ch);

	$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

	curl_close($ch);

	if (function_exists('http_response_code')) {
		http_response_code($statusCode);
	}
	else { // fix for PHP version older than 5.4.0
		$protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
		header($protocol . ' ' . $statusCode . ' ');
	}

	header("Content-Type: $contentType");

	echo $response;
	wp_die();
}

add_action('admin_menu', 'register_link_checker_settings_page');
function register_link_checker_settings_page() {
	add_submenu_page('link-checker', 'Link Checker Settings', 'Settings', 'manage_options', 'link-checker-settings', 'link_checker_settings_page');
	add_action('admin_init', 'register_link_checker_settings');
}

function register_link_checker_settings() {
	register_setting('link-checker-settings-group', 'link-checker-token');
}

function link_checker_settings_page() {
?>
	<div class="wrap">
		<h2>Link Checker Settings</h2>
		<div class="card">
			<form method="post" action="options.php">
				<?php settings_fields('link-checker-settings-group'); ?>
				<?php do_settings_sections('link-checker-settings-group'); ?>
				<h3>Your Token</h3>
				<p><textarea name="link-checker-token" style="width: 100%; min-height: 350px;"><?php echo esc_attr(get_option('link-checker-token')); ?></textarea></p>
				<p>The Link Checker allows you to check up to 500 internal and external links for free. If your website has more links, you can buy a token for the <a href="https://www.marcobeierer.com/wordpress-plugins/link-checker-professional">Link Checker Professional</a> to check up to 50000 links.</p>
				<?php submit_button(); ?>
			</form>
		</div>
	</div>
<?php
}
?>
