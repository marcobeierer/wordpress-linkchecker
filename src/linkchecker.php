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
Version: 1.16.0
Author: Marco Beierer
Author URI: https://www.marcobeierer.com
License: GPL v3
Text Domain: Marco Beierer
*/

add_action('admin_menu', 'register_link_checker_page');
function register_link_checker_page() {
	add_menu_page('Link Checker', 'Link Checker', 'manage_options', 'link-checker', 'link_checker_page', '', '132132002');
}

add_action('admin_menu', 'register_link_checker_submenu_pages');
function register_link_checker_submenu_pages() {
	add_submenu_page('link-checker', 'Link Checker News', 'News', 'manage_options', 'link-checker-news', 'link_checker_news_page');
	add_submenu_page('link-checker', 'Link Checker Scheduler', 'Scheduler', 'manage_options', 'link-checker-scheduler', 'link_checker_scheduler_page');
	add_submenu_page('link-checker', 'Link Checker Settings', 'Settings', 'manage_options', 'link-checker-settings-x', 'link_checker_settings_page'); // link-checker-settings-x because link-checker-settings is also used by Broken Link Checker plugin
}

add_action('admin_enqueue_scripts', 'load_link_checker_admin_scripts');
function load_link_checker_admin_scripts($hook) {
	if ($hook == 'toplevel_page_link-checker' || $hook == 'link-checker_page_link-checker-scheduler') {
		wp_enqueue_script('jquery');

		$linkcheckerURL = plugins_url('js/linkchecker-1.14.1.min.js', __FILE__);
		wp_enqueue_script('link_checker_linkcheckerjs', $linkcheckerURL);
		wp_add_inline_script('link_checker_linkcheckerjs', "jQuery(document).ready(function() { riot.mount('*', { linkchecker: riot.observable() }); });");

		$cssURL = plugins_url('css/wrapped.min.css?v=2', __FILE__); // TODO versionize file
		wp_enqueue_style('link_checker_wrappedcss', $cssURL);

		$customCSSURL = plugins_url('css/custom.css?v=2', __FILE__); // TODO versionize file
		wp_enqueue_style('link_checker_customcss', $customCSSURL);
	}

	// TODO remove this and replace with precompiled local tag
	if ($hook == 'link-checker_page_link-checker-news') {
		wp_enqueue_script('jquery');
		wp_enqueue_script('link_checker_riot', 'https://static.marcobeierer.com/cdn/riot/riot+compiler-2.6.1.min.js');
	}
}

function link_checker_page() {
	include_once('shared_functions.php'); ?>

	<div class="wrap" id="linkchecker-widget">
		<div class="bootstrap3">
			<h2>Link Checker</h2>

			<?php
				$rootURL = get_home_url();
				$websiteURLs = array();

				// add trailing slash if not there yet; necessary for compare with $lang['url']
				$rootURLLength = strlen($rootURL);
				if ($rootURL[$rootURLLength-1] != '/') {
					$rootURL .= '/';
				}

				// deprecated function from WPML, which is also supported by Polylang 
				// used because pll_the_languages does not work in backend...
				if (function_exists('icl_get_languages')) { 
					$langs = icl_get_languages();
					foreach ($langs as $code => $lang) {
						$url = $lang['url'];

						// add trailing slash if not there yet
						$urlLength = strlen($url);
						if ($url[$urlLength-1] != '/') {
							$url .= '/';
						}

						if ($url == $rootURL) {
							// home_url has no language suffix and can be used directly
							$websiteURLs = array($rootURL);
							break;
						}

						$websiteURLs[] = $url;
					}
				} else {
					$websiteURLs = array($rootURL);
				}

				$isdev = isset($_GET['dev']);
				if ($isdev && $_GET['dev'] == '1') {
					$websiteURLs = array('https://www.marcobeierer.com/');
				} 
				else if ($isdev && $_GET['dev'] == '2') {
					$websiteURLs = array('https://www.marcobeierer.com/', 'https://www.marcobeierer.ch/');
				}
				else {
					localhostCheck(); // only if not in dev mode
				}
			?>

			<?php if (defined('WORDFENCE_VERSION')): ?>
				<div class="notice notice-warning below-h2 is-dismissible">
					<p>The Link Checker detected that you have Wordfence installed. Wordfence may rate limit the Link Checker crawler and as a result of this behavior you might see lots of timeouts (status code 504) in the results.</p>
					<p>To make the Link Checker work as expected, you can try to set the number of concurrent connections to 1 in the <a href="admin.php?page=link-checker-settings-x">Link Checker settings</a> and optionally increase or disable the rate limits in the <em>Rate Limiting</em> section in the <a href="admin.php?page=WordfenceOptions">Wordfence options</a>. But please keep in mind, that the Wordfence options apply for all crawlers and not just the Link Checker.</p>
					<p>Alternatively you can whitelist the Link Checker in the <a href="admin.php?page=WordfenceOptions">Wordfence options</a> with the option <em>Whitelisted IP addresses that bypass all rules</em>. However, general whitelisting isn't the best solution from a security point of view. It would be better to whitelist the Link Checker just for rate limiting, but Wordfence doesn't provide such an option at the time. The IP addresses of the Link Checker are:</p>
					<p>195.201.127.2</br>
2a01:4f8:1c1c:70c::1</p>
				</div>
			<?php endif; ?>

			<?php if (count($websiteURLs) > 1): ?>
				<ul class="nav nav-tabs" role="tablist" style="margin-bottom: 20px;">
				<?php $firstWebsite = true; ?>
				<?php foreach ($websiteURLs as $websiteURL): ?>
					<li role="presentation" class="<?php if ($firstWebsite) { echo 'active'; } ?>">
						<a href="#<?php echo md5($websiteURL); ?>" aria-controls="<?php echo md5($websiteURL); ?>" role="tab" data-toggle="tab"><?php echo $websiteURL; ?></a>
					</li>
					<?php $firstWebsite = false; ?>
				<?php endforeach; ?>
				</ul>
			<?php endif; ?>

			<?php if (count($websiteURLs) > 1): ?>
				<div class="tab-content">
					<?php
						$firstWebsite = true;
						$count = 0;
					?>
					<?php foreach ($websiteURLs as $websiteURL): ?>
						<div role="tabpanel" class="tab-pane <?php if ($firstWebsite) { echo 'active'; } ?>" id="<?php echo md5($websiteURL); ?>">
							<linkchecker
								id="<?php echo $count; ?>"
								website-url="<?php echo $websiteURL; ?>"
								token="<?php echo get_option('link-checker-token'); ?>"
								origin-system="wordpress"
								max-fetchers="<?php echo (int) get_option('link-checker-max-fetchers', 3); ?>"
								enable-scheduler="true"
								email="<?php echo get_option('admin_email'); ?>"
							>
							</linkchecker>
						</div>
					<?php
						$firstWebsite = false;
						$count++;
					?>
					<?php endforeach; ?>
				</div>
			<?php else: ?>
				<linkchecker
					website-url="<?php echo $websiteURLs[0]; ?>"
					token="<?php echo get_option('link-checker-token'); ?>"
					origin-system="wordpress"
					max-fetchers="<?php echo (int) get_option('link-checker-max-fetchers', 3); ?>"
					enable-scheduler="true"
					email="<?php echo get_option('admin_email'); ?>"
					edit-urls-endpoint="admin-ajax.php?action=link_checker_edit_urls"
				>
				</linkchecker>
			<?php endif; ?>
		</div>
	</div>
<?php
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

	<div class="wrap" id="scheduler-widget">
		<div class="bootstrap3">
			<h2>Link Checker Scheduler</h2>
			<p>The scheduler was moved in version 1.12.0 to a tab in the main view of Link Checker.</p>

<!--
			<?php
				$url = get_home_url();
				$dev = isset($_GET['dev']);

				if ($dev) {
					$url = 'https://www.marcobeierer.com/';
				} 
				else {
					localhostCheck(); // only if not in dev mode
				}
			?>

			<linkchecker-scheduler
				website-url="<?php echo $url; ?>"
				token="<?php echo get_option('link-checker-token'); ?>"
				email="<?php echo get_option('admin_email'); ?>">
			</linkchecker-scheduler>
-->
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
						<option <?php if ((int) get_option('link-checker-max-fetchers', 3) === $i) { ?>selected<?php } ?> value="<?php echo $i; ?>"><?php echo $i; ?></option>
					<?php } ?>
					</select>
				</p>
				<p>Number of the maximal concurrent connections. The default value is three concurrent connections, but some hosters do not allow three concurrent connections or an installed plugin may use that much resources on each request that the limitations of your hosting is reached with three concurrent connections. With this option you can limit the number of concurrent connections used to access your website and make the Link Checker work under these circumstances. You can also increase the number of concurrent connections if your server can handle it.</p>
				<?php submit_button(); ?>
			</form>
		</div>
	</div>
<?php
}

add_action('wp_ajax_link_checker_edit_urls', 'link_checker_edit_urls');
function link_checker_edit_urls() {
	$editURLs = array();

	$urls = $_POST['urls'];

	foreach ($urls as $url) {
		$postID = url_to_postid($url);
		if ($postID != 0) { // 0 means failure
			$editURLs[$url] = admin_url('post.php?post=' . $postID . '&action=edit'); // just save $url values are added because url_to_postid would return 0 if not a valid url
		}
	}

	echo json_encode($editURLs);
	wp_die();
}
?>
