<?php
/*
 * @package    LinkChecker
 * @copyright  Copyright (C) 2015 - 2026 Marco Beierer. All rights reserved.
 * @license    https://www.gnu.org/licenses/gpl-3.0.html GNU/GPL
 */
defined('ABSPATH') or die('Restricted access.');

/*
Plugin Name: Link Checker Pro
Plugin URI: https://www.marcobeierer.com/tools/link-checker
Description: An easy to use Link Checker for WordPress to detect broken links and images on your website.
Version: 1.19.0
Author: Marco Beierer
Author URI: https://www.marcobeierer.com
License: GPL v3
Requires at least: 4.7
Tested up to: 7.0
Text Domain: link-checker
*/

add_action('admin_menu', 'register_link_checker_page');
function register_link_checker_page() {
	add_menu_page('Link Checker', 'Link Checker', 'manage_options', 'link-checker', 'link_checker_page', '', 132132002);
}

add_action('admin_menu', 'register_link_checker_submenu_pages');
function register_link_checker_submenu_pages() {
	add_submenu_page('link-checker', 'Link Checker Settings', 'Settings', 'manage_options', 'link-checker-settings-x', 'link_checker_settings_page'); // link-checker-settings-x because link-checker-settings is also used by Broken Link Checker plugin
}

add_action('admin_enqueue_scripts', 'load_link_checker_admin_scripts');
function load_link_checker_admin_scripts($hook) {
	if ($hook === 'toplevel_page_link-checker') {
		$linkcheckerURL = plugins_url('js/linkchecker-1.16.0.min.js', __FILE__);
		wp_enqueue_script('link_checker_linkcheckerjs', $linkcheckerURL, array('jquery'), '1.16.0', true);
		wp_add_inline_script('link_checker_linkcheckerjs', link_checker_jquery_compat_script(), 'before');
		wp_add_inline_script('link_checker_linkcheckerjs', "jQuery(document).ready(function() { riot.mount('*', { linkchecker: riot.observable() }); });");
		if (!link_checker_feedback_tab_enabled()) {
			wp_add_inline_script('link_checker_linkcheckerjs', link_checker_hide_feedback_tab_script());
		}

		$cssURL = plugins_url('css/wrapped.min.css', __FILE__);
		wp_enqueue_style('link_checker_wrappedcss', $cssURL, array(), '2');

		$customCSSURL = plugins_url('css/custom.css', __FILE__);
		wp_enqueue_style('link_checker_customcss', $customCSSURL, array(), '2');
		if (!link_checker_feedback_tab_enabled()) {
			wp_add_inline_style('link_checker_customcss', link_checker_hide_feedback_tab_style());
		}
	}
}

function link_checker_feedback_tab_enabled() {
	return (bool) apply_filters('link_checker_feedback_tab_enabled', false);
}

function link_checker_hide_feedback_tab_script() {
	return <<<'JS'
jQuery(document).ready(function($) {
	$('#linkchecker-widget #tabnav a[href^="#feedback"]').closest('li').remove();
	$('#linkchecker-widget .tab-pane[id^="feedback"]').remove();
});
JS;
}

function link_checker_hide_feedback_tab_style() {
	return <<<'CSS'
#linkchecker-widget #tabnav a[href^="#feedback"],
#linkchecker-widget .tab-pane[id^="feedback"] {
	display: none !important;
}

#linkchecker-widget #tabnav li:has(> a[href^="#feedback"]) {
	display: none !important;
}
CSS;
}

function link_checker_jquery_compat_script() {
	return <<<'JS'
(function($) {
	if (!$) {
		return;
	}

	// The bundled Bootstrap 3 and serializeObject code use aliases removed from newer jQuery releases.
	if (!$.isArray) {
		$.isArray = Array.isArray || function(value) {
			return Object.prototype.toString.call(value) === '[object Array]';
		};
	}

	if (!$.isFunction) {
		$.isFunction = function(value) {
			return typeof value === 'function';
		};
	}

	if (!$.proxy) {
		$.proxy = function(fn, context) {
			var args = Array.prototype.slice.call(arguments, 2);

			if (typeof context === 'string') {
				var methodName = context;
				context = fn;
				if (!context) {
					return undefined;
				}
				fn = context[methodName];
			}

			if (typeof fn !== 'function') {
				return undefined;
			}

			var proxy = function() {
				return fn.apply(context || this, args.concat(Array.prototype.slice.call(arguments)));
			};

			if ($.guid) {
				proxy.guid = fn.guid = fn.guid || $.guid++;
			}

			return proxy;
		};
	}
})(window.jQuery);
JS;
}

function link_checker_page() {
	include_once plugin_dir_path(__FILE__) . 'shared_functions.php'; ?>

	<div class="wrap" id="linkchecker-widget">
		<div class="bootstrap3">
			<h2>Link Checker</h2>

			<?php if ((string) get_option('link-checker-token', '') === ''): ?>
			<div class="notice notice-info below-h2">
				<p>You are using the free version of the Link Checker. It works for websites with up to 500 URLs and doesn't include Pro features such as image and video support, CSV export, and the scheduler. Learn more about <a href="https://www.marcobeierer.com/tools/link-checker/pro">Link Checker Pro</a>.</p>
			</div>
			<?php endif; ?>

			<?php
				$rootURL = trailingslashit(get_home_url());
				$websiteURLs = array();

				// deprecated function from WPML, which is also supported by Polylang 
				// used because pll_the_languages does not work in backend...
				if (function_exists('icl_get_languages')) { 
					$langs = icl_get_languages();
					if (is_array($langs)) {
						foreach ($langs as $lang) {
							if (!isset($lang['url']) || !is_scalar($lang['url'])) {
								continue;
							}

							$url = trailingslashit((string) $lang['url']);

							if ($url == $rootURL) {
								// home_url has no language suffix and can be used directly
								$websiteURLs = array($rootURL);
								break;
							}

							$websiteURLs[] = $url;
						}
					}

					if (count($websiteURLs) === 0) {
						$websiteURLs = array($rootURL);
					}
				} else {
					$websiteURLs = array($rootURL);
				}

				$devMode = '';
				if (isset($_GET['dev']) && !is_array($_GET['dev'])) {
					$devMode = sanitize_text_field(wp_unslash($_GET['dev']));
				}

				if ($devMode === '1') {
					$websiteURLs = array('https://www.marcobeierer.com/');
				} 
				else if ($devMode === '2') {
					$websiteURLs = array('https://www.marcobeierer.com/', 'https://www.marcobeierer.ch/');
				}
				else if ($devMode === '3') {
					$websiteURLs = array('https://www.aboutcms.de/');
				}
				else {
					localhostCheck(); // only if not in dev mode
				}

				wordfenceCheck('Link Checker', 'link-checker-settings-x');

				$editURLsEndpoint = add_query_arg(
					array(
						'action' => 'link_checker_edit_urls',
						'_ajax_nonce' => wp_create_nonce('link_checker_edit_urls'),
					),
					admin_url('admin-ajax.php')
				);
			?>

			<?php if (count($websiteURLs) > 1): ?>
				<ul class="nav nav-tabs" role="tablist" style="margin-bottom: 20px;">
				<?php $firstWebsite = true; ?>
				<?php foreach ($websiteURLs as $websiteURL): ?>
					<li role="presentation" class="<?php if ($firstWebsite) { echo 'active'; } ?>">
						<a href="#<?php echo md5($websiteURL); ?>" aria-controls="<?php echo md5($websiteURL); ?>" role="tab" data-toggle="tab"><?php echo esc_attr($websiteURL); ?></a>
					</li>
					<?php $firstWebsite = false; ?>
				<?php endforeach; ?>
				</ul>
			<?php endif; ?>

			<div class="tab-content">
				<?php
					$firstWebsite = true;
					$count = 0;
				?>
				<?php foreach ($websiteURLs as $websiteURL): ?>
					<div role="tabpanel" class="tab-pane <?php if ($firstWebsite) { echo 'active'; } ?>" id="<?php echo md5($websiteURL); ?>">
						<linkchecker
							id="<?php echo (int) $count; ?>"
							website-url="<?php echo esc_attr($websiteURL); ?>"
							token="<?php echo esc_attr(get_option('link-checker-token', '')); ?>"
							origin-system="wordpress"
							max-fetchers="<?php echo (int) get_option('link-checker-max-fetchers', 3); ?>"
							enable-scheduler="true"
							email="<?php echo esc_attr(get_option('admin_email')); ?>"
							edit-urls-endpoint="<?php echo esc_url($editURLsEndpoint); ?>"
							login-page-url="<?php echo esc_attr(get_option('link-checker-login-page-url', '')); ?>"
							login-form-selector="<?php echo esc_attr(get_option('link-checker-login-form-selector', '')); ?>"
							login-data="<?php echo esc_attr(get_option('link-checker-login-data', '')); ?>"
							<?php if (!link_checker_feedback_tab_enabled()): ?>hide-feedback-tab="true"<?php endif; ?>
						>
						</linkchecker>
					</div>
				<?php
					$firstWebsite = false;
					$count++;
				?>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
<?php
}

add_action('admin_init', 'register_link_checker_settings');

function register_link_checker_settings() {
	register_setting('link-checker-settings-group', 'link-checker-token', array(
		'type' => 'string',
		'sanitize_callback' => 'link_checker_sanitize_token',
		'default' => '',
	));
	register_setting('link-checker-settings-group', 'link-checker-max-fetchers', array(
		'type' => 'integer',
		'sanitize_callback' => 'link_checker_sanitize_max_fetchers',
		'default' => 3,
	));
	register_setting('link-checker-settings-group', 'link-checker-login-page-url', array(
		'type' => 'string',
		'sanitize_callback' => 'link_checker_sanitize_text_option',
		'default' => '',
	));
	register_setting('link-checker-settings-group', 'link-checker-login-form-selector', array(
		'type' => 'string',
		'sanitize_callback' => 'link_checker_sanitize_text_option',
		'default' => '',
	));
	register_setting('link-checker-settings-group', 'link-checker-login-data', array(
		'type' => 'string',
		'sanitize_callback' => 'link_checker_sanitize_text_option',
		'default' => '',
	));
}

function link_checker_sanitize_token($token) {
	if (!is_scalar($token)) {
		return '';
	}

	return preg_replace('/\s+/', '', sanitize_textarea_field((string) $token));
}

function link_checker_sanitize_max_fetchers($maxFetchers) {
	if (!is_scalar($maxFetchers)) {
		return 3;
	}

	$maxFetchers = absint($maxFetchers);

	if ($maxFetchers < 1) {
		return 1;
	}

	if ($maxFetchers > 10) {
		return 10;
	}

	return $maxFetchers;
}

function link_checker_sanitize_text_option($value) {
	if (!is_scalar($value)) {
		return '';
	}

	// Form-login values can contain percent-encoded query data; sanitize_text_field() strips those octets.
	$value = wp_check_invalid_utf8((string) $value);
	$value = wp_strip_all_tags($value);

	return trim(preg_replace('/[\r\n\t ]+/', ' ', $value));
}

function link_checker_settings_page() {
?>
	<div class="wrap">
		<h1>Link Checker Settings</h1>
		<form method="post" action="options.php">
			<?php settings_fields('link-checker-settings-group'); ?>
			<?php do_settings_sections('link-checker-settings-group'); ?>
			<div style="display: flex; flex-wrap: wrap; margin-left: -5px; margin-right: -5px;">
				<div class="card" style="margin: 5px;">
					<h2>General Settings</h2>
					<h3>Your Token</h3>
					<p><textarea name="link-checker-token" style="width: 100%; min-height: 350px;"><?php echo esc_textarea(get_option('link-checker-token', '')); ?></textarea></p>
					<p>The Link Checker allows you to check up to 500 internal and external links for free. If your website has more links, you can buy a token for <a href="https://www.marcobeierer.com/tools/link-checker/pro">Link Checker Pro</a> to check up to 50'000 links.</p>
					<p>Link Checker Pro also checks if you have broken embedded images on your site.</p>

					<h3>Concurrent Connections</h3>
					<p>
						<select name="link-checker-max-fetchers" style="width: 100%;">
						<?php for ($i = 1; $i <= 10; $i++) { ?>
							<option <?php selected((int) get_option('link-checker-max-fetchers', 3), $i); ?> value="<?php echo (int) $i; ?>"><?php echo (int) $i; ?></option>
						<?php } ?>
						</select>
					</p>
					<p>Number of the maximal concurrent connections. The default value is three concurrent connections, but some hosters do not allow three concurrent connections or an installed plugin may use that much resources on each request that the limitations of your hosting is reached with three concurrent connections. With this option you can limit the number of concurrent connections used to access your website and make the Link Checker work under these circumstances. You can also increase the number of concurrent connections if your server can handle it.</p>
					<?php submit_button(); ?>
				</div>
				<div class="card" style="margin: 5px;">
					<h2>Form Login Settings (Pro only)</h2>
					<p>The form login feature allows you to setup a form login that the Link Checker uses to login to your site. This for example allows the Link Checker to check a membership area.</p>
					<p>Please be very <strong>CAREFUL</strong> with this feature and always backup your site before using it because using this feature can lead to <strong>DATA LOSS</strong> if you make a mistake!</p>
					<p>It is highly recommended that you create and use a dedicated read-only account for the Link Checker. Read-only because the Link Checker simulates a click on every link on your website and if you for example have an <em>delete button</em>, the Link Checker clicks on it and may delete data if write access is given. A dedicated account is highly recommended because it is technically necessary to store the <strong>PASSWORD IN PLAINTEXT</strong>. You should thus not use this password anywhere else. If you use the scheduler, the provided password is also saved on the Link Checker server.</p>
					<p>If your login area contains very <strong>sensitive information</strong> that should be protected under all circumstances, you should <strong>not use this feature</strong> at all.</p>
					<p>Please read the instructions on my website carefully before using this feature:<br />
					<a target="_blank" href="https://www.marcobeierer.com/tools/link-checker/form-login-instructions">Form Login Instructions</a></p>

					<h3>Login Page URL</h3>
					<p><input type="text" name="link-checker-login-page-url" style="width: 100%" value="<?php echo esc_attr(get_option('link-checker-login-page-url', '')); ?>" /></p>
					<p>The URL of the login page. The URL can be absolute or relative to the website URL.</p>

					<h3>Form Selector</h3>
					<p><input type="text" name="link-checker-login-form-selector" style="width: 100%" value="<?php echo esc_attr(get_option('link-checker-login-form-selector', '')); ?>" /></p>
					<p>The DOM query selector to select the login form on the login page, for example <em>#loginform</em> or <em>.loginform</em>.</p>
					<p>See the instructions on my website for details. There is also an explanation about how to find the selector.</p>

					<h3>Data (Username and Password)</h3>
					<p><input type="text" name="link-checker-login-data" style="width: 100%" value="<?php echo esc_attr(get_option('link-checker-login-data', '')); ?>" /></p>
					<p>Provide all data necessary to login in the POST query format, for example <em>username=xyz&password=qwerty</em>. If you have special characters in your username or password, the values have to be percent encoded.</p>
					<p>See the instructions on my website for details about how to find this information.</p>

					<?php submit_button(); ?>
				</div>
			</div>
		</form>
	</div>
<?php
}

add_action('wp_ajax_link_checker_edit_urls', 'link_checker_edit_urls');
function link_checker_edit_urls() {
	if (!current_user_can('manage_options')) {
		wp_send_json_error(array('message' => 'Unauthorized.'), 403);
	}

	check_ajax_referer('link_checker_edit_urls');

	$editURLs = array();

	$urls = isset($_POST['urls']) ? wp_unslash($_POST['urls']) : array();
	if (!is_array($urls)) {
		wp_send_json($editURLs);
	}

	foreach ($urls as $url) {
		if (!is_scalar($url)) {
			continue;
		}

		$url = esc_url_raw($url);
		if ($url === '') {
			continue;
		}

		$postID = url_to_postid($url);
		if ($postID !== 0 && current_user_can('edit_post', $postID)) { // 0 means failure
			$editURL = get_edit_post_link($postID, 'raw');
			if ($editURL !== null) {
				$editURLs[$url] = $editURL;
			}
		}
	}

	wp_send_json($editURLs);
}
?>
