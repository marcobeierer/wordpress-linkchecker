<?php
/*
 * @package    LinkChecker
 * @copyright  Copyright (C) 2015 - 2016 Marco Beierer. All rights reserved.
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU/GPL
 */
defined('ABSPATH') or die('Restricted access.');

/*
Plugin Name: Link Checker
Plugin URI: https://www.marcobeierer.com/wordpress-plugins/link-checker
Description: An easy to use Link Checker for WordPress to detect broken links and images on your website.
Version: 1.4.0
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

				$templateFilepath = plugin_dir_path(__FILE__) . 'tmpl/table.html';
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

			<h3>Custom Status Codes</h3>
			<p>The Link Checker uses the following custom status codes:</p>
			<ul>
				<li>598 - Blocked by robots: The Link Checker was not able to access the page because the access was blocked by the robots exclusion protocol.</li>
				<li>599 - HTML parse error: The HTML code of this page could not be parsed because of an error in the code or because the page was larger than 50 MB.</li>
			</ul>
			<p><em>Please note that it is also possible that a website returns these status codes and if this is the case, they probably have another meaning.</em></p>
		</div>
	</div>
<?php
}

add_action('admin_enqueue_scripts', 'load_link_checker_admin_scripts');
function load_link_checker_admin_scripts($hook) {
	if ($hook == 'toplevel_page_link-checker' || $hook == 'link-checker_page_link-checker-scheduler') {
		$angularURL = plugins_url('js/angular.min.js', __FILE__);
		$linkcheckerURL = plugins_url('js/linkchecker.js?v=8', __FILE__);

		wp_enqueue_script('link_checker_angularjs', $angularURL);
		wp_enqueue_script('link_checker_linkcheckerjs', $linkcheckerURL);

		wp_localize_script('link_checker_linkcheckerjs', 'ajaxObject', array(
			'token' => get_option('link-checker-token'),
			'url' => get_home_url(),
			'email' => get_option('admin_email'),
			'service' => 'Link Checker',
		));
	}

	if ($hook == 'link-checker_page_link-checker-news') {
		wp_enqueue_script('jquery');
		wp_enqueue_script('link_checker_riot', 'https://static.marcobeierer.com/cdn/riot/riot+compiler-2.6.1.min.js');
	}
}

add_action('wp_ajax_link_checker_scheduler_proxy', 'link_checker_scheduler_proxy_callback');
function link_checker_scheduler_proxy_callback() {
	$body = array(
		'Service' => 'Link Checker',
		'URL' => get_home_url()
	);

	$url = 'https://api.marcobeierer.com/scheduler/v1/';
	linkCheckerProxy($url, 'GET', json_encode($body));
}

add_action('wp_ajax_link_checker_proxy', 'link_checker_proxy_callback');
function link_checker_proxy_callback() {
	$baseurl = get_home_url();
	$baseurl64 = strtr(base64_encode($baseurl), '+/', '-_');

	$url = 'https://api.marcobeierer.com/linkchecker/v1/' . $baseurl64 . '?origin_system=wordpress&max_fetchers=' . (int) get_option('link-checker-max-fetchers', 10);
	linkCheckerProxy($url, 'GET');
}

function linkCheckerProxy($url, $method, $body = false) {
	$ch = curl_init();

	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_HEADER, true);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
	if ($body) {
		curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
	}

	$token = get_option('link-checker-token');
	if ($token != '') {
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: BEARER ' . $token));
		header('X-Used-Token: 1');
	}

	$response = curl_exec($ch);

	if ($response === false) {
		$errorMessage = curl_error($ch);

		//$responseHeader = '';
		$responseBody = json_encode($errorMessage);

		$contentType = 'application/json';
		$statusCode = 504; // gateway timeout

		header('X-CURL-Error: 1');
	} else {
		$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

		//$responseHeader = substr($response, 0, $headerSize);
		$responseBody = substr($response, $headerSize);

		$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
		$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
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
	header('Cache-Control: no-store');

	echo $responseBody;
	wp_die();
}

add_action('admin_menu', 'register_link_checker_submenu_pages');
function register_link_checker_submenu_pages() {
	add_submenu_page('link-checker', 'Link Checker News', 'News', 'manage_options', 'link-checker-news', 'link_checker_news_page');
	add_submenu_page('link-checker', 'Link Checker Scheduler', 'Scheduler', 'manage_options', 'link-checker-scheduler', 'link_checker_scheduler_page');
	add_submenu_page('link-checker', 'Link Checker Settings', 'Settings', 'manage_options', 'link-checker-settings', 'link_checker_settings_page');
}

function link_checker_news_page() { 
?>
	<div id="linkchecker-news" class="wrap">
		<h2>Link Checker News</h2>

		<div class="card">
			<h3>Latest News on Twitter</h3>
			<p>I frequently tweet news and server status updates on Twitter. Follow me <a href="https://twitter.com/marcobeierer">@marcobeierer</a> if you like to stay up to date or want to discuss the news.</p>
			<p>Please find my latest tweets in the section below. The tweets are not exclusively about the Link Checker, but also my other projects.</p>
		</div>

		<div class="card">
			<twitter-timeline count="10"></twitter-timeline>
		</div>

		<div class="card">
			<h3>Privacy Information</h3>
			<p>The news are fetched from the Link Checker server operated by me. Your browser thus makes no requests directly to Twitter when you are visiting this page and thus no of your data (IP address, etc.) is transmitted to Twitter.</p>
		</div>
	</div>
	
	<script src="https://static.marcobeierer.com/riot-tags/raw/raw-1.0.0.tag" type="riot/tag"></script>
	<script src="https://static.marcobeierer.com/riot-tags/twitter/twitter-timeline-1.1.1.tag" type="riot/tag"></script>

	<script>
		riot.mount('*', {});
	</script>

	<style>
		#linkchecker-news ul > li {
			margin-bottom: 15px;
			padding-bottom: 15px;
			border-bottom: 1px solid #eee;
		}

		#linkchecker-news ul > li:last-child {
			margin-bottom: inherit;
			padding-bottom: inherit;
			border-bottom: 0;
		}

		#linkchecker-news ul > li span.datetime {
			display: block;
			font-weight: bold;
		}
	</style>
<?php
}

function link_checker_scheduler_page() {
	include_once('shared_functions.php'); ?>

	<div class="wrap" id="scheduler-widget" ng-app="schedulerApp" ng-strict-di>
		<div ng-controller="SchedulerController">
			<h2>Link Checker Scheduler</h2>
			<?php
				tokenCheck('Link Checker', 'link-checker');
			?>
			<div class="{{ messageClass }} below-h2" ng-show="message">
				<p ng-bind-html="message | sanitize"></p>
			</div>

			<div class="card">
				<h3>Description</h3>
				<p>The scheduler is an additional service for all users who have bought a token for the <a href="https://www.marcobeierer.com/wordpress-plugins/link-checker-professional">Link Checker Professional</a>.</p>
				<p>If you register your site to the scheduler, a link check is automatically triggered once a day and you receive an email notification with a summary report after the check has finished. If a dead link was found, you could use the default Link Checker interface to fetch the detailed results.</p>
			</div>
			
			<div class="card form-wrap" ng-show="!registered">
				<h3>Register your website</h3>
				<form>
					<input type="hidden" ng-model="data.Service" ng-init="data.Service = 'Link Checker'" />
					<input type="hidden" ng-model="data.IntervalInNs" ng-init="data.IntervalInNs = 86400000000000" />
					<div class="form-field form-required">
						<label>Website URL</label>
						<input ng-model="data.URL" type="text" readonly="readonly" />
					</div>
					<div class="form-field form-required">
						<label>Email address for notifications</label>
						<input type="email" ng-model="data.Email" />
					</div>
					<p class="submit">
						<button type="submit" ng-click="register()" class="button button-primary">Register</button>
					</p>
				</form>
			</div>
		
			<div class="card form-wrap" ng-show="registered">
				<h3>Deregister your website</h3>
				<form>
					<input type="hidden" ng-model="data.Service" ng-init="data.Service = 'Link Checker'" />
					<div class="form-field form-required">
						<label>Website URL</label>
						<input ng-model="data.URL" type="text" readonly="readonly" />
					</div>
					<p class="submit">
						<button type="submit" ng-click="deregister()" class="button button-primary">Deregister</button>
					</p>
				</form>
			</div>
		</div>
	</div>
<?php
}

add_action('admin_menu', 'register_link_checker_settings_page');
function register_link_checker_settings_page() {
	add_action('admin_init', 'register_link_checker_settings');
}

function register_link_checker_settings() {
	register_setting('link-checker-settings-group', 'link-checker-token');
	register_setting('link-checker-settings-group', 'link-checker-max-fetchers', 'intval');
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
				<h3>Concurrent Connections</h3>
				<p>
					<select name="link-checker-max-fetchers" style="width: 100%;">
					<?php for ($i = 1; $i <= 10; $i++) { ?>
						<option <?php if ((int) get_option('link-checker-max-fetchers', 10) === $i) { ?>selected<?php } ?> value="<?php echo $i; ?>"><?php echo $i; ?></option>
					<?php } ?>
					</select>
				</p>
				<p>Number of the maximal concurrent connections. The default value is ten concurrent connections, but some hosters do not allow ten concurrent connections or an installed plugin may use that much resources on each request that the limitations of your hosting is reached with ten concurrent connections. With this option you could limit the number of concurrent connections used to access your website and make the Link Checker work under these circumstances.</p>
				<?php submit_button(); ?>
			</form>
		</div>
	</div>
<?php
}

?>
