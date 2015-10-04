<?php
/*
 * @package    LinkChecker
 * @copyright  Copyright (C) 2015 Marco Beierer. All rights reserved.
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU/GPL
 */
defined('ABSPATH') or die('Restricted access.');

/*
Plugin Name: Link Checker
Plugin URI: https://www.marcobeierer.com/wordpress-plugins/link-checker
Description: An easy to use Link Checker for WordPress to detect broken links and images on your website.
Version: 1.1.1
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
	include_once('shared_functions.php'); ?>

	<div class="wrap" id="linkchecker-widget" ng-app="linkCheckerApp" ng-strict-di>
		<div ng-controller="LinkCheckerController">
			<form name="linkCheckerForm">
				<h2>Link Checker <button type="submit" class="add-new-h2" ng-click="check()" ng-disabled="checkDisabled">Check your website</button></h2>
			</form>

			<?php
				cURLCheck();
				localhostCheck();
			?>

			<h3>Check your website for broken internal and external links.</h3>
			<p ng-bind-html="message | sanitize"></p>

			<table>
				<tr>
					<td>Number of crawled HTML pages on your site:</td>
					<td>{{ urlsCrawledCount }}</td>
				</tr>
				<tr>
					<td>Number of checked internal and external resources:</td>
					<td>{{ checkedLinksCount }}</td>
				</tr>
			</table>

			<h3>Broken Links</h3>
			<?php
				include_once('template.php');

				$templateFilepath = plugins_url('tmpl/table.html', __FILE__);
				$template = new MarcoBeierer\Template($templateFilepath);

				$template->setVar('th-col1', 'URL where the broken links were found');
				$template->setVar('th-col2', 'Broken Links');
				$template->setVar('th-col3', 'Status Code');
				$template->setVar('list', 'links');

				$template->render();
			?>

			<?php
				$token = get_option('link-checker-token');
				if ($token != ''): 
			?>
			<h3>Broken Images</h3>
			<?php
				$template = new MarcoBeierer\Template($templateFilepath);

				$template->setVar('th-col1', 'URL where the broken images were found');
				$template->setVar('th-col2', 'Broken Images');
				$template->setVar('th-col3', 'Status Code');
				$template->setVar('list', 'urlsWithDeadImages');

				$template->render();

				endif; 
			?>
		</div>
	</div>
<?
}

add_action('admin_enqueue_scripts', 'load_link_checker_admin_scripts');
function load_link_checker_admin_scripts($hook) {

	if ($hook == 'toplevel_page_link-checker') {

		$angularURL = plugins_url('js/angular.min.js', __FILE__);
		$linkcheckerURL = plugins_url('js/linkchecker.js?v=6', __FILE__);

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

	$token = get_option('link-checker-token');
	if ($token != '') {
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: BEARER ' . $token));
		header('X-Used-Token: 1');
	}

	$response = curl_exec($ch);

	$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

	if ($statusCode == 0) {
		$statusCode = 503; // Service unavailable
	}

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
				<p>The Link Checker allows you to check up to 500 internal and external links for free. If your website has more links, you can buy a token for the <a href="https://www.marcobeierer.com/wordpress-plugins/link-checker-professional">Link Checker Professional</a> to check up to 50'000 links.</p>
				<p>The professional version also checks if you have broken embedded images on your site.</p>
				<?php submit_button(); ?>
			</form>
		</div>
	</div>
<?php
}
?>
